"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Lock, Mail, User, Phone, ArrowRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      router.push("/home");
    }, 600);
  };

  return (
    <div className="min-h-screen bg-nutri-bg flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <NutriFlexsLogo size="lg" showTagline={true} className="justify-center" />
          <h2 className="text-xl font-bold font-heading text-nutri-charcoal pt-2">Create Your Account</h2>
          <p className="text-xs text-nutri-muted">Get 10% off your first post-workout refuel pack</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-nutri-muted mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-nutri-muted absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  placeholder="Ashu"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-nutri-bg rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-muted mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-nutri-muted absolute left-3.5 top-3" />
                <input
                  type="email"
                  required
                  placeholder="ashu@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-nutri-bg rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-muted mb-1">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-nutri-muted absolute left-3.5 top-3" />
                <input
                  type="tel"
                  required
                  placeholder="+91 99999 88888"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full text-xs pl-10 pr-3 py-2.5 bg-nutri-bg rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
                />
              </div>
            </div>

            <Button type="submit" isLoading={loading} size="lg" variant="primary" className="w-full font-bold text-xs">
              CREATE ACCOUNT <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </form>
        </Card>

        <p className="text-center text-xs text-nutri-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-bold text-nutri-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
