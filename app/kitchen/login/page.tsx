"use client";

import React, { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert,
  ChefHat,
  Clock,
  Zap,
  PackageCheck,
  CheckCircle2,
  X,
  ExternalLink,
  Info,
} from "lucide-react";

function sanitizeCallbackUrl(url: string | null): string {
  if (!url) return "/kitchen";
  if (!url.startsWith("/") || url.startsWith("//") || url.startsWith("/\\") || url.includes("://")) {
    return "/kitchen";
  }
  return url;
}

function KitchenLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();

  const rawCallbackUrl = searchParams.get("callbackUrl");
  const callbackUrl = sanitizeCallbackUrl(rawCallbackUrl);
  const urlError = searchParams.get("error");

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ identifier?: string; password?: string }>({});

  // Forgot password modal state
  const [forgotModalOpen, setForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotNotice, setForgotNotice] = useState<string | null>(null);

  // Restore remembered username/email
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nutriflexs_kitchen_saved_user");
      if (saved) {
        setIdentifier(saved);
        setRememberMe(true);
      }
    } catch {
      // localStorage may be unavailable in some private windows
    }
  }, []);

  // Handle URL errors (e.g. from middleware redirect)
  useEffect(() => {
    if (urlError === "unauthorized_role") {
      setErrorMessage(
        "Access Denied: Your account does not have Kitchen Staff authorization. Customer and Trainer accounts cannot access the Kitchen Workspace."
      );
    } else if (urlError === "CredentialsSignin") {
      setErrorMessage(
        "Invalid email/username or password. Please verify your credentials and try again."
      );
    }
  }, [urlError]);

  // If already authenticated with authorized role, redirect to /kitchen
  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      const userRole = (session.user as any).role;
      if (userRole === "KITCHEN" || userRole === "ADMIN" || userRole === "SUPER_ADMIN") {
        router.push(callbackUrl.startsWith("/kitchen") ? callbackUrl : "/kitchen");
      }
    }
  }, [status, session, router, callbackUrl]);

  const validateForm = () => {
    const errors: { identifier?: string; password?: string } = {};

    if (!identifier.trim()) {
      errors.identifier = "Please enter your registered email address or username";
    }

    if (!password) {
      errors.password = "Please enter your account password";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const trimmedIdentifier = identifier.trim();

      const res = await signIn("credentials", {
        email: trimmedIdentifier,
        password,
        portal: "kitchen",
        redirect: false,
      });

      if (res?.ok) {
        // Save or remove remembered user
        try {
          if (rememberMe) {
            localStorage.setItem("nutriflexs_kitchen_saved_user", trimmedIdentifier);
          } else {
            localStorage.removeItem("nutriflexs_kitchen_saved_user");
          }
        } catch {
          // ignore
        }

        router.refresh();
        router.push(callbackUrl.startsWith("/kitchen") ? callbackUrl : "/kitchen");
      } else {
        const errorText = res?.error;
        if (errorText && errorText !== "CredentialsSignin") {
          setErrorMessage(errorText);
        } else {
          setErrorMessage(
            "Invalid email/username or password. Please verify your credentials and try again."
          );
        }
      }
    } catch {
      setErrorMessage(
        "An unexpected error occurred while signing in. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);
    setForgotNotice(null);

    if (!forgotEmail.trim() || !forgotEmail.includes("@")) {
      setForgotError("Please enter a valid email address.");
      return;
    }

    setForgotLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setForgotSuccess(
          "If an account is associated with this email address, password reset instructions have been securely generated."
        );
        if (data.emailNotice) {
          setForgotNotice(data.emailNotice);
        }
      } else {
        setForgotError(data.error || "Unable to submit request. Please try again later.");
      }
    } catch {
      setForgotError("Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7FAF4] text-[#111111] flex flex-col justify-between font-sans selection:bg-[#EAF4E3] selection:text-[#24630F]">
      {/* Top Mobile Bar (Visible on mobile/tablet) */}
      <div className="lg:hidden w-full bg-white border-b border-[#E5E7E2] px-4 py-3 flex items-center justify-between">
        <NutriFlexsLogo size="sm" showTagline={false} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#2F7D16] bg-[#EAF4E3] px-2.5 py-1 rounded-full flex items-center gap-1.5">
          <ChefHat className="w-3.5 h-3.5" />
          Kitchen Portal
        </span>
      </div>

      {/* Main Split Screen Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-12 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* LEFT SECTION: Visual, Branding & Feature Highlights */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-center space-y-6 lg:pr-6">
            {/* Desktop Brand Logo */}
            <div className="hidden lg:flex items-center justify-between">
              <NutriFlexsLogo size="md" showTagline={true} />
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4E3] border border-[#2F7D16]/20 text-[#24630F] text-xs font-bold tracking-wide">
                <ChefHat className="w-3.5 h-3.5" />
                <span>KITCHEN OPERATIONS</span>
              </div>
            </div>

            {/* Header Titles */}
            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#111111] leading-[1.15]">
                Welcome to the <span className="text-[#2F7D16]">Kitchen</span>
              </h1>
              <p className="text-[#4B5563] text-base sm:text-lg leading-relaxed max-w-xl">
                Manage incoming orders, prepare meals and keep every pickup on schedule with the
                NutriFlexs Kitchen Display System.
              </p>
            </div>

            {/* Premium Kitchen Visual Card */}
            <div className="relative rounded-3xl overflow-hidden border border-[#E5E7E2] bg-white shadow-sm p-2 sm:p-3 max-w-xl">
              <div className="relative h-44 sm:h-56 w-full rounded-2xl overflow-hidden bg-slate-900">
                <Image
                  src="/images/products/lean-grilled-chicken-breast.webp"
                  alt="NutriFlexs Fresh Meal Preparation"
                  fill
                  priority
                  className="object-cover opacity-90 hover:scale-105 transition-transform duration-500"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 40vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {/* Live Status Overlay */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-[#111111] px-3 py-1 rounded-full text-xs font-bold flex items-center gap-2 shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#2F7D16] animate-pulse" />
                  <span>Express Kiosk Active</span>
                </div>

                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white text-xs">
                  <span className="font-semibold text-white/90">Post-Workout Meal Station</span>
                  <span className="bg-[#2F7D16] text-white font-bold px-2 py-0.5 rounded text-[11px]">
                    KDS v2.0
                  </span>
                </div>
              </div>
            </div>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-xl pt-1">
              <div className="bg-white border border-[#E5E7E2] rounded-2xl p-3.5 space-y-1.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center font-bold">
                  <Zap className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-[#111111]">Live Order Sync</h2>
                <p className="text-[11px] text-[#4B5563] leading-snug">
                  Instant order reception from gym kiosks and mobile app.
                </p>
              </div>

              <div className="bg-white border border-[#E5E7E2] rounded-2xl p-3.5 space-y-1.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center font-bold">
                  <Clock className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-[#111111]">Real-Time Prep</h2>
                <p className="text-[11px] text-[#4B5563] leading-snug">
                  1-tap progress updates from cooking to pickup ready.
                </p>
              </div>

              <div className="bg-white border border-[#E5E7E2] rounded-2xl p-3.5 space-y-1.5 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center font-bold">
                  <PackageCheck className="w-4 h-4" />
                </div>
                <h2 className="text-xs font-bold text-[#111111]">Fast Kiosk Pickup</h2>
                <p className="text-[11px] text-[#4B5563] leading-snug">
                  Seamless locker and kiosk handoff on schedule.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT SECTION: White Login Card */}
          <div className="lg:col-span-6 xl:col-span-5 flex justify-center">
            <div className="w-full max-w-md bg-white border border-[#E5E7E2] rounded-3xl p-6 sm:p-8 shadow-sm">
              <div className="space-y-2 mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4E3] text-[#24630F] text-xs font-bold mb-1">
                  <ChefHat className="w-3.5 h-3.5" />
                  <span>Authorized Personnel Only</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-[#111111]">
                  Kitchen Staff Login
                </h2>
                <p className="text-sm text-[#4B5563]">
                  Sign in to access your kitchen workspace.
                </p>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div
                  role="alert"
                  className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3"
                >
                  <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
                </div>
              )}

              {/* Login Form */}
              <form onSubmit={handleLogin} noValidate className="space-y-4">
                {/* Email or Username */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="kitchen-identifier"
                    className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]"
                  >
                    Email Address or Username
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <User className="w-4 h-4" />
                    </div>
                    <input
                      id="kitchen-identifier"
                      name="identifier"
                      type="text"
                      autoComplete="username"
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (fieldErrors.identifier) {
                          setFieldErrors((prev) => ({ ...prev, identifier: undefined }));
                        }
                      }}
                      placeholder="e.g. kitchen@nutriflexs.com or Chef Rajesh"
                      className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.identifier
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                          : "border-[#E5E7E2] focus:border-[#2F7D16] focus:ring-[#EAF4E3] bg-white"
                      }`}
                    />
                  </div>
                  {fieldErrors.identifier && (
                    <p className="text-xs text-rose-600 font-medium">{fieldErrors.identifier}</p>
                  )}
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor="kitchen-password"
                      className="block text-xs font-bold uppercase tracking-wider text-[#4B5563]"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotModalOpen(true);
                        setForgotEmail(identifier.includes("@") ? identifier : "");
                      }}
                      className="text-xs font-semibold text-[#2F7D16] hover:text-[#24630F] hover:underline cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      id="kitchen-password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (fieldErrors.password) {
                          setFieldErrors((prev) => ({ ...prev, password: undefined }));
                        }
                      }}
                      placeholder="••••••••••••"
                      className={`w-full pl-10 pr-11 py-3 rounded-xl border text-sm text-[#111111] placeholder:text-gray-400 focus:outline-none focus:ring-2 transition-all ${
                        fieldErrors.password
                          ? "border-rose-300 focus:border-rose-500 focus:ring-rose-200 bg-rose-50/20"
                          : "border-[#E5E7E2] focus:border-[#2F7D16] focus:ring-[#EAF4E3] bg-white"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-[#111111] transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-rose-600 font-medium">{fieldErrors.password}</p>
                  )}
                </div>

                {/* Remember Me Checkbox */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-[#2F7D16] focus:ring-[#2F7D16] border-[#E5E7E2] accent-[#2F7D16]"
                    />
                    <span className="text-xs text-[#4B5563] font-medium">Remember my login</span>
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">Encrypted SSL Session</span>
                </div>

                {/* Sign In Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3.5 px-4 rounded-xl bg-[#2F7D16] hover:bg-[#24630F] active:scale-[0.99] text-white text-sm font-bold shadow-sm transition-all duration-150 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Verifying Credentials...</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In to Kitchen</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Notice */}
              <div className="mt-6 pt-5 border-t border-[#E5E7E2] flex items-center justify-between text-xs text-[#4B5563]">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2F7D16]" />
                  <span>KDS Terminal Active</span>
                </div>
                <Link
                  href="/staff/register"
                  className="text-xs font-semibold text-[#2F7D16] hover:underline"
                >
                  Have an access code?
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#E5E7E2] bg-white py-4 px-6 text-center text-xs text-[#4B5563]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} NutriFlexs. All rights reserved. Eat Smart. Track Better.</p>
          <div className="flex items-center gap-4">
            <Link href="/" className="font-semibold text-[#2F7D16] hover:underline flex items-center gap-1">
              <span>Return to Main Website</span>
              <ExternalLink className="w-3 h-3" />
            </Link>
            <span className="text-gray-300">•</span>
            <Link href="/login" className="hover:text-[#111111] transition-colors">
              Customer Sign In
            </Link>
          </div>
        </div>
      </footer>

      {/* Forgot Password Modal */}
      {forgotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-[#E5E7E2] max-w-md w-full p-6 shadow-xl space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#111111]">Reset Staff Password</h3>
                <p className="text-xs text-[#4B5563] mt-0.5">
                  Enter your registered email address to receive password reset instructions.
                </p>
              </div>
              <button
                onClick={() => {
                  setForgotModalOpen(false);
                  setForgotSuccess(null);
                  setForgotError(null);
                  setForgotNotice(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {forgotSuccess ? (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm space-y-2">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Request Processed</span>
                  </div>
                  <p>{forgotSuccess}</p>
                </div>

                {forgotNotice && (
                  <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{forgotNotice}</p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setForgotModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-[#2F7D16] text-white text-xs font-bold hover:bg-[#24630F] transition-colors cursor-pointer"
                >
                  Back to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4 pt-2">
                {forgotError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                    {forgotError}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="forgot-email" className="block text-xs font-bold uppercase text-[#4B5563]">
                    Registered Staff Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      id="forgot-email"
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="e.g. kitchen@nutriflexs.com"
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[#E5E7E2] text-sm text-[#111111] focus:outline-none focus:border-[#2F7D16] focus:ring-2 focus:ring-[#EAF4E3]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setForgotModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4B5563] hover:bg-gray-100 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="px-5 py-2 rounded-xl bg-[#2F7D16] hover:bg-[#24630F] text-white text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
                  >
                    {forgotLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <span>Send Reset Link</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function KitchenLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#F7FAF4] flex items-center justify-center p-6">
          <div className="w-8 h-8 border-3 border-[#2F7D16]/30 border-t-[#2F7D16] rounded-full animate-spin" />
        </div>
      }
    >
      <KitchenLoginForm />
    </Suspense>
  );
}
