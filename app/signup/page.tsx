"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ArrowLeft,
  Eye,
  EyeOff,
  ChefHat,
  Dumbbell,
  Shield,
  CheckCircle2,
  Store,
  Tag,
  ShieldAlert,
  Sparkles,
  Utensils,
  Flame,
  Check,
} from "lucide-react";
import { PublicHeader } from "@/components/customer/public-header";

function sanitizeCallbackUrl(url: string | null, fallback: string): string {
  if (!url) return fallback;
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\") || url.includes("://")) {
    return fallback;
  }
  return url;
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const portalParam = searchParams.get("portal")?.toLowerCase() || null;
  const rawStaff = searchParams.get("staff") === "true";
  const rawCallbackUrl = searchParams.get("callbackUrl");
  const refParam = searchParams.get("ref")?.toUpperCase().trim() || "";
  const inviteTokenParam =
    searchParams.get("token") ||
    searchParams.get("invite") ||
    searchParams.get("key") ||
    searchParams.get("code") ||
    "";

  const isStaff =
    rawStaff ||
    portalParam === "admin" ||
    portalParam === "kitchen" ||
    portalParam === "trainer" ||
    rawCallbackUrl?.startsWith("/admin") ||
    rawCallbackUrl?.startsWith("/kitchen") ||
    rawCallbackUrl?.startsWith("/trainer");

  const targetPortal =
    portalParam ||
    (rawCallbackUrl?.startsWith("/admin")
      ? "admin"
      : rawCallbackUrl?.startsWith("/kitchen")
      ? "kitchen"
      : rawCallbackUrl?.startsWith("/trainer")
      ? "trainer"
      : null);

  const defaultDestination =
    targetPortal === "admin"
      ? "/admin"
      : targetPortal === "kitchen"
      ? "/kitchen"
      : targetPortal === "trainer"
      ? "/trainer"
      : "/home";

  const callbackUrl = sanitizeCallbackUrl(rawCallbackUrl, defaultDestination);

  const { status } = useSession();

  // Form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteCode, setInviteCode] = useState(inviteTokenParam);
  const [referralCode, setReferralCode] = useState(refParam);
  const [outletId, setOutletId] = useState("");

  useEffect(() => {
    if (inviteTokenParam) {
      setInviteCode(inviteTokenParam);
    }
  }, [inviteTokenParam]);

  useEffect(() => {
    if (refParam) {
      setReferralCode(refParam);
    }
  }, [refParam]);

  // Outlets for kitchen signup
  const [availableOutlets, setAvailableOutlets] = useState<
    Array<{ id: string; name: string; gymName: string }>
  >([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available outlets for Kitchen staff registration
  useEffect(() => {
    if (targetPortal === "kitchen") {
      fetch("/api/gyms")
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.gyms)) {
            const flattened: Array<{ id: string; name: string; gymName: string }> = [];
            data.gyms.forEach((gym: any) => {
              if (gym.outlets && Array.isArray(gym.outlets)) {
                gym.outlets.forEach((o: any) => {
                  flattened.push({
                    id: o.id,
                    name: o.name,
                    gymName: gym.name,
                  });
                });
              }
            });
            setAvailableOutlets(flattened);
            if (flattened.length > 0) {
              setOutletId((prev) => prev || flattened[0].id);
            }
          }
        })
        .catch((err) => {
          console.error("Failed to load outlets for kitchen registration", err);
        });
    }
  }, [targetPortal]);

  // Redirect if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      router.push(callbackUrl);
    }
  }, [status, callbackUrl, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (targetPortal === "kitchen" && !outletId) {
        throw new Error("Please select an assigned kitchen outlet.");
      }

      if (targetPortal === "admin" && (!inviteCode || !inviteCode.trim())) {
        throw new Error(
          "Super Admin registration requires an authorized administrator invitation link. Public registration is restricted."
        );
      }

      // 1. Submit registration to backend
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : undefined,
          password,
          portal: targetPortal,
          accessCode: (targetPortal === "kitchen" || targetPortal === "trainer") ? undefined : inviteCode.trim(),
          inviteCode: (targetPortal === "kitchen" || targetPortal === "trainer") ? undefined : inviteCode.trim(),
          outletId: outletId || undefined,
          referralCode: referralCode.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create account");
      }

      // 2. Automatically sign in with NextAuth credentials provider
      const signRes = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });

      if (signRes?.ok) {
        router.refresh();
        router.push(callbackUrl);
      } else {
        // Fallback: Navigate to login with pre-populated credentials
        router.push(
          `/login?portal=${targetPortal || ""}&callbackUrl=${encodeURIComponent(
            callbackUrl
          )}&staff=${isStaff ? "true" : "false"}`
        );
      }
    } catch (err: any) {
      const msg = err?.message || "";
      // Defensively sanitize error messages to never display internal database or Prisma details to customers
      if (
        msg.toLowerCase().includes("prisma") ||
        msg.toLowerCase().includes("neon.tech") ||
        msg.toLowerCase().includes("database server") ||
        msg.toLowerCase().includes("findunique")
      ) {
        setError("We're temporarily unable to process your request. Please try again shortly.");
      } else {
        setError(msg || "We're temporarily unable to process your request. Please try again shortly.");
      }
    } finally {
      setLoading(false);
    }
  };

  const portalBadge = {
    admin: {
      label: "Super Admin Operations",
      icon: Shield,
      color: "text-rose-700 bg-rose-50 border-rose-200",
      title: "Super Admin Registration",
      subtitle: inviteCode
        ? "Authorized administrator onboarding via verified invitation link."
        : "Restricted administrative onboarding. Authorized invitation required.",
      codeLabel: "",
      codePlaceholder: "",
      codeHint: "",
      requiresCode: false,
    },
    kitchen: {
      label: "Kitchen Display Kiosk",
      icon: ChefHat,
      color: "text-amber-800 bg-amber-50 border-amber-200",
      title: "Kitchen Staff Registration",
      subtitle: "Kiosk operator registration for real-time kitchen order fulfillment.",
      codeLabel: "Kitchen Access Code",
      codePlaceholder: "",
      codeHint: "",
      requiresCode: false,
    },
    trainer: {
      label: "Trainer Partner Portal",
      icon: Dumbbell,
      color: "text-indigo-700 bg-indigo-50 border-indigo-200",
      title: "Trainer Partner Registration",
      subtitle: "Join the partner network to refer gym clients and earn commissions.",
      codeLabel: "Partner Invitation Passcode",
      codePlaceholder: "",
      codeHint: "",
      requiresCode: false,
    },
  }[targetPortal || ""];

  const loginLink = isStaff
    ? `/login?portal=${targetPortal || ""}&callbackUrl=${encodeURIComponent(
        callbackUrl
      )}&staff=true`
    : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Back to NutriFlexs breadcrumb */}
      <div className="mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-nutri-secondary hover:text-nutri-green transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to NutriFlexs
        </Link>
      </div>

      {/* Two-Column Card Container */}
      <div className="bg-white rounded-3xl border border-nutri-border shadow-float overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* LEFT COLUMN: Editorial Brand Panel (5 cols on lg) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-nutri-green/10 via-nutri-bg to-nutri-green-soft p-6 sm:p-8 lg:p-10 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-nutri-border-light relative overflow-hidden">
          {/* Subtle Decorative Background Blob */}
          <div className="absolute -top-16 -left-16 w-48 h-48 rounded-full bg-nutri-green/10 blur-2xl pointer-events-none" />
          <div className="absolute -bottom-16 -right-16 w-48 h-48 rounded-full bg-nutri-green-fresh/10 blur-2xl pointer-events-none" />

          {/* Top Brand Presentation */}
          <div className="relative z-10 space-y-4">
            <div className="flex items-center justify-between">
              <NutriFlexsLogo size="md" showTagline={true} />
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-nutri-green bg-nutri-green-light px-2.5 py-1 rounded-full border border-nutri-green/20">
                <Sparkles className="w-3 h-3 fill-nutri-green" /> ONE PLATFORM
              </span>
            </div>

            <div className="space-y-2 pt-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight leading-tight">
                Your Healthier Journey Starts Here.
              </h2>
              <p className="text-xs sm:text-sm text-nutri-muted leading-relaxed">
                Discover healthy food, track every meal and make smarter nutrition choices with NutriFlexs. Two essential modes, one unified account.
              </p>
            </div>
          </div>

          {/* Middle Visual & Experience Highlights */}
          <div className="relative z-10 my-4 lg:my-6 space-y-3.5">
            {/* Featured Photography Card (visible on sm screens and up) */}
            <div className="hidden sm:block relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-xs border border-white/80 bg-nutri-bg">
              <Image
                src="/images/products/grilled-chicken-quinoa-bowl.webp"
                alt="NutriFlexs Clean Post-Workout Bowl"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 400px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 text-white flex items-center justify-between">
                <span className="text-[11px] font-bold">Post-Workout Recovery</span>
                <span className="text-[10px] font-extrabold bg-nutri-green text-white px-2 py-0.5 rounded-full shadow-xs">
                  5-Min Pickup
                </span>
              </div>
            </div>

            {/* Two Primary Experience Highlights (compact on mobile, stacked on lg) */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-2.5">
              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/80 backdrop-blur-xs border border-white/80 shadow-2xs flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0">
                  <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-nutri-charcoal truncate">Order Food</h4>
                  <p className="text-[10px] sm:text-[11px] text-nutri-secondary leading-tight mt-0.5 hidden xs:block sm:block truncate">
                    Fresh meals &amp; juices in 5 mins.
                  </p>
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-2xl bg-white/80 backdrop-blur-xs border border-white/80 shadow-2xs flex items-center gap-2.5 sm:gap-3">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0">
                  <Flame className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-xs text-nutri-charcoal truncate">Track Nutrition</h4>
                  <p className="text-[10px] sm:text-[11px] text-nutri-secondary leading-tight mt-0.5 hidden xs:block sm:block truncate">
                    Smart Indian food diary &amp; macros.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Trust Indicators (hidden on mobile, visible on sm and up) */}
          <div className="hidden sm:flex relative z-10 pt-3 border-t border-nutri-border/60 items-center justify-between text-[11px] font-semibold text-nutri-secondary">
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-nutri-green" /> 5-Min Pickup
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-nutri-green" /> 100% Clean Food
            </span>
            <span className="flex items-center gap-1">
              <Check className="w-3.5 h-3.5 text-nutri-green" /> Smart Indian Macros
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Clean, Well-Organized Form (7 cols on lg) */}
        <div className="lg:col-span-7 p-6 sm:p-8 lg:p-10 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto space-y-5">
            {/* Header Titles */}
            <div className="space-y-1.5">
              {portalBadge && (
                <div className="pb-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${portalBadge.color}`}
                  >
                    <portalBadge.icon className="w-3.5 h-3.5" />
                    {portalBadge.label}
                  </span>
                </div>
              )}

              {targetPortal === "admin" && (
                <div className="pb-1">
                  {inviteCode ? (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-nutri-green bg-nutri-green-light px-3 py-0.5 rounded-full border border-nutri-green/20">
                      <CheckCircle2 className="w-3.5 h-3.5 text-nutri-green" />
                      Invitation Token Linked
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 px-3 py-0.5 rounded-full border border-amber-200">
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-700" />
                      Authorized Invitation Required
                    </span>
                  )}
                </div>
              )}

              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-nutri-charcoal tracking-tight">
                {portalBadge ? portalBadge.title : "Create Your Account"}
              </h1>

              <p className="text-xs sm:text-sm text-nutri-secondary leading-relaxed">
                {portalBadge
                  ? portalBadge.subtitle
                  : "One account for healthy food ordering and smarter nutrition tracking."}
              </p>
            </div>

            {/* Error Alert Banner */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-fade-in">
                <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <span className="font-semibold leading-snug">{error}</span>
              </div>
            )}

            {/* Registration Form */}
            <form onSubmit={handleSignup} className="space-y-3.5">
              {/* Full Name */}
              <div>
                <label
                  htmlFor="reg-name"
                  className="block text-xs font-bold text-nutri-charcoal mb-1"
                >
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder={
                      targetPortal === "kitchen"
                        ? "Kitchen Operator Name"
                        : targetPortal === "trainer"
                        ? "Trainer / Coach Name"
                        : targetPortal === "admin"
                        ? "Administrator Name"
                        : "e.g., Ashutosh Sharma"
                    }
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 sm:h-12 w-full text-xs sm:text-sm pl-10 pr-3.5 bg-nutri-bg/40 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white focus:ring-2 focus:ring-nutri-green/15 text-nutri-charcoal font-medium transition-all"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label
                  htmlFor="reg-email"
                  className="block text-xs font-bold text-nutri-charcoal mb-1"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={
                      targetPortal === "kitchen"
                        ? "kitchen.operator@nutriflexs.com"
                        : targetPortal === "trainer"
                        ? "trainer@partner.com"
                        : targetPortal === "admin"
                        ? "admin.ops@nutriflexs.com"
                        : "you@example.com"
                    }
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 sm:h-12 w-full text-xs sm:text-sm pl-10 pr-3.5 bg-nutri-bg/40 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white focus:ring-2 focus:ring-nutri-green/15 text-nutri-charcoal font-medium transition-all"
                  />
                </div>
              </div>

              {/* Phone Number (Customer or Trainer) */}
              {(!targetPortal || targetPortal === "trainer") && (
                <div>
                  <label
                    htmlFor="reg-phone"
                    className="block text-xs font-bold text-nutri-charcoal mb-1"
                  >
                    Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-phone"
                      type="tel"
                      placeholder="+91 99999 88888"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="h-11 sm:h-12 w-full text-xs sm:text-sm pl-10 pr-3.5 bg-nutri-bg/40 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white focus:ring-2 focus:ring-nutri-green/15 text-nutri-charcoal font-medium transition-all"
                    />
                  </div>
                </div>
              )}

              {/* Kitchen Outlet Selector */}
              {targetPortal === "kitchen" && (
                <div>
                  <label
                    htmlFor="reg-outlet"
                    className="block text-xs font-bold text-nutri-charcoal mb-1"
                  >
                    Assigned Kitchen Outlet <span className="text-rose-600 font-extrabold">*</span>
                  </label>
                  <div className="relative">
                    <Store className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <select
                      id="reg-outlet"
                      required
                      value={outletId}
                      onChange={(e) => setOutletId(e.target.value)}
                      className="h-11 sm:h-12 w-full text-xs sm:text-sm pl-10 pr-3.5 bg-nutri-bg/40 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white focus:ring-2 focus:ring-nutri-green/15 text-nutri-charcoal font-medium transition-all cursor-pointer"
                    >
                      {availableOutlets.length > 0 ? (
                        availableOutlets.map((outlet) => (
                          <option key={outlet.id} value={outlet.id}>
                            {outlet.name} ({outlet.gymName})
                          </option>
                        ))
                      ) : (
                        <option value="" disabled>
                          Loading active kitchen outlets...
                        </option>
                      )}
                    </select>
                  </div>
                  <p className="text-[10px] text-nutri-secondary mt-1">
                    Select the physical express kiosk outlet you are operating.
                  </p>
                </div>
              )}

              {/* Trainer Custom Referral Handle */}
              {targetPortal === "trainer" && (
                <div>
                  <label
                    htmlFor="reg-ref"
                    className="block text-xs font-bold text-nutri-charcoal mb-1"
                  >
                    Custom Referral Code (Optional)
                  </label>
                  <div className="relative">
                    <Tag className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="reg-ref"
                      type="text"
                      placeholder="e.g., NUTRI-VIKRAM"
                      value={referralCode}
                      onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                      className="h-11 sm:h-12 w-full text-xs sm:text-sm pl-10 pr-3.5 bg-nutri-bg/40 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white focus:ring-2 focus:ring-nutri-green/15 text-nutri-charcoal font-medium transition-all uppercase"
                    />
                  </div>
                  <p className="text-[10px] text-nutri-secondary mt-1">
                    Clients use this code for discounts. Automatically generated if left blank.
                  </p>
                </div>
              )}

              {/* Customer Trainer Referral Attribution Banner */}
              {targetPortal === "customer" && refParam && (
                <div className="p-3 rounded-xl bg-nutri-green-light/70 border border-nutri-green/25 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="w-4 h-4 text-nutri-green shrink-0" />
                    <div className="text-xs text-nutri-charcoal">
                      <span className="font-bold">Trainer Referral Applied: </span>
                      <span className="font-mono font-extrabold text-nutri-green">{referralCode}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-extrabold bg-nutri-green text-white px-2 py-0.5 rounded-full shrink-0">
                    10% OFF
                  </span>
                </div>
              )}

              {/* Password */}
              <div>
                <label
                  htmlFor="reg-password"
                  className="block text-xs font-bold text-nutri-charcoal mb-1"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-11 sm:h-12 w-full text-xs sm:text-sm pl-10 pr-10 bg-nutri-bg/40 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white focus:ring-2 focus:ring-nutri-green/15 text-nutri-charcoal font-medium transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-nutri-secondary hover:text-nutri-charcoal transition-colors cursor-pointer"
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-nutri-secondary mt-1">
                  Must be at least 6 characters long.
                </p>
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                isLoading={loading}
                size="lg"
                className="h-12 w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-sm rounded-full cursor-pointer shadow-md shadow-nutri-green/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
              >
                {targetPortal === "admin"
                  ? "REGISTER SUPER ADMIN"
                  : targetPortal === "kitchen"
                  ? "REGISTER KITCHEN OPERATOR"
                  : targetPortal === "trainer"
                  ? "REGISTER TRAINER PARTNER"
                  : "CREATE ACCOUNT"}
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Button>
            </form>

            {/* Navigation to Login */}
            <div className="pt-3 border-t border-nutri-border-light text-center">
              <p className="text-xs text-nutri-secondary">
                Already have an account?{" "}
                <Link
                  href={loginLink}
                  className="font-bold text-nutri-green hover:underline cursor-pointer"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-nutri-bg selection:bg-nutri-green-light selection:text-nutri-green">
      <PublicHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Suspense
          fallback={
            <div className="text-xs font-bold text-nutri-green p-8 animate-pulse">
              Loading NutriFlexs Registration...
            </div>
          }
        >
          <SignupForm />
        </Suspense>
      </main>
    </div>
  );
}
