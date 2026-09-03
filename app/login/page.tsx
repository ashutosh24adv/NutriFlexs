"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Mail, ArrowRight, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("ashu@nutriflexs.com");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/home");
    }, 600);
  };

  const handleQuickDemoRole = (roleEmail: string) => {
    setEmail(roleEmail);
    if (roleEmail.includes("kitchen")) router.push("/kitchen");
    else if (roleEmail.includes("arjun")) router.push("/trainer");
    else if (roleEmail.includes("admin")) router.push("/admin");
    else router.push("/home");
  };

  return (
    <div className="min-h-screen bg-nutri-bg flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <NutriFlexsLogo size="lg" showTagline={true} className="justify-center" />
          <h2 className="text-xl font-bold font-heading text-nutri-charcoal pt-2">Welcome Back</h2>
          <p className="text-xs text-nutri-muted">Sign in to order your 3-minute post-workout fuel</p>
        </div>

        <Card className="p-6 space-y-4">
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-nutri-muted mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-nutri-muted absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-nutri-bg rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-muted mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-nutri-muted absolute left-3.5 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-nutri-bg rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
                />
              </div>
            </div>

            <Button type="submit" isLoading={loading} size="lg" variant="primary" className="w-full font-bold text-xs">
              SIGN IN <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>

          {/* Instant Portal Role Quick Login Selector */}
          <div className="pt-3 border-t border-nutri-border space-y-2">
            <span className="text-[10px] font-bold text-nutri-muted uppercase tracking-wider block text-center">
              Quick One-Tap Demo Portal Access
            </span>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                onClick={() => handleQuickDemoRole("ashu@nutriflexs.com")}
                className="p-2 rounded-xl bg-nutri-green-light text-nutri-green font-semibold border border-nutri-green-soft text-left"
              >
                👤 Customer View
              </button>
              <button
                onClick={() => handleQuickDemoRole("kitchen@nutriflexs.com")}
                className="p-2 rounded-xl bg-amber-50 text-amber-900 font-semibold border border-amber-200 text-left"
              >
                👨‍🍳 Kitchen Kiosk
              </button>
              <button
                onClick={() => handleQuickDemoRole("arjun@nutriflexs.com")}
                className="p-2 rounded-xl bg-indigo-50 text-indigo-900 font-semibold border border-indigo-200 text-left"
              >
                🏋️ Trainer Portal
              </button>
              <button
                onClick={() => handleQuickDemoRole("admin@nutriflexs.com")}
                className="p-2 rounded-xl bg-rose-50 text-rose-900 font-semibold border border-rose-200 text-left"
              >
                🛡️ Admin Suite
              </button>
            </div>
          </div>
        </Card>

        <p className="text-center text-xs text-nutri-muted">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-bold text-nutri-green hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
