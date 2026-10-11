"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, signOut, useSession } from "next-auth/react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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

      // If no permission conflict, redirect safely
      if (!urlError) {
        router.push(callbackUrl);
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
        // Successful login, refresh session and navigate
        router.refresh();

        // If the user signed in, determine the destination
        if (callbackUrl && callbackUrl !== "/login") {
          router.push(callbackUrl);
        } else {
          router.push(isStaff ? "/admin" : "/home");
        }
      } else {
        setErrorMessage("Invalid email or password. Please verify your credentials and try again.");
      }
    } catch (err: any) {
      setErrorMessage("An unexpected authentication error occurred. Please try again.");
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
            {isStaff ? "Staff Portal Sign In" : "Welcome Back"}
          </h1>

          <p className="text-xs text-nutri-secondary max-w-xs mx-auto leading-relaxed">
            {isStaff
              ? "Access is strictly restricted to authorized staff and operator personnel."
              : "Sign in with your NutriFlexs account to manage orders and subscriptions."}
          </p>
        </div>

        {/* Existing Session Warning (if logged in with wrong role) */}
        {status === "authenticated" && errorMessage?.startsWith("Unauthorized") && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl space-y-2.5 text-xs text-amber-900">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Switch to Authorized Account</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">{errorMessage}</p>
              </div>
            </div>
            <div className="pt-1 flex gap-2">
              <button
                type="button"
                onClick={() => signOut({ redirect: false }).then(() => setErrorMessage(null))}
                className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-[11px] transition-colors cursor-pointer flex items-center justify-center gap-1"
              >
                <LogOut className="w-3.5 h-3.5" /> Sign Out & Switch Account
              </button>
            </div>
          </div>
        )}

        {/* General Error Banner */}
        {errorMessage && !errorMessage.startsWith("Unauthorized") && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-2.5 text-xs text-rose-800">
            <ShieldAlert className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
            <span className="font-semibold leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Sign In Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="staff-email" className="block text-xs font-bold text-nutri-charcoal mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                id="staff-email"
                type="email"
                required
                autoComplete="email"
                placeholder={isStaff ? "staff@nutriflexs.com" : "you@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs pl-10 pr-3.5 py-3 bg-nutri-bg/50 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white text-nutri-charcoal font-medium transition-colors"
              />
            </div>
          </div>

          <div>
            <label htmlFor="staff-password" className="block text-xs font-bold text-nutri-charcoal mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3.5 pointer-events-none" />
              <input
                id="staff-password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
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
          </div>

          <Button
            type="submit"
            isLoading={loading}
            size="lg"
            className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs rounded-full cursor-pointer shadow-xs py-3 mt-2"
          >
            SIGN IN <ArrowRight className="w-4 h-4 ml-1.5 stroke-[2.5]" />
          </Button>
        </form>

        {/* Customer Signup Link (only shown for non-staff or customer context) */}
        {!isStaff && (
          <div className="pt-2 border-t border-nutri-border-light text-center">
            <p className="text-xs text-nutri-secondary">
              Don&apos;t have an account?{" "}
              <Link
                href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                className="font-bold text-nutri-green hover:underline cursor-pointer"
              >
                Sign up
              </Link>
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-nutri-bg">
      <PublicHeader />
      <main className="flex-1 flex flex-col justify-center items-center px-4 py-8 sm:py-12">
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
