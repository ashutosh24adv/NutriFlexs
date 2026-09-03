"use client";

import React, { useState } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Dumbbell, Copy, Check, Users, Trophy, Gift, ArrowRight, Share2, Sparkles, ChevronLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TrainerDashboard() {
  const [copied, setCopied] = useState(false);
  const referralCode = "NUTRI-ARJUN";
  const referralUrl = `https://nutriflexs.com/signup?ref=${referralCode}`;

  const trainerStats = {
    name: "Trainer Arjun",
    totalReferrals: 8,
    activeSubscribers: 3,
    rewardsEarned: 1,
    targetForNextReward: 5,
  };

  const rewards = [
    { id: "rw-1", title: "Free Daily Post-Workout Protein Bowl Voucher", date: "Unlocked 3 days ago", claimed: false },
  ];

  const handleCopyCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-nutri-bg p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/home" className="text-xs font-semibold text-nutri-muted hover:text-nutri-green flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Customer App
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal mt-1">
            Trainer Partner Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-nutri-muted">
            Transformation Partner & Affiliate Rewards Program
          </p>
        </div>

        <Badge variant="protein" className="text-xs px-3 py-1 bg-indigo-50 text-indigo-800 border-indigo-200 font-bold self-start sm:self-auto">
          <Dumbbell className="w-3.5 h-3.5 mr-1 text-indigo-600" /> CERTIFIED TRAINER PARTNER
        </Badge>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-nutri-border">
          <span className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider block">Total Referrals</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal mt-1">
            {trainerStats.totalReferrals}
          </div>
          <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Client scans</span>
        </Card>

        <Card className="p-4 border-nutri-border">
          <span className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider block">Active Subscribers</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-green mt-1">
            {trainerStats.activeSubscribers}
          </div>
          <span className="text-[10px] text-nutri-muted font-medium mt-0.5 block">NutriFlexs Pass users</span>
        </Card>

        <Card className="p-4 border-nutri-border">
          <span className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider block">Rewards Earned</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-amber-600 mt-1">
            {trainerStats.rewardsEarned}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">Free post-workout meals</span>
        </Card>

        <Card className="p-4 border-nutri-border">
          <span className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider block">Client Discount</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-indigo-600 mt-1">
            10% OFF
          </div>
          <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 block">On daily fuel & pass</span>
        </Card>
      </div>

      {/* Reward Progress Milestone Card */}
      <Card className="p-6 bg-gradient-to-r from-nutri-green to-emerald-900 text-white rounded-3xl shadow-float space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-bold font-heading text-white">Next Reward Milestone</h3>
          </div>
          <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full text-white">
            {trainerStats.activeSubscribers} / {trainerStats.targetForNextReward} Active Subscribers
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-black/30 h-3 rounded-full overflow-hidden p-0.5">
          <div
            className="bg-amber-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${(trainerStats.activeSubscribers / trainerStats.targetForNextReward) * 100}%` }}
          />
        </div>

        <p className="text-xs text-emerald-100">
          🎉 Get <span className="font-bold text-white font-heading">2 more active subscriber clients</span> to unlock your next free Daily Post-Workout Juice OR Protein Bowl!
        </p>
      </Card>

      {/* Referral Code & QR Code Generation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 space-y-4">
          <h3 className="text-base font-bold font-heading text-nutri-charcoal">Your Client Referral Code</h3>
          <p className="text-xs text-nutri-muted leading-relaxed">
            Share your unique code with your gym clients. They get 10% off their daily post-workout orders & subscriptions, and you earn free fuel.
          </p>

          <div className="flex items-center gap-2">
            <div className="bg-nutri-bg border border-nutri-border px-4 py-3 rounded-2xl flex-1 font-mono font-extrabold text-lg text-nutri-green tracking-wider text-center">
              {referralCode}
            </div>

            <Button onClick={handleCopyCode} variant="primary" size="md" className="font-bold text-xs shrink-0">
              {copied ? <Check className="w-4 h-4 mr-1 text-emerald-300" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? "COPIED" : "COPY CODE"}
            </Button>
          </div>
        </Card>

        {/* QR Code Scanner Display */}
        <Card className="p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="p-3 bg-white border border-nutri-border rounded-2xl shadow-sm shrink-0">
            <QRCodeSVG value={referralUrl} size={130} level="H" includeMargin={false} />
          </div>

          <div className="space-y-2 text-center sm:text-left">
            <span className="text-[10px] font-bold text-nutri-green uppercase tracking-widest bg-nutri-green-light px-2.5 py-0.5 rounded-full border border-nutri-green-soft">
              CLIENT SCAN QR
            </span>
            <h4 className="font-bold text-nutri-charcoal text-sm">Scan to Apply 10% Discount</h4>
            <p className="text-xs text-nutri-muted leading-relaxed">
              Clients can scan this QR code directly on their phones right after their workout to open NutriFlexs with your referral auto-applied.
            </p>
          </div>
        </Card>
      </div>

      {/* Rewards History */}
      <Card className="p-6 space-y-4">
        <h3 className="text-base font-bold font-heading text-nutri-charcoal border-b border-nutri-border-light pb-2">
          Earned Trainer Vouchers & Rewards
        </h3>

        <div className="space-y-3">
          {rewards.map((rw) => (
            <div key={rw.id} className="flex items-center justify-between p-3.5 bg-amber-50 rounded-2xl border border-amber-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-950 text-xs sm:text-sm">{rw.title}</h4>
                  <p className="text-[11px] text-amber-800">{rw.date}</p>
                </div>
              </div>

              <Button size="sm" variant="gold" className="text-xs font-bold rounded-full">
                CLAIM VOUCHER
              </Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
