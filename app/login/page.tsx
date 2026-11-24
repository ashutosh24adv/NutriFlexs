"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldAlert,
  ChefHat,
  Dumbbell,
  Shield,
  LogOut,
  Sparkles,
  Utensils,
  Flame,
  Check,
} from "lucide-react";
import { PublicHeader } from "@/components/customer/public-header";

function sanitizeCallbackUrl(url: string | null): string {
  if (!url) return "/home";
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\") || url.includes("://")) {
    return "/home";
  }
  return url;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = sanitizeCallbackUrl(rawCallbackUrl);

  const rawStaff = searchParams.get("staff") === "true";
  const portalParam = searchParams.get("portal");
  const urlError = searchParams.get("error");

  const isStaff =
    rawStaff ||
    callbackUrl.startsWith("/admin") ||
    callbackUrl.startsWith("/kitchen") ||
    callbackUrl.startsWith("/trainer");

  const targetPortal =
    portalParam ||
    (callbackUrl.startsWith("/admin")
      ? "admin"
      : callbackUrl.startsWith("/kitchen")
      ? "kitchen"
      : callbackUrl.startsWith("/trainer")
      ? "trainer"
      : null);

  const { data: session, status } = useSession();
  const currentUser = session?.user as any;
  const currentRole = currentUser?.role;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Redirect kitchen portal requests to the dedicated Kitchen Login page
  useEffect(() => {
    if (portalParam === "kitchen" || (callbackUrl.startsWith("/kitchen") && !urlError)) {
      const target = new URL("/kitchen/login", window.location.origin);
      if (rawCallbackUrl) target.searchParams.set("callbackUrl", rawCallbackUrl);
      router.replace(target.pathname + target.search);
    }
  }, [portalParam, callbackUrl, rawCallbackUrl, urlError, router]);

  // Set initial error from URL query params (e.g. from middleware redirect)
  useEffect(() => {
    if (urlError === "unauthorized_role") {
      setErrorMessage(
        "Access Denied: Your account does not have permission to access this staff portal. Please sign in with an authorized staff account."
      );
    } else if (urlError === "CredentialsSignin") {
      setErrorMessage("Invalid email or password. Please verify your credentials and try again.");
    }
  }, [urlError]);

  // Safe redirect when authenticated and authorized
  useEffect(() => {
    if (status === "authenticated" && currentRole) {
      const isTargetAdmin = callbackUrl.startsWith("/admin");
      const isTargetKitchen = callbackUrl.startsWith("/kitchen");
      const isTargetTrainer = callbackUrl.startsWith("/trainer");

      if (isTargetAdmin && currentRole !== "ADMIN") {
        setErrorMessage(
          `Unauthorized: Your account (${currentUser?.email}) has role "${currentRole}", which cannot access Super Admin Operations.`
        );
        return;
      }

      if (isTargetKitchen && currentRole !== "KITCHEN" && currentRole !== "ADMIN") {
        setErrorMessage(
          `Unauthorized: Your account (${currentUser?.email}) has role "${currentRole}", which cannot access Kitchen Display Kiosk.`
        );
        return;
      }

      if (isTargetTrainer && currentRole !== "TRAINER" && currentRole !== "ADMIN") {
        setErrorMessage(
          `Unauthorized: Your account (${currentUser?.email}) has role "${currentRole}", which cannot access Trainer Partner Portal.`
        );
        return;
      }

      // If no permission conflict, redirect safely by role
      if (!urlError) {
        if (currentRole === "TRAINER") {
          router.push("/trainer");
        } else if (currentRole === "KITCHEN") {
          router.push("/kitchen");
        } else if (currentRole === "ADMIN" || currentRole === "SUPER_ADMIN") {
          router.push(callbackUrl && callbackUrl !== "/home" ? callbackUrl : "/admin");
        } else if (currentRole === "DIETITIAN") {
          router.push("/dietitian");
        } else {
          router.push(callbackUrl);
        }
      }
    }
  }, [status, currentRole, callbackUrl, currentUser, urlError, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const normalizedEmail = email.toLowerCase().trim();

      const res = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (res?.ok) {
        // Successful login, refresh session and navigate strictly by role
        router.refresh();
        try {
          const sessionRes = await fetch("/api/auth/session");
          const sessionData = await sessionRes.json();
          const loggedInRole = sessionData?.user?.role;
          if (loggedInRole === "TRAINER") {
            router.push("/trainer");
            return;
          }
          if (loggedInRole === "KITCHEN") {
            router.push("/kitchen");
            return;
          }
          if (loggedInRole === "ADMIN" || loggedInRole === "SUPER_ADMIN") {
            router.push(callbackUrl && callbackUrl !== "/login" && callbackUrl !== "/home" ? callbackUrl : "/admin");
            return;
          }
          if (loggedInRole === "DIETITIAN") {
            router.push("/dietitian");
            return;
          }
        } catch {}

        // Customer / default fallback
        if (callbackUrl && callbackUrl !== "/login") {
          router.push(callbackUrl);
        } else {
          router.push(isStaff ? "/admin" : "/home");
        }
      } else {
        setErrorMessage("Invalid email or password. Please verify your credentials and try again.");
      }
    } catch (err: any) {
      setErrorMessage("We're temporarily unable to process your request. Please try again shortly.");
    } finally {
      setLoading(false);
    }
  };

  const portalBadge = {
    admin: { label: "Super Admin Operations", icon: Shield, color: "text-rose-700 bg-rose-50 border-rose-200" },
    kitchen: { label: "Kitchen Display Kiosk", icon: ChefHat, color: "text-amber-800 bg-amber-50 border-amber-200" },
    trainer: { label: "Trainer Partner Portal", icon: Dumbbell, color: "text-indigo-700 bg-indigo-50 border-indigo-200" },
  }[targetPortal || ""];

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
      <div className="bg-white rounded-3xl border border-nutri-border shadow-float overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[620px]">
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
                Welcome Back to NutriFlexs
              </h2>
              <p className="text-xs sm:text-sm text-nutri-muted leading-relaxed">
                Sign in to order fresh post-workout fuel, track your daily calories, and reach your fitness goals.
              </p>
            </div>
          </div>

          {/* Middle Visual & Experience Highlights */}
          <div className="relative z-10 my-4 lg:my-6 space-y-3.5">
            {/* Featured Photography Card (visible on sm screens and up) */}
            <div className="hidden sm:block relative aspect-[16/9] w-full rounded-2xl overflow-hidden shadow-xs border border-white/80 bg-nutri-bg">
              <Image
                src="/images/products/lean-grilled-chicken-breast.webp"
                alt="NutriFlexs Clean Post-Workout Fuel"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 400px"
                priority
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 text-white flex items-center justify-between">
                <span className="text-[11px] font-bold">Fast Gym-Side Pickup</span>
                <span className="text-[10px] font-extrabold bg-nutri-green text-white px-2 py-0.5 rounded-full shadow-xs">
                  36g Protein
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

        {/* RIGHT COLUMN: Clean, Well-Organized Login Form (7 cols on lg) */}
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

              <h1 className="text-2xl sm:text-3xl font-bold font-heading text-nutri-charcoal tracking-tight">
                {isStaff ? "Staff Portal Sign In" : "Welcome Back"}
              </h1>

              <p className="text-xs sm:text-sm text-nutri-secondary leading-relaxed">
                {isStaff
                  ? "Access is strictly restricted to authorized staff and operator personnel."
                  : "Your food and nutrition journey continues here."}
              </p>
            </div>

            {/* Existing Session Warning (if logged in with wrong role) */}
            {status === "authenticated" && errorMessage?.startsWith("Unauthorized") && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5 text-xs text-amber-900 animate-fade-in">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-bold">Switch to Authorized Account</p>
                    <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">{errorMessage}</p>
                  </div>
                </div>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => signOut({ redirect: false }).then(() => setErrorMessage(null))}
                    className="w-full py-2 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out &amp; Switch Account
                  </button>
                </div>
              </div>
            )}

            {/* General Error Banner */}
            {errorMessage && !errorMessage.startsWith("Unauthorized") && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800 animate-fade-in">
                <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
                <span className="font-semibold leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Sign In Form */}
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-bold text-nutri-charcoal mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder={isStaff ? "staff@nutriflexs.com" : "you@example.com"}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-11 sm:h-12 w-full text-xs sm:text-sm pl-10 pr-3.5 bg-nutri-bg/40 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white focus:ring-2 focus:ring-nutri-green/15 text-nutri-charcoal font-medium transition-all"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-nutri-charcoal mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="login-password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
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
              </div>

              {/* Submit CTA */}
              <Button
                type="submit"
                isLoading={loading}
                size="lg"
                className="h-12 w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-sm rounded-full cursor-pointer shadow-md shadow-nutri-green/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2 mt-2"
              >
                SIGN IN <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </Button>
            </form>

            {/* Navigation to Sign Up */}
            <div className="pt-3 border-t border-nutri-border-light text-center">
              {isStaff ? (
                <p className="text-xs text-nutri-secondary">
                  Need a {portalBadge?.label ? portalBadge.label : "staff"} account?{" "}
                  <Link
                    href={`/signup?portal=${targetPortal || ""}&callbackUrl=${encodeURIComponent(
                      callbackUrl
                    )}&staff=true`}
                    className="font-bold text-nutri-green hover:underline cursor-pointer"
                  >
                    Sign up here
                  </Link>
                </p>
              ) : (
                <p className="text-xs text-nutri-secondary">
                  Don&apos;t have an account?{" "}
                  <Link
                    href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    className="font-bold text-nutri-green hover:underline cursor-pointer"
                  >
                    Sign up
                  </Link>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-nutri-bg selection:bg-nutri-green-light selection:text-nutri-green">
      <PublicHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Suspense
          fallback={
            <div className="text-xs font-bold text-nutri-green p-8 animate-pulse">
              Loading NutriFlexs Sign In...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </main>
    </div>
  );
}
