"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  KeyRound,
  Store,
  Tag,
  ShieldAlert,
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
  const [inviteCode, setInviteCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [referralCode, setReferralCode] = useState("");
  const [outletId, setOutletId] = useState("");

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
          accessCode: inviteCode.trim(),
          inviteCode: inviteCode.trim(),
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
      setError(err.message || "An unexpected error occurred during registration");
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
      subtitle: "Restricted administrative onboarding. Valid invitation key required.",
      codeLabel: "Administrator Invitation Key",
      codePlaceholder: "e.g., NF-TEST-ADMIN-2026",
      codeHint: "Confidential master administrative invite key",
    },
    kitchen: {
      label: "Kitchen Display Kiosk",
      icon: ChefHat,
      color: "text-amber-800 bg-amber-50 border-amber-200",
      title: "Kitchen Staff Registration",
      subtitle: "Kiosk operator registration for real-time kitchen order fulfillment.",
      codeLabel: "Kitchen Access Code",
      codePlaceholder: "e.g., NF-TEST-KITCHEN-2026",
      codeHint: "Authorized outlet security access code",
    },
    trainer: {
      label: "Trainer Partner Portal",
      icon: Dumbbell,
      color: "text-indigo-700 bg-indigo-50 border-indigo-200",
      title: "Trainer Partner Registration",
      subtitle: "Join the partner network to refer gym clients and earn commissions.",
      codeLabel: "Partner Invitation Passcode",
      codePlaceholder: "e.g., NF-TEST-TRAINER-2026",
      codeHint: "NutriFlexs gym partner invitation passcode",
    },
  }[targetPortal || ""];

  const loginLink = isStaff
    ? `/login?portal=${targetPortal || ""}&callbackUrl=${encodeURIComponent(
        callbackUrl
      )}&staff=true`
    : `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;

  return (
    <div className="w-full max-w-md space-y-5">
      {/* Back to NutriFlexs link */}
      <div>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-nutri-secondary hover:text-nutri-green transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to NutriFlexs
        </Link>
      </div>

      <Card className="p-6 sm:p-8 bg-white border border-nutri-border rounded-3xl shadow-sm space-y-6">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <NutriFlexsLogo size="md" showTagline={true} />
          </div>

          {portalBadge && (
            <div className="pt-2 flex justify-center">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${portalBadge.color}`}
              >
                <portalBadge.icon className="w-3.5 h-3.5" />
                {portalBadge.label}
              </span>
            </div>
          )}

          <h1 className="text-xl sm:text-2xl font-bold font-heading text-nutri-charcoal pt-1">
            {portalBadge ? portalBadge.title : "Create Customer Account"}
          </h1>

          <p className="text-xs text-nutri-secondary max-w-xs mx-auto leading-relaxed">
            {portalBadge
              ? portalBadge.subtitle
              : "Get 10% off your first post-workout refuel pack"}
          </p>
        </div>

        {/* Error Alert Banner */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
            <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <span className="font-semibold leading-snug">{error}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          {/* Full Name */}
          <div>
            <label
              htmlFor="reg-name"
              className="block text-xs font-bold text-nutri-charcoal mb-1.5"
            >
              Full Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3.5 pointer-events-none" />
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
                className="w-full text-xs pl-10 pr-3.5 py-3 bg-nutri-bg/50 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white text-nutri-charcoal font-medium transition-colors"
              />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label
              htmlFor="reg-email"
              className="block text-xs font-bold text-nutri-charcoal mb-1.5"
            >
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3.5 pointer-events-none" />
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
                className="w-full text-xs pl-10 pr-3.5 py-3 bg-nutri-bg/50 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white text-nutri-charcoal font-medium transition-colors"
              />
            </div>
          </div>

          {/* Phone Number (Trainer or Customer) */}
          {(!targetPortal || targetPortal === "trainer") && (
            <div>
              <label
                htmlFor="reg-phone"
                className="block text-xs font-bold text-nutri-charcoal mb-1.5"
              >
                Phone Number
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="reg-phone"
                  type="tel"
                  placeholder="+91 99999 88888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full text-xs pl-10 pr-3.5 py-3 bg-nutri-bg/50 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white text-nutri-charcoal font-medium transition-colors"
                />
              </div>
            </div>
          )}

          {/* Kitchen Outlet Selector */}
          {targetPortal === "kitchen" && (
            <div>
              <label
                htmlFor="reg-outlet"
                className="block text-xs font-bold text-nutri-charcoal mb-1.5"
              >
                Assigned Kitchen Outlet
              </label>
              <div className="relative">
                <Store className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3.5 pointer-events-none" />
                <select
                  id="reg-outlet"
                  value={outletId}
                  onChange={(e) => setOutletId(e.target.value)}
                  className="w-full text-xs pl-10 pr-3.5 py-3 bg-nutri-bg/50 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white text-nutri-charcoal font-medium transition-colors"
                >
                  {availableOutlets.length > 0 ? (
                    availableOutlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name} ({outlet.gymName})
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="">Default Kiosk Outlet</option>
                      <option value="indiranagar">Indiranagar Cult Kiosk</option>
                      <option value="koramangala">Koramangala Gold Kiosk</option>
                      <option value="bandra">Bandra Nitrro Kiosk</option>
                    </>
                  )}
                </select>
              </div>
            </div>
          )}

          {/* Trainer Custom Referral Handle */}
          {targetPortal === "trainer" && (
            <div>
              <label
                htmlFor="reg-ref"
                className="block text-xs font-bold text-nutri-charcoal mb-1.5"
              >
                Custom Referral Code (Optional)
              </label>
              <div className="relative">
                <Tag className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="reg-ref"
                  type="text"
                  placeholder="e.g., NUTRI-VIKRAM"
                  value={referralCode}
                  onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                  className="w-full text-xs pl-10 pr-3.5 py-3 bg-nutri-bg/50 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white text-nutri-charcoal font-medium transition-colors uppercase"
                />
              </div>
              <p className="text-[10px] text-nutri-secondary mt-1">
                Clients use this code for discounts. Automatically generated if left blank.
              </p>
            </div>
          )}

          {/* Password */}
          <div>
            <label
              htmlFor="reg-password"
              className="block text-xs font-bold text-nutri-charcoal mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs pl-10 pr-10 py-3 bg-nutri-bg/50 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white text-nutri-charcoal font-medium transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 p-0.5 text-nutri-secondary hover:text-nutri-charcoal transition-colors cursor-pointer"
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

          {/* Staff Invitation / Authorization Code */}
          {portalBadge && (
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200/80 space-y-1.5">
              <label
                htmlFor="reg-code"
                className="block text-xs font-bold text-nutri-charcoal"
              >
                {portalBadge.codeLabel}{" "}
                <span className="text-rose-600 font-extrabold">*</span>
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-amber-600 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  id="reg-code"
                  type={showCode ? "text" : "password"}
                  required
                  placeholder={portalBadge.codePlaceholder}
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full text-xs pl-10 pr-10 py-2.5 bg-white rounded-xl border border-amber-200 focus:outline-none focus:border-amber-500 text-nutri-charcoal font-semibold tracking-wider transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCode(!showCode)}
                  className="absolute right-3 top-2.5 p-0.5 text-nutri-secondary hover:text-nutri-charcoal transition-colors cursor-pointer"
                  title={showCode ? "Hide access code" : "Show access code"}
                  aria-label={showCode ? "Hide access code" : "Show access code"}
                >
                  {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-amber-900/80 leading-snug">
                {portalBadge.codeHint}. Unrestricted public self-registration is strictly
                prohibited.
              </p>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            isLoading={loading}
            size="lg"
            className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs rounded-full cursor-pointer shadow-xs py-3 mt-2"
          >
            {targetPortal === "admin"
              ? "REGISTER SUPER ADMIN"
              : targetPortal === "kitchen"
              ? "REGISTER KITCHEN OPERATOR"
              : targetPortal === "trainer"
              ? "REGISTER TRAINER PARTNER"
              : "CREATE CUSTOMER ACCOUNT"}{" "}
            <ArrowRight className="w-4 h-4 ml-1.5 stroke-[2.5]" />
          </Button>
        </form>

        {/* Navigation to Login */}
        <div className="pt-2 border-t border-nutri-border-light text-center">
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
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex flex-col bg-nutri-bg">
      <PublicHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
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
