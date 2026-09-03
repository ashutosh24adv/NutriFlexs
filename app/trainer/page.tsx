"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { Dumbbell, Copy, Check, Trophy, ChevronLeft, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TrainerDashboard() {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [trainerData, setTrainerData] = useState<{
    name: string;
    referralCode: string;
    totalReferrals: number;
    activeSubscribers: number;
    rewardsEarned: number;
    referrals: any[];
    rewards: any[];
  }>({
    name: "Trainer Arjun",
    referralCode: "NUTRI-ARJUN",
    totalReferrals: 8,
    activeSubscribers: 3,
    rewardsEarned: 1,
    referrals: [],
    rewards: [],
  });

  async function fetchTrainerData() {
    setLoading(true);
    try {
      const res = await fetch("/api/trainer");
      const data = await res.json();
      if (data.success && data.trainer) {
        setTrainerData({
          name: data.trainer.name,
          referralCode: data.trainer.referralCode,
          totalReferrals: data.trainer.totalReferrals,
          activeSubscribers: data.trainer.activeSubscribers,
          rewardsEarned: data.trainer.rewardsEarned,
          referrals: data.trainer.referrals || [],
          rewards: data.trainer.rewards || [],
        });
      }
    } catch (e) {
      console.error("Failed to load trainer stats from PostgreSQL", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTrainerData();
  }, []);

  const referralUrl = `https://nutriflexs.com/signup?ref=${trainerData.referralCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(trainerData.referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-nutri-bg p-4 sm:p-6 lg:p-8 space-y-6 max-w-5xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/home" className="text-xs font-semibold text-nutri-secondary hover:text-nutri-green flex items-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Customer App
            </Link>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal mt-1">
            {trainerData.name}&apos;s Partner Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-nutri-secondary">
            Transformation Partner & Affiliate Rewards Program • PostgreSQL Live Data
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTrainerData}
            className="p-2 rounded-xl bg-white border border-nutri-border text-nutri-secondary hover:text-nutri-green transition-colors cursor-pointer"
            title="Refresh Live Referral Stats"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Badge variant="protein" className="text-xs px-3 py-1 bg-indigo-50 text-indigo-800 border-indigo-200 font-bold">
            <Dumbbell className="w-3.5 h-3.5 mr-1 text-indigo-600" /> CERTIFIED TRAINER PARTNER
          </Badge>
        </div>
      </div>

      {/* KPI Stats Grid (Loaded from PostgreSQL Trainer & Referral Tables) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 border-nutri-border bg-white">
          <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Total Referrals</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal mt-1">
            {trainerData.totalReferrals}
          </div>
          <span className="text-[10px] text-nutri-green font-semibold mt-0.5 block">Client scans recorded</span>
        </Card>

        <Card className="p-4 border-nutri-border bg-white">
          <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Active Subscribers</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-green mt-1">
            {trainerData.activeSubscribers}
          </div>
          <span className="text-[10px] text-nutri-secondary font-medium mt-0.5 block">NutriFlexs Pass users</span>
        </Card>

        <Card className="p-4 border-nutri-border bg-white">
          <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Rewards Earned</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-amber-600 mt-1">
            {trainerData.rewardsEarned}
          </div>
          <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">Free post-workout meals</span>
        </Card>

        <Card className="p-4 border-nutri-border bg-white">
          <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider block">Client Discount</span>
          <div className="text-2xl sm:text-3xl font-extrabold font-heading text-indigo-600 mt-1">
            10% OFF
          </div>
          <span className="text-[10px] text-indigo-600 font-semibold mt-0.5 block">Applied server-side</span>
        </Card>
      </div>

      {/* Referral Code & QR Code Card */}
      <Card className="p-6 border-nutri-border bg-white rounded-3xl shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-3 max-w-md">
            <h3 className="text-lg font-extrabold font-heading text-nutri-charcoal">
              Your Personal Referral Code & QR
            </h3>
            <p className="text-xs text-nutri-secondary leading-relaxed">
              Share your code with gym clients. When they enter <span className="font-bold text-nutri-green">{trainerData.referralCode}</span> at checkout, they get <span className="font-bold text-nutri-green">10% OFF</span>, and you earn free meal rewards!
            </p>

            <div className="flex items-center gap-2 pt-1">
              <div className="bg-nutri-green-soft border border-nutri-border px-4 py-2.5 rounded-2xl font-mono text-sm font-extrabold text-nutri-green tracking-widest">
                {trainerData.referralCode}
              </div>
              <Button
                onClick={handleCopyCode}
                size="md"
                className="bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs rounded-2xl cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 mr-1 stroke-[3]" /> : <Copy className="w-4 h-4 mr-1" />}
                {copied ? "Copied!" : "Copy Code"}
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center bg-nutri-green-soft p-4 rounded-2xl border border-nutri-border shrink-0">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-nutri-border-light">
              <QRCodeSVG value={referralUrl} size={130} level="M" />
            </div>
            <span className="text-[10px] font-bold text-nutri-green mt-2 uppercase tracking-wider">
              Scan to Register Client
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}
