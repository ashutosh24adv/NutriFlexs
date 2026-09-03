"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Mail, ArrowRight } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/home";
  const isStaff = searchParams.get("staff") === "true";

  const [email, setEmail] = useState("ashu@nutriflexs.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        setError(res?.error || "Invalid login credentials");
      }
    } catch (err: any) {
      setError("Login error");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickRole = async (targetEmail: string, targetPath: string) => {
    setEmail(targetEmail);
    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        email: targetEmail,
        password: "password123",
        redirect: false,
      });

      if (res?.ok) {
        router.push(targetPath);
        router.refresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <NutriFlexsLogo size="lg" showTagline={true} className="justify-center" />
        <h2 className="text-xl font-bold font-heading text-nutri-charcoal pt-2">
          {isStaff ? "Staff Portal Sign In" : "Welcome Back"}
        </h2>
        <p className="text-xs text-nutri-secondary">
          {isStaff
            ? "Sign in with staff credentials to access protected kiosk/admin dashboards"
            : "Sign in to complete checkout or track your post-workout goals"}
        </p>
      </div>

      <Card className="p-6 space-y-4 bg-white border border-nutri-border rounded-3xl shadow-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-nutri-secondary mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2.5 bg-white rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-nutri-charcoal font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-nutri-secondary mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2.5 bg-white rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-nutri-charcoal font-medium"
              />
            </div>
          </div>

          <Button type="submit" isLoading={loading} size="lg" className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs rounded-full cursor-pointer shadow-xs">
            SIGN IN <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
          </Button>
        </form>

        {/* Role Access Selectors */}
        <div className="pt-3 border-t border-nutri-border-light space-y-2">
          <span className="text-[10px] font-bold text-nutri-secondary uppercase tracking-wider block text-center">
            Select Demo Role Credentials
          </span>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => handleQuickRole("ashu@nutriflexs.com", callbackUrl)}
              className="p-2 rounded-xl bg-nutri-green-light text-nutri-green font-bold border border-nutri-border text-left cursor-pointer"
            >
              👤 Customer View
            </button>
            <button
              type="button"
              onClick={() => handleQuickRole("kitchen@nutriflexs.com", "/kitchen")}
              className="p-2 rounded-xl bg-amber-50 text-amber-900 font-bold border border-amber-200 text-left cursor-pointer"
            >
              👨‍🍳 Kitchen Kiosk
            </button>
            <button
              type="button"
              onClick={() => handleQuickRole("arjun@nutriflexs.com", "/trainer")}
              className="p-2 rounded-xl bg-indigo-50 text-indigo-900 font-bold border border-indigo-200 text-left cursor-pointer"
            >
              🏋️ Trainer Portal
            </button>
            <button
              type="button"
              onClick={() => handleQuickRole("admin@nutriflexs.com", "/admin")}
              className="p-2 rounded-xl bg-rose-50 text-rose-900 font-bold border border-rose-200 text-left cursor-pointer"
            >
              🛡️ Admin Operations
            </button>
          </div>
        </div>
      </Card>

      <p className="text-center text-xs text-nutri-secondary">
        Don&apos;t have an account?{" "}
        <Link href={`/signup?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-bold text-nutri-green hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-nutri-bg flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="text-xs font-bold text-nutri-green">Loading Sign In...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
