"use client";

import React, { useState } from "react";
import { User, MapPin, Zap, Flame, Shield, LogOut, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GymSelector } from "@/components/customer/gym-selector";

export default function CustomerProfilePage() {
  const [userName, setUserName] = useState("Ashu");
  const [email, setEmail] = useState("ashu@nutriflexs.com");
  const [phone, setPhone] = useState("+91 99999 88888");
  const [proteinGoal, setProteinGoal] = useState(120);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal">
          Customer Profile
        </h1>
        <p className="text-xs sm:text-sm text-nutri-muted mt-1">
          Manage your fitness goals, gym preferences, and account details.
        </p>
      </div>

      {/* User Card */}
      <Card className="p-6 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-nutri-green text-white font-extrabold text-2xl flex items-center justify-center font-heading shrink-0 shadow-md">
          {userName.charAt(0)}
        </div>

        <div>
          <h3 className="text-lg font-bold font-heading text-nutri-charcoal">{userName}</h3>
          <p className="text-xs text-nutri-muted">{email} · {phone}</p>
          <span className="inline-block text-[10px] font-bold bg-nutri-green-light text-nutri-green border border-nutri-green-soft px-2.5 py-0.5 rounded-full mt-1">
            CUSTOMER ACCOUNT
          </span>
        </div>
      </Card>

      {/* Profile Form */}
      <Card className="p-6">
        <form onSubmit={handleSave} className="space-y-4">
          <h3 className="text-sm font-bold font-heading text-nutri-charcoal border-b border-nutri-border-light pb-2">
            Personal Information & Goals
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-nutri-muted mb-1">Full Name</label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                className="w-full bg-nutri-bg text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-muted mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-nutri-bg text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-muted mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-nutri-bg text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-nutri-muted mb-1">Daily Protein Goal (Grams)</label>
              <input
                type="number"
                value={proteinGoal}
                onChange={(e) => setProteinGoal(Number(e.target.value))}
                className="w-full bg-nutri-bg text-xs px-3.5 py-2.5 rounded-xl border border-nutri-border focus:outline-none focus:border-nutri-green"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-nutri-muted mb-1">Primary Gym Outlet</label>
            <GymSelector />
          </div>

          <div className="pt-2 flex items-center gap-3">
            <Button type="submit" variant="primary" size="md" className="font-bold text-xs">
              Save Changes
            </Button>
            {saved && (
              <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <Check className="w-4 h-4" /> Profile updated!
              </span>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
