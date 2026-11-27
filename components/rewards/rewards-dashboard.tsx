"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Zap,
  CheckCircle2,
  CalendarCheck,
  Utensils,
  Droplets,
  ShoppingBag,
  Gift,
  Copy,
  Check,
  ArrowRight,
  Clock,
  Sparkles,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";

interface SevenDayItem {
  dateKey: string;
  label: string;
  checkedIn: boolean;
  isToday: boolean;
}

interface RewardRule {
  id: string;
  activityType: string;
  label: string;
  description: string | null;
  points: number;
  rupeesPerPoint: number | null;
  enabled: boolean;
}

interface RewardCatalogueItem {
  id: string;
  name: string;
  description: string | null;
  pointsRequired: number;
  discountAmount: number;
  minimumOrderValue: number;
  expiryDays: number;
  enabled: boolean;
}

interface RedemptionItem {
  id: string;
  couponCode: string;
  pointsSpent: number;
  discountAmount: number;
  status: string;
  expiresAt: string;
  createdAt: string;
  reward: {
    name: string;
    minimumOrderValue: number;
  };
}

interface RewardTransactionItem {
  id: string;
  type: "EARNED" | "REDEEMED" | "REVERSED" | "ADJUSTED";
  source: string;
  points: number;
  description: string;
  createdAt: string;
}

interface DashboardData {
  account: {
    availableBalance: number;
    lifetimeEarned: number;
    lifetimeRedeemed: number;
  };
  nextReward: {
    id: string;
    name: string;
    pointsRequired: number;
    pointsNeeded: number;
    progressPercent: number;
  } | null;
  dailyCheckIn: {
    checkedInToday: boolean;
    sevenDayHistory: SevenDayItem[];
  };
  activities: {
    dailyCheckInCompleted: boolean;
    mealLoggingCompleted: boolean;
    waterGoalCompleted: boolean;
    todayFoodCount: number;
    totalWaterMl: number;
    waterGoalMl: number;
  };
  rules: RewardRule[];
  catalogue: RewardCatalogueItem[];
  redemptions: RedemptionItem[];
  transactions: RewardTransactionItem[];
}

export function RewardsDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(false);
  const [checkInToast, setCheckInToast] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [confirmReward, setConfirmReward] = useState<RewardCatalogueItem | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState<{
    couponCode: string;
    rewardName: string;
    discountAmount: number;
  } | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/rewards", { cache: "no-store" });
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setErrorMsg(json.error || "Unable to load FuelPoints");
      }
    } catch {
      setErrorMsg("Network error loading FuelPoints");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const notifyNavbar = () => {
    window.dispatchEvent(new CustomEvent("nutriflexs:rewards-updated"));
  };

  const handleDailyCheckIn = async () => {
    if (checkingIn || data?.dailyCheckIn.checkedInToday) return;
    setCheckingIn(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/rewards/check-in", { method: "POST" });
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Check-in failed");
      } else {
        const earned = json.data?.pointsEarned ?? 5;
        setCheckInToast(
          json.data?.alreadyCheckedIn
            ? "Already checked in today!"
            : `+${earned} FP earned for today's check-in!`
        );
        await loadDashboard();
        notifyNavbar();
        setTimeout(() => setCheckInToast(null), 4000);
      }
    } catch {
      setErrorMsg("Network error during check-in");
    } finally {
      setCheckingIn(false);
    }
  };

  const handleConfirmRedeem = async () => {
    if (!confirmReward || redeeming) return;
    setRedeeming(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/rewards/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rewardId: confirmReward.id }),
      });
      const json = await res.json();
      if (!json.success) {
        setErrorMsg(json.error || "Failed to redeem reward");
      } else {
        setRedeemSuccess({
          couponCode: json.data.couponCode,
          rewardName: confirmReward.name,
          discountAmount: confirmReward.discountAmount,
        });
        setConfirmReward(null);
        await loadDashboard();
        notifyNavbar();
      }
    } catch {
      setErrorMsg("Network error redeeming reward");
    } finally {
      setRedeeming(false);
    }
  };

  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // Clipboard fallback ignored
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-6">
        <div className="h-44 rounded-3xl bg-[#F3F7EE] animate-pulse border border-[#E5E7E2]" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-52 rounded-3xl bg-white animate-pulse border border-[#E5E7E2]" />
          <div className="h-52 rounded-3xl bg-white animate-pulse border border-[#E5E7E2]" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-sm font-semibold text-rose-600">{errorMsg || "Unable to load FuelPoints."}</p>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            loadDashboard();
          }}
          className="px-4 py-2 rounded-full bg-[#2F7D16] text-white text-xs font-bold cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  const checkInRule = data.rules.find((r) => r.activityType === "DAILY_CHECK_IN");
  const mealRule = data.rules.find((r) => r.activityType === "MEAL_LOGGING");
  const waterRule = data.rules.find((r) => r.activityType === "WATER_GOAL");
  const purchaseRule = data.rules.find((r) => r.activityType === "FOOD_PURCHASE");

  const activeRedemptions = data.redemptions.filter((r) => r.status === "ISSUED");
  const visibleTransactions = showAllHistory
    ? data.transactions
    : data.transactions.slice(0, 8);

  return (
    <div className="min-h-screen bg-[#FCFDFC] pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 space-y-6">
        {/* Top Feedback Banner */}
        {errorMsg && (
          <div className="px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center justify-between">
            <span>{errorMsg}</span>
            <button type="button" onClick={() => setErrorMsg(null)} className="cursor-pointer">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {checkInToast && (
          <div className="px-4 py-3 rounded-2xl bg-[#EAF4E3] border border-[#CFE5C3] text-xs font-bold text-[#24630F] flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{checkInToast}</span>
          </div>
        )}

        {redeemSuccess && (
          <div className="p-4 rounded-2xl bg-[#EAF4E3] border border-[#2F7D16]/30 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <p className="text-xs font-extrabold text-[#24630F]">
                Reward Unlocked: {redeemSuccess.rewardName}
              </p>
              <p className="text-[11px] text-[#24630F]/80">
                Use code <span className="font-mono font-bold">{redeemSuccess.couponCode}</span> at checkout for ₹{redeemSuccess.discountAmount} off.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleCopyCode(redeemSuccess.couponCode)}
                className="px-3 py-1.5 rounded-full bg-white border border-[#CFE5C3] text-xs font-bold text-[#24630F] flex items-center gap-1.5 cursor-pointer"
              >
                {copiedCode === redeemSuccess.couponCode ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Code
                  </>
                )}
              </button>
              <Link
                href="/menu"
                className="px-3.5 py-1.5 rounded-full bg-[#2F7D16] hover:bg-[#24630F] text-white text-xs font-bold flex items-center gap-1"
              >
                Order Now <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        )}

        {/* SECTION A: FuelPoints Balance Hero Card */}
        <Card className="p-6 sm:p-7 rounded-3xl border-[#E5E7E2] bg-gradient-to-br from-[#F3F7EE] via-white to-[#EAF4E3]/60 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EAF4E3] border border-[#CFE5C3] text-[#24630F] text-[11px] font-bold">
                <Zap className="w-3.5 h-3.5 fill-current" />
                FuelPoints Balance
              </div>
              <div className="flex items-baseline gap-2.5">
                <span className="text-4xl sm:text-5xl font-extrabold font-heading text-[#111111] tabular-nums">
                  {data.account.availableBalance.toLocaleString("en-IN")}
                </span>
                <span className="text-lg font-extrabold text-[#2F7D16]">FP</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-xs text-[#6B7280] font-medium">
                <span>
                  Lifetime earned:{" "}
                  <strong className="text-[#111111] tabular-nums">
                    {data.account.lifetimeEarned.toLocaleString("en-IN")} FP
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Redeemed:{" "}
                  <strong className="text-[#111111] tabular-nums">
                    {data.account.lifetimeRedeemed.toLocaleString("en-IN")} FP
                  </strong>
                </span>
              </div>
            </div>

            {data.nextReward && (
              <div className="w-full md:w-72 p-4 rounded-2xl bg-white border border-[#E5E7E2] space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#111111]">
                    Next: {data.nextReward.name}
                  </span>
                  <span className="font-bold text-[#2F7D16] tabular-nums">
                    {data.nextReward.progressPercent}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-[#EAF4E3] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-[#2F7D16] transition-all duration-500"
                    style={{ width: `${data.nextReward.progressPercent}%` }}
                  />
                </div>
                <p className="text-[11px] text-[#6B7280]">
                  {data.nextReward.pointsNeeded === 0
                    ? "Ready to redeem!"
                    : `${data.nextReward.pointsNeeded} FP away from your next reward`}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* SECTION B & C: Daily Check-In + Earn FuelPoints */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* SECTION B: Daily Check-In */}
          <Card className="lg:col-span-5 p-6 rounded-3xl border-[#E5E7E2] bg-white flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-2xl bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center">
                    <CalendarCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold font-heading text-[#111111]">
                      Daily Check-In
                    </h2>
                    <p className="text-xs text-[#6B7280]">
                      +{checkInRule?.points ?? 5} FP once every day
                    </p>
                  </div>
                </div>
                {data.dailyCheckIn.checkedInToday && (
                  <span className="px-2.5 py-1 rounded-full bg-[#EAF4E3] text-[#24630F] text-[11px] font-bold">
                    Done Today
                  </span>
                )}
              </div>

              {/* 7-Day Check-In Strip */}
              <div className="pt-2">
                <p className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider mb-2.5">
                  Last 7 Days
                </p>
                <div className="grid grid-cols-7 gap-1.5">
                  {data.dailyCheckIn.sevenDayHistory.map((day) => (
                    <div
                      key={day.dateKey}
                      className={`flex flex-col items-center py-2 rounded-xl border text-center ${
                        day.checkedIn
                          ? "bg-[#EAF4E3] border-[#CFE5C3] text-[#24630F]"
                          : day.isToday
                            ? "bg-[#FCFDFC] border-[#2F7D16]/40 text-[#111111]"
                            : "bg-[#FCFDFC] border-[#E5E7E2] text-[#6B7280]"
                      }`}
                    >
                      <span className="text-[10px] font-bold">{day.label}</span>
                      <div className="mt-1">
                        {day.checkedIn ? (
                          <CheckCircle2 className="w-4 h-4 text-[#2F7D16]" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border border-dashed border-[#CBD5E1]" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={data.dailyCheckIn.checkedInToday || checkingIn}
              onClick={handleDailyCheckIn}
              className={`w-full py-3 rounded-full text-xs font-bold transition-all cursor-pointer ${
                data.dailyCheckIn.checkedInToday
                  ? "bg-[#EAF4E3] text-[#24630F] cursor-default"
                  : "bg-[#2F7D16] hover:bg-[#24630F] text-white shadow-xs"
              } disabled:opacity-80`}
            >
              {checkingIn
                ? "Checking in..."
                : data.dailyCheckIn.checkedInToday
                  ? "Checked In Today ✓"
                  : `Check In Now (+${checkInRule?.points ?? 5} FP)`}
            </button>
          </Card>

          {/* SECTION C: Earn FuelPoints */}
          <Card className="lg:col-span-7 p-6 rounded-3xl border-[#E5E7E2] bg-white space-y-4">
            <div>
              <h2 className="text-base font-extrabold font-heading text-[#111111]">
                Earn FuelPoints Today
              </h2>
              <p className="text-xs text-[#6B7280]">
                Simple daily habits and food orders automatically credit your balance.
              </p>
            </div>

            <div className="space-y-3">
              {/* Meal Logging */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[#E5E7E2] bg-[#FCFDFC]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center shrink-0">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#111111]">Log Daily Meals</div>
                    <div className="text-xs text-[#6B7280] truncate">
                      +{mealRule?.points ?? 10} FP once per day when you log a meal
                    </div>
                  </div>
                </div>
                {data.activities.mealLoggingCompleted ? (
                  <span className="px-3 py-1 rounded-full bg-[#EAF4E3] text-[#24630F] text-xs font-bold shrink-0">
                    Completed ✓
                  </span>
                ) : (
                  <Link
                    href="/nutrition"
                    className="px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7E2] hover:border-[#2F7D16] text-xs font-bold text-[#111111] shrink-0"
                  >
                    Log Meal
                  </Link>
                )}
              </div>

              {/* Water Goal */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[#E5E7E2] bg-[#FCFDFC]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center shrink-0">
                    <Droplets className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#111111]">Complete Water Goal</div>
                    <div className="text-xs text-[#6B7280] truncate">
                      +{waterRule?.points ?? 10} FP ({data.activities.totalWaterMl} / {data.activities.waterGoalMl} ml today)
                    </div>
                  </div>
                </div>
                {data.activities.waterGoalCompleted ? (
                  <span className="px-3 py-1 rounded-full bg-[#EAF4E3] text-[#24630F] text-xs font-bold shrink-0">
                    Completed ✓
                  </span>
                ) : (
                  <Link
                    href="/nutrition"
                    className="px-3.5 py-1.5 rounded-full bg-white border border-[#E5E7E2] hover:border-[#2F7D16] text-xs font-bold text-[#111111] shrink-0"
                  >
                    Track Water
                  </Link>
                )}
              </div>

              {/* Food Purchase */}
              <div className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-[#E5E7E2] bg-[#F3F7EE]/60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[#111111]">Order NutriFlexs Food</div>
                    <div className="text-xs text-[#6B7280]">
                      Earn 1 FP per ₹{purchaseRule?.rupeesPerPoint ?? 10} on every paid meal order
                    </div>
                  </div>
                </div>
                <Link
                  href="/menu"
                  className="px-3.5 py-1.5 rounded-full bg-[#2F7D16] hover:bg-[#24630F] text-white text-xs font-bold shrink-0"
                >
                  Order Food
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* SECTION D: Redeem Rewards */}
        <Card className="p-6 rounded-3xl border-[#E5E7E2] bg-white space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-extrabold font-heading text-[#111111] flex items-center gap-2">
                <Gift className="w-5 h-5 text-[#2F7D16]" />
                Redeem FuelPoints
              </h2>
              <p className="text-xs text-[#6B7280]">
                Exchange your FuelPoints for instant single-use checkout discount coupons.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {data.catalogue.map((item) => {
              const canAfford = data.account.availableBalance >= item.pointsRequired;
              return (
                <div
                  key={item.id}
                  className="p-5 rounded-2xl border border-[#E5E7E2] bg-[#FCFDFC] flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-lg font-extrabold font-heading text-[#111111]">
                        {item.name}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#EAF4E3] text-[#24630F] text-xs font-extrabold tabular-nums">
                        {item.pointsRequired} FP
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280]">
                      ₹{item.discountAmount} off on orders above ₹{item.minimumOrderValue} • Valid {item.expiryDays} days
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => setConfirmReward(item)}
                    className={`w-full py-2.5 rounded-full text-xs font-bold transition-all ${
                      canAfford
                        ? "bg-[#2F7D16] hover:bg-[#24630F] text-white cursor-pointer"
                        : "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed"
                    }`}
                  >
                    {canAfford
                      ? "Redeem Reward"
                      : `Need ${item.pointsRequired - data.account.availableBalance} more FP`}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Active Redeemed Coupons */}
          {activeRedemptions.length > 0 && (
            <div className="pt-3 border-t border-[#E5E7E2] space-y-2.5">
              <p className="text-xs font-bold text-[#111111]">Your Active Reward Coupons</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeRedemptions.map((red) => (
                  <div
                    key={red.id}
                    className="p-3.5 rounded-2xl bg-[#F3F7EE] border border-[#CFE5C3] flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-extrabold text-[#24630F]">
                        {red.reward.name} • <span className="font-mono">{red.couponCode}</span>
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        Min ₹{red.reward.minimumOrderValue} • Expires{" "}
                        {new Date(red.expiresAt).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(red.couponCode)}
                      className="px-3 py-1.5 rounded-full bg-white border border-[#CFE5C3] text-[11px] font-bold text-[#24630F] flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      {copiedCode === red.couponCode ? (
                        <>
                          <Check className="w-3 h-3" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* SECTION E: Points History */}
        <Card className="p-6 rounded-3xl border-[#E5E7E2] bg-white space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold font-heading text-[#111111] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#2F7D16]" />
              Points History
            </h2>
            {data.transactions.length > 8 && (
              <button
                type="button"
                onClick={() => setShowAllHistory((v) => !v)}
                className="text-xs font-bold text-[#2F7D16] hover:underline cursor-pointer"
              >
                {showAllHistory ? "Show Less" : `View All (${data.transactions.length})`}
              </button>
            )}
          </div>

          {visibleTransactions.length === 0 ? (
            <p className="text-xs text-[#6B7280] py-6 text-center">
              No FuelPoints activity yet. Check in today to earn your first +5 FP!
            </p>
          ) : (
            <div className="divide-y divide-[#E5E7E2]">
              {visibleTransactions.map((tx) => (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-xs sm:text-sm font-bold text-[#111111] truncate">
                      {tx.description}
                    </div>
                    <div className="text-[11px] text-[#6B7280]">
                      {new Date(tx.createdAt).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                  <span
                    className={`text-xs sm:text-sm font-extrabold tabular-nums shrink-0 ${
                      tx.points >= 0 ? "text-[#2F7D16]" : "text-rose-600"
                    }`}
                  >
                    {tx.points >= 0 ? `+${tx.points}` : tx.points} FP
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Confirmation Modal */}
      {confirmReward && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-3xl bg-white border border-[#E5E7E2] p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-extrabold font-heading text-[#111111]">
              Confirm Redemption
            </h3>
            <p className="text-sm text-[#6B7280]">
              Spend{" "}
              <strong className="text-[#111111]">
                {confirmReward.pointsRequired} FP
              </strong>{" "}
              to unlock{" "}
              <strong className="text-[#2F7D16]">{confirmReward.name}</strong>? A
              single-use coupon code will be issued to your account immediately.
            </p>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={redeeming}
                onClick={() => setConfirmReward(null)}
                className="px-4 py-2 rounded-full border border-[#E5E7E2] text-xs font-bold text-[#111111] cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={redeeming}
                onClick={handleConfirmRedeem}
                className="px-5 py-2 rounded-full bg-[#2F7D16] hover:bg-[#24630F] text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                {redeeming ? "Redeeming..." : "Confirm & Redeem"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
