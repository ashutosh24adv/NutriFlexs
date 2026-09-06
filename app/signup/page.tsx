"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Mail, User, Phone, ArrowRight } from "lucide-react";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/home";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Register user in PostgreSQL
      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone,
          password,
        }),
      });

      const regData = await regRes.json();
      if (!regData.success) {
        throw new Error(regData.error || "Failed to create account");
      }

      // 2. Automatically sign in with NextAuth
      const signRes = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signRes?.ok) {
        router.push(callbackUrl);
        router.refresh();
      } else {
        // Fallback: Redirect to login with callback
        router.push(`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`);
      }
    } catch (err: any) {
      setError(err.message || "Registration error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <NutriFlexsLogo size="lg" showTagline={true} className="justify-center" />
        <h2 className="text-xl font-bold font-heading text-nutri-charcoal pt-2">Create Customer Account</h2>
        <p className="text-xs text-nutri-secondary">Get 10% off your first post-workout refuel pack</p>
      </div>

      <Card className="p-6 space-y-4 bg-white border border-nutri-border rounded-3xl shadow-sm">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-bold text-rose-800 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-nutri-secondary mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3" />
              <input
                type="text"
                required
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2.5 bg-white rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-nutri-charcoal font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-nutri-secondary mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3" />
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2.5 bg-white rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-nutri-charcoal font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-nutri-secondary mb-1">Phone Number</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-3" />
              <input
                type="tel"
                placeholder="+91 99999 88888"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full text-xs pl-10 pr-3 py-2.5 bg-white rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-nutri-charcoal font-medium"
              />
            </div>
          </div>

          <Button type="submit" isLoading={loading} size="lg" className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs rounded-full shadow-xs cursor-pointer">
            CREATE ACCOUNT <ArrowRight className="w-4 h-4 ml-1 stroke-[2.5]" />
          </Button>
        </form>
      </Card>

      <p className="text-center text-xs text-nutri-secondary">
        Already have an account?{" "}
        <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="font-bold text-nutri-green hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-nutri-bg flex flex-col justify-center items-center p-4">
      <Suspense fallback={<div className="text-xs font-bold text-nutri-green">Loading Sign Up...</div>}>
        <SignupForm />
      </Suspense>
    </div>
  );
}
