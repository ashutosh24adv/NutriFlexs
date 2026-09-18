"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { User, MapPin, Zap, Clock, Shield, LogOut, Check, ArrowRight, Lock, Crown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { GymSelector } from "@/components/customer/gym-selector";

import { useDietary } from "@/components/customer/dietary-context";

export default function CustomerProfilePage() {
  const { data: session, status } = useSession();
  const { isVegetarian, setIsVegetarian } = useDietary();
  const isAuthenticated = status === "authenticated";
  const user = session?.user as any;

  const [userName, setUserName] = useState("Customer");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("+91 99999 88888");
  const [weightKg, setWeightKg] = useState<string>("");
  const [proteinGoal, setProteinGoal] = useState(120);
  const [dietaryChoice, setDietaryChoice] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDietaryChoice(isVegetarian);
  }, [isVegetarian]);

  useEffect(() => {
    if (user) {
      if (user.name) setUserName(user.name);
      if (user.email) setEmail(user.email);
    }
    async function loadStats() {
      try {
        const res = await fetch("/api/user/stats");
        const data = await res.json();
        if (data.success && data.user) {
          if (data.user.weightKg) setWeightKg(String(data.user.weightKg));
          if (data.user.proteinGoalGrams) setProteinGoal(data.user.proteinGoalGrams);
          if (typeof data.user.isVegetarian === "boolean") {
            setDietaryChoice(data.user.isVegetarian);
          }
        }
      } catch (err) {
        console.error("Error loading user profile stats", err);
      }
    }
    if (isAuthenticated) {
      loadStats();
    }
  }, [user, isAuthenticated]);

  // If unauthenticated, show sign in prompt
  if (status === "unauthenticated") {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <Card className="p-8 bg-white border border-nutri-border rounded-3xl space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-nutri-green-light rounded-full flex items-center justify-center mx-auto text-nutri-green shadow-xs">
            <Lock className="w-8 h-8 stroke-[2]" />
          </div>
          <h2 className="text-xl font-extrabold font-heading text-nutri-charcoal">
            Sign In to View Profile
          </h2>
          <p className="text-xs text-nutri-secondary leading-relaxed">
            Manage your daily protein goals, gym preferences, order history, and active NutriFlexs Pass.
          </p>
          <div className="space-y-2 pt-2">
            <Link href="/login?callbackUrl=/profile" className="block w-full">
              <Button size="md" className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs rounded-full shadow-xs cursor-pointer">
                Sign In to Account <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link href="/signup?callbackUrl=/profile" className="block w-full">
              <Button size="md" className="w-full bg-white border border-nutri-border text-nutri-charcoal hover:bg-nutri-green-soft font-bold text-xs rounded-full cursor-pointer">
                Create New Account
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (dietaryChoice !== isVegetarian) {
        await setIsVegetarian(dietaryChoice);
      }
      if (weightKg && !isNaN(parseFloat(weightKg))) {
        await fetch("/api/user/nutrition-goal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_weight",
            weightKg: parseFloat(weightKg),
          }),
        });
      }
      if (proteinGoal && !isNaN(proteinGoal)) {
        await fetch("/api/user/nutrition-goal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "set_goal",
            customDailyProteinGoal: proteinGoal,
          }),
        });
      }
    } catch (err) {
      console.error("Error saving profile nutrition data", err);
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal">
          Customer Profile
        </h1>
        <p className="text-xs sm:text-sm text-nutri-secondary mt-0.5">
          Manage your fitness goals, gym preferences, and account details.
        </p>
      </div>

      {/* User Card */}
      <Card className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-nutri-border rounded-3xl shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-nutri-green text-white font-extrabold text-2xl flex items-center justify-center font-heading shrink-0 shadow-md">
            {userName.charAt(0).toUpperCase()}
          </div>

          <div>
            <h3 className="text-lg font-bold font-heading text-nutri-charcoal">{userName}</h3>
            <p className="text-xs text-nutri-secondary">{email || "customer@nutriflexs.com"} · {phone}</p>
            <div className="flex items-center gap-2 mt-1.5">
              <Badge variant="gold" className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-[10px] px-2.5 py-0.5">
                {user?.role || "CUSTOMER ACCOUNT"}
              </Badge>
              {isVegetarian && (
                <Badge className="bg-emerald-50 text-emerald-800 border-emerald-200 font-bold text-[10px] px-2.5 py-0.5">
                  🥬 VEGETARIAN PREFERRED
                </Badge>
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => signOut({ callbackUrl: "/home" })}
          className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-4 py-2 rounded-full border border-rose-200 transition-colors shrink-0 cursor-pointer self-start sm:self-auto"
        >
          <LogOut className="w-3.5 h-3.5" /> Sign Out
        </button>
      </Card>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link href="/orders" className="block group">
          <Card className="p-5 border-nutri-border bg-white rounded-2xl group-hover:border-nutri-green transition-all shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-nutri-charcoal group-hover:text-nutri-green transition-colors">
                  Your Orders
                </h4>
                <p className="text-[11px] text-nutri-secondary">View past orders & live tracking</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-nutri-secondary group-hover:text-nutri-green transition-colors" />
          </Card>
        </Link>

        <Link href="/pass" className="block group">
          <Card className="p-5 border-nutri-border bg-white rounded-2xl group-hover:border-nutri-green transition-all shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
                <Crown className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-nutri-charcoal group-hover:text-nutri-green transition-colors">
                  NutriFlexs Pass
                </h4>
                <p className="text-[11px] text-nutri-secondary">Manage monthly pass & credits</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-nutri-secondary group-hover:text-nutri-green transition-colors" />
          </Card>
        </Link>
      </div>

      {/* Profile Settings Form */}
      <Card className="p-6 border-nutri-border bg-white rounded-3xl shadow-xs">
        <form onSubmit={handleSave} className="space-y-4">
          <h3 className="text-sm font-bold font-heading text-nutri-charcoal border-b border-nutri-border-light pb-2">
            Personal Information & Dietary Preference
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-nutri-secondary mb-1">Full Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-white text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-nutri-charcoal font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-secondary mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-nutri-charcoal font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-secondary mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-white text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-nutri-charcoal font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-secondary mb-1">Dietary Preference</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setDietaryChoice(false)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    !dietaryChoice
                      ? "bg-nutri-green-light border-nutri-green text-nutri-green"
                      : "bg-white border-nutri-border text-nutri-secondary hover:text-nutri-charcoal"
                  }`}
                >
                  All Food
                </button>
                <button
                  type="button"
                  onClick={() => setDietaryChoice(true)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    dietaryChoice
                      ? "bg-nutri-green text-white border-nutri-green-deep shadow-xs"
                      : "bg-white border-nutri-border text-nutri-secondary hover:text-nutri-charcoal"
                  }`}
                >
                  🥬 Vegetarian Only
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-secondary mb-1">Body Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="300"
                placeholder="e.g. 75"
                value={weightKg}
                onChange={(e) => {
                  setWeightKg(e.target.value);
                  const w = parseFloat(e.target.value);
                  if (!isNaN(w) && w > 0) {
                    setProteinGoal(Math.round(w * 1.6));
                  }
                }}
                className="w-full bg-white text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-nutri-charcoal font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-secondary mb-1">Daily Protein Goal (Grams)</label>
              <input
                type="number"
                value={proteinGoal}
                onChange={(e) => setProteinGoal(Number(e.target.value))}
                className="w-full bg-white text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green text-nutri-charcoal font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-nutri-secondary mb-1">Primary Gym Location</label>
            <GymSelector />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button type="submit" size="md" className="bg-nutri-green text-white hover:bg-nutri-green-dark font-bold text-xs rounded-full cursor-pointer shadow-xs">
              Save Changes
            </Button>
            {saved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Profile updated successfully!
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
