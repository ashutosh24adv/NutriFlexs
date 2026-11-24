"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { signOut } from "next-auth/react";
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import {
  LayoutDashboard,
  Users,
  Trophy,
  QrCode,
  UserCircle,
  LogOut,
  Copy,
  Check,
  Download,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  X,
  Dumbbell,
  Calendar,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Menu,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type NavTab = "overview" | "referrals" | "rewards" | "qr" | "profile";

interface TrainerProfileInfo {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  partnerStatus: string;
  joinedAt: string;
  referralCode: string;
  clientDiscountPercent: number;
  totalReferrals: number;
  activeSubscribers: number;
  rewardsEarned: number;
  pendingRewards: number;
  redeemedRewards: number;
  progressToNextReward: number;
}

interface ReferralRow {
  id: string;
  customerId: string;
  clientName: string;
  email: string;
  phone: string | null;
  joinedOn: string;
  codeUsed: string;
  passPlan: string;
  subscriptionStatus: "ACTIVE" | "EXPIRED" | "PENDING" | "CANCELLED";
  hasFirstOrder: boolean;
  firstOrderDate: string | null;
  totalOrders: number;
  rewardsContribution: number;
  discountApplied: number;
}

interface RewardRow {
  id: string;
  rewardTitle: string;
  status: "PENDING" | "REDEEMED";
  isClaimed: boolean;
  earnedAt: string;
  claimedAt: string | null;
  milestoneSource: string;
}

export default function TrainerPortalPage() {
  const [activeTab, setActiveTab] = useState<NavTab>("overview");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [trainer, setTrainer] = useState<TrainerProfileInfo | null>(null);
  const [referrals, setReferrals] = useState<ReferralRow[]>([]);
  const [rewards, setRewards] = useState<RewardRow[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Filters & Search
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dateFilter, setDateFilter] = useState("ALL");
  const [sortBy, setSortBy] = useState("newest");
  const [page, setPage] = useState(1);

  // Copy & QR Download
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const qrCanvasWrapperRef = useRef<HTMLDivElement>(null);

  // Referral Detail Drawer
  const [selectedReferralId, setSelectedReferralId] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [referralDetail, setReferralDetail] = useState<any | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Profile Edit State
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPortalData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
        dateRange: dateFilter,
        sort: sortBy,
        page: String(page),
        limit: "10",
      });
      const res = await fetch(`/api/trainer?${params.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load trainer portal");
      }

      setTrainer(data.trainer);
      setReferrals(data.referrals || []);
      setRewards(data.rewards || []);
      setPagination(data.pagination || { page: 1, limit: 10, total: 0, totalPages: 1 });
      setEditName(data.trainer.name || "");
      setEditPhone(data.trainer.phone || "");
    } catch (err: any) {
      setError(err.message || "Unable to load trainer dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, dateFilter, sortBy, page]);

  useEffect(() => {
    fetchPortalData();
  }, [fetchPortalData]);

  const openReferralDetail = async (id: string) => {
    setSelectedReferralId(id);
    setDetailLoading(true);
    setDetailError(null);
    setReferralDetail(null);
    try {
      const res = await fetch(`/api/trainer/referrals/${id}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to load referral details");
      }
      setReferralDetail(data.detail);
    } catch (err: any) {
      setDetailError(err.message || "Unable to fetch referral details");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    try {
      const res = await fetch("/api/trainer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to update profile");
      }
      setProfileNotice({ type: "success", text: "Partner profile updated successfully." });
      fetchPortalData();
    } catch (err: any) {
      setProfileNotice({ type: "error", text: err.message || "Update failed." });
    } finally {
      setSavingProfile(false);
    }
  };

  const origin =
    typeof window !== "undefined" ? window.location.origin : "https://nutriflexs.com";
  const referralUrl = trainer
    ? `${origin}/signup?ref=${encodeURIComponent(trainer.referralCode)}`
    : "";

  const handleCopyCode = () => {
    if (!trainer) return;
    navigator.clipboard.writeText(trainer.referralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!referralUrl) return;
    navigator.clipboard.writeText(referralUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadQR = () => {
    const canvas = qrCanvasWrapperRef.current?.querySelector("canvas");
    if (!canvas || !trainer) return;
    const pngUrl = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = pngUrl;
    link.download = `NutriFlexs-QR-${trainer.referralCode}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (iso?: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-[#EAF4E3] text-[#2F7D16] border-[#2F7D16]/25";
      case "EXPIRED":
        return "bg-amber-50 text-amber-800 border-amber-200";
      case "CANCELLED":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-neutral-100 text-neutral-700 border-neutral-200";
    }
  };

  const navItems: Array<{ id: NavTab; label: string; icon: any }> = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "referrals", label: "My Referrals", icon: Users },
    { id: "rewards", label: "Rewards", icon: Trophy },
    { id: "qr", label: "Referral QR & Code", icon: QrCode },
    { id: "profile", label: "Profile", icon: UserCircle },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7FAF4]">
      {/* Desktop Dedicated Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-[#E5E7E2] z-30">
        <div className="p-5 border-b border-[#E5E7E2] space-y-2">
          <NutriFlexsLogo size="md" />
          <Badge className="bg-[#EAF4E3] text-[#2F7D16] border border-[#2F7D16]/20 text-[10px] font-extrabold tracking-wider">
            <Dumbbell className="w-3 h-3 mr-1" /> TRAINER PARTNER PORTAL
          </Badge>
        </div>

        <nav className="flex-1 p-3.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer",
                  active
                    ? "bg-[#2F7D16] text-white shadow-xs"
                    : "text-[#4B5563] hover:bg-[#EAF4E3]/60 hover:text-[#111111]"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-[#E5E7E2]">
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login?staff=true&portal=trainer" })}
            className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 bg-white border-b border-[#E5E7E2] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <NutriFlexsLogo size="sm" />
          <span className="text-[10px] font-extrabold uppercase tracking-wider bg-[#EAF4E3] text-[#2F7D16] px-2 py-0.5 rounded-full">
            Trainer
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          className="p-2 rounded-xl border border-[#E5E7E2] text-[#111111]"
          aria-label="Toggle Trainer Menu"
        >
          {mobileNavOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Navigation Drawer */}
      {mobileNavOpen && (
        <div className="lg:hidden bg-white border-b border-[#E5E7E2] px-4 py-3 space-y-1 z-20">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setMobileNavOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold",
                  activeTab === item.id
                    ? "bg-[#2F7D16] text-white"
                    : "text-[#4B5563] hover:bg-[#F7FAF4]"
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => signOut({ callbackUrl: "/login?staff=true&portal=trainer" })}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      )}

      {/* Main Trainer Workspace */}
      <main className="flex-1 lg:pl-64">
        <div className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Workspace Top Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-[#111111]">
                {activeTab === "overview" &&
                  `${trainer?.name ? `${trainer.name}'s` : "Trainer"} Partner Dashboard`}
                {activeTab === "referrals" && "My Referrals"}
                {activeTab === "rewards" && "Rewards & Meal Vouchers"}
                {activeTab === "qr" && "Referral QR & Shareable Code"}
                {activeTab === "profile" && "Trainer Partner Profile"}
              </h1>
              <p className="text-xs sm:text-sm text-[#4B5563]">
                Transformation Partner &amp; Affiliate Rewards Program
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              {trainer && (
                <div className="hidden sm:flex items-center gap-2 bg-white border border-[#E5E7E2] px-3 py-1.5 rounded-xl text-xs">
                  <span className="text-[#4B5563]">Code:</span>
                  <span className="font-mono font-extrabold text-[#2F7D16]">
                    {trainer.referralCode}
                  </span>
                </div>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchPortalData}
                className="bg-white border-[#E5E7E2] text-xs font-bold rounded-xl cursor-pointer"
              >
                <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Loading Skeleton */}
          {loading && !trainer ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-28 rounded-3xl bg-white border border-[#E5E7E2] animate-pulse"
                />
              ))}
            </div>
          ) : (
            trainer && (
              <>
                {/* ================= OVERVIEW TAB ================= */}
                {activeTab === "overview" && (
                  <div className="space-y-6">
                    {/* 4 Top Summary Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card className="p-5 bg-white border border-[#E5E7E2] rounded-3xl shadow-2xs">
                        <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
                          Total Referrals
                        </span>
                        <div className="text-2xl sm:text-3xl font-extrabold font-heading text-[#111111] mt-1.5">
                          {trainer.totalReferrals}
                        </div>
                        <span className="text-[11px] text-[#2F7D16] font-semibold mt-1 block">
                          Verified client registrations
                        </span>
                      </Card>

                      <Card className="p-5 bg-white border border-[#E5E7E2] rounded-3xl shadow-2xs">
                        <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
                          Active Subscribers
                        </span>
                        <div className="text-2xl sm:text-3xl font-extrabold font-heading text-[#2F7D16] mt-1.5">
                          {trainer.activeSubscribers}
                        </div>
                        <span className="text-[11px] text-[#4B5563] font-medium mt-1 block">
                          Active NutriFlexs Pass holders
                        </span>
                      </Card>

                      <Card className="p-5 bg-white border border-[#E5E7E2] rounded-3xl shadow-2xs">
                        <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
                          Rewards Earned
                        </span>
                        <div className="text-2xl sm:text-3xl font-extrabold font-heading text-amber-600 mt-1.5">
                          {trainer.rewardsEarned}
                        </div>
                        <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
                          Free post-workout meals ({trainer.pendingRewards} pending)
                        </span>
                      </Card>

                      <Card className="p-5 bg-white border border-[#E5E7E2] rounded-3xl shadow-2xs">
                        <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider block">
                          Client Discount
                        </span>
                        <div className="text-2xl sm:text-3xl font-extrabold font-heading text-[#2F7D16] mt-1.5">
                          {trainer.clientDiscountPercent}% OFF
                        </div>
                        <span className="text-[11px] text-[#4B5563] font-medium mt-1 block">
                          Applied server-side on orders
                        </span>
                      </Card>
                    </div>

                    {/* Referral Code & QR Card */}
                    <Card className="p-6 bg-white border border-[#E5E7E2] rounded-3xl shadow-2xs">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="space-y-3 max-w-lg">
                          <Badge className="bg-[#EAF4E3] text-[#2F7D16] border-none text-[11px] font-bold">
                            <Sparkles className="w-3 h-3 mr-1" /> 10% Client Discount Active
                          </Badge>
                          <h2 className="text-lg sm:text-xl font-extrabold font-heading text-[#111111]">
                            Your Personal Referral Code &amp; QR
                          </h2>
                          <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                            Share your QR code or referral code{" "}
                            <strong className="text-[#2F7D16] font-mono">
                              {trainer.referralCode}
                            </strong>{" "}
                            with gym clients. They get <strong>10% OFF</strong> eligible orders, and you earn 1 free post-workout meal voucher for every 5 active subscribers.
                          </p>

                          <div className="flex flex-wrap items-center gap-2.5 pt-1">
                            <div className="bg-[#EAF4E3] border border-[#2F7D16]/25 px-4 py-2.5 rounded-2xl font-mono text-sm font-extrabold text-[#2F7D16] tracking-wider">
                              {trainer.referralCode}
                            </div>
                            <Button
                              type="button"
                              onClick={handleCopyCode}
                              className="bg-[#2F7D16] hover:bg-[#24630F] text-white text-xs font-bold rounded-2xl px-4 py-2.5 cursor-pointer"
                            >
                              {copiedCode ? (
                                <>
                                  <Check className="w-3.5 h-3.5 mr-1.5" /> Copied
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Code
                                </>
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleDownloadQR}
                              className="border-[#E5E7E2] text-xs font-bold rounded-2xl px-4 py-2.5 cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5 mr-1.5" /> Download QR
                            </Button>
                          </div>
                        </div>

                        <div className="p-4 bg-[#F7FAF4] border border-[#E5E7E2] rounded-3xl flex flex-col items-center gap-2 shrink-0">
                          <QRCodeSVG
                            value={referralUrl}
                            size={140}
                            bgColor="#F7FAF4"
                            fgColor="#111111"
                            level="M"
                          />
                          <span className="text-[10px] font-bold text-[#4B5563]">
                            Scan to Register with {trainer.referralCode}
                          </span>
                        </div>
                      </div>
                    </Card>

                    {/* Recent Referrals Preview */}
                    <Card className="p-6 bg-white border border-[#E5E7E2] rounded-3xl shadow-2xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-heading font-extrabold text-base text-[#111111]">
                            Recent Referrals
                          </h3>
                          <p className="text-xs text-[#4B5563]">
                            Latest clients who registered with your referral code
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setActiveTab("referrals")}
                          className="text-xs font-bold rounded-xl border-[#E5E7E2] cursor-pointer"
                        >
                          View All Referrals
                        </Button>
                      </div>

                      {referrals.length === 0 ? (
                        <div className="py-10 text-center space-y-2 border border-dashed border-[#E5E7E2] rounded-2xl bg-[#F7FAF4]/60">
                          <Users className="w-8 h-8 text-[#4B5563]/50 mx-auto" />
                          <p className="text-sm font-bold text-[#111111]">No referrals yet</p>
                          <p className="text-xs text-[#4B5563] max-w-sm mx-auto">
                            Share your QR code or referral code{" "}
                            <span className="font-mono font-bold text-[#2F7D16]">
                              {trainer.referralCode}
                            </span>{" "}
                            with your clients to start tracking sign-ups and rewards.
                          </p>
                        </div>
                      ) : (
                        <div className="divide-y divide-[#E5E7E2]">
                          {referrals.slice(0, 5).map((ref) => (
                            <div
                              key={ref.id}
                              onClick={() => openReferralDetail(ref.id)}
                              className="py-3 flex items-center justify-between gap-3 hover:bg-[#F7FAF4] px-2 rounded-xl cursor-pointer transition-colors"
                            >
                              <div className="min-w-0">
                                <div className="font-bold text-xs sm:text-sm text-[#111111] truncate">
                                  {ref.clientName}
                                </div>
                                <div className="text-[11px] text-[#4B5563] truncate">
                                  {ref.email} • Joined {formatDate(ref.joinedOn)}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[10px] font-bold",
                                    statusBadge(ref.subscriptionStatus)
                                  )}
                                >
                                  {ref.subscriptionStatus}
                                </Badge>
                                <span className="text-xs font-bold text-[#4B5563]">
                                  {ref.totalOrders} orders
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {/* ================= MY REFERRALS TAB ================= */}
                {activeTab === "referrals" && (
                  <Card className="p-5 sm:p-6 bg-white border border-[#E5E7E2] rounded-3xl shadow-2xs space-y-5">
                    {/* Search & Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="relative">
                        <Search className="w-4 h-4 text-[#4B5563] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          placeholder="Search name or email..."
                          value={search}
                          onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                          }}
                          className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl border border-[#E5E7E2] bg-[#F7FAF4] focus:bg-white focus:border-[#2F7D16] focus:outline-none"
                        />
                      </div>

                      <select
                        value={statusFilter}
                        onChange={(e) => {
                          setStatusFilter(e.target.value);
                          setPage(1);
                        }}
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-[#E5E7E2] bg-[#F7FAF4] text-[#111111] focus:border-[#2F7D16] focus:outline-none"
                      >
                        <option value="ALL">All Subscription Statuses</option>
                        <option value="ACTIVE">Active</option>
                        <option value="PENDING">Pending</option>
                        <option value="EXPIRED">Expired</option>
                        <option value="CANCELLED">Cancelled</option>
                      </select>

                      <select
                        value={dateFilter}
                        onChange={(e) => {
                          setDateFilter(e.target.value);
                          setPage(1);
                        }}
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-[#E5E7E2] bg-[#F7FAF4] text-[#111111] focus:border-[#2F7D16] focus:outline-none"
                      >
                        <option value="ALL">All Registration Dates</option>
                        <option value="7D">Last 7 Days</option>
                        <option value="30D">Last 30 Days</option>
                        <option value="MONTH">This Month</option>
                      </select>

                      <select
                        value={sortBy}
                        onChange={(e) => {
                          setSortBy(e.target.value);
                          setPage(1);
                        }}
                        className="px-3 py-2 text-xs font-bold rounded-xl border border-[#E5E7E2] bg-[#F7FAF4] text-[#111111] focus:border-[#2F7D16] focus:outline-none"
                      >
                        <option value="newest">Sort: Newest First</option>
                        <option value="oldest">Sort: Oldest First</option>
                        <option value="most_active">Sort: Most Active (Orders)</option>
                      </select>
                    </div>

                    {/* Referrals Table */}
                    {referrals.length === 0 ? (
                      <div className="py-12 text-center space-y-2 border border-dashed border-[#E5E7E2] rounded-2xl bg-[#F7FAF4]/60">
                        <Users className="w-8 h-8 text-[#4B5563]/50 mx-auto" />
                        <p className="text-sm font-bold text-[#111111]">
                          No matching referrals found
                        </p>
                        <p className="text-xs text-[#4B5563]">
                          Try adjusting your search or filter criteria.
                        </p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-[#E5E7E2] text-[11px] font-extrabold uppercase tracking-wider text-[#4B5563]">
                              <th className="py-3 pr-4">Client Name</th>
                              <th className="py-3 px-3">Email</th>
                              <th className="py-3 px-3">Phone</th>
                              <th className="py-3 px-3">Joined On</th>
                              <th className="py-3 px-3">Pass / Plan</th>
                              <th className="py-3 px-3">Subscription Status</th>
                              <th className="py-3 px-3">First Order</th>
                              <th className="py-3 px-3 text-right">Total Orders</th>
                              <th className="py-3 pl-3 text-right">Rewards</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#E5E7E2] text-xs">
                            {referrals.map((row) => (
                              <tr
                                key={row.id}
                                onClick={() => openReferralDetail(row.id)}
                                className="hover:bg-[#F7FAF4] cursor-pointer transition-colors"
                              >
                                <td className="py-3.5 pr-4 font-bold text-[#111111] whitespace-nowrap">
                                  {row.clientName}
                                </td>
                                <td className="py-3.5 px-3 text-[#4B5563] whitespace-nowrap">
                                  {row.email}
                                </td>
                                <td className="py-3.5 px-3 text-[#4B5563] whitespace-nowrap">
                                  {row.phone || "—"}
                                </td>
                                <td className="py-3.5 px-3 text-[#4B5563] whitespace-nowrap">
                                  {formatDate(row.joinedOn)}
                                </td>
                                <td className="py-3.5 px-3 font-semibold text-[#111111] whitespace-nowrap">
                                  {row.passPlan}
                                </td>
                                <td className="py-3.5 px-3 whitespace-nowrap">
                                  <Badge
                                    variant="outline"
                                    className={cn(
                                      "text-[10px] font-bold",
                                      statusBadge(row.subscriptionStatus)
                                    )}
                                  >
                                    {row.subscriptionStatus}
                                  </Badge>
                                </td>
                                <td className="py-3.5 px-3 whitespace-nowrap">
                                  {row.hasFirstOrder ? (
                                    <span className="text-[#2F7D16] font-bold">Yes</span>
                                  ) : (
                                    <span className="text-[#4B5563]">No</span>
                                  )}
                                </td>
                                <td className="py-3.5 px-3 text-right font-bold text-[#111111]">
                                  {row.totalOrders}
                                </td>
                                <td className="py-3.5 pl-3 text-right font-bold text-amber-700 whitespace-nowrap">
                                  {row.rewardsContribution > 0
                                    ? "+1 Active Credit"
                                    : "Pending"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                      <div className="flex items-center justify-between pt-3 border-t border-[#E5E7E2] text-xs">
                        <span className="text-[#4B5563]">
                          Showing page <strong>{pagination.page}</strong> of{" "}
                          <strong>{pagination.totalPages}</strong> ({pagination.total} referrals)
                        </span>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            className="rounded-xl border-[#E5E7E2] cursor-pointer"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={page >= pagination.totalPages}
                            onClick={() => setPage((p) => p + 1)}
                            className="rounded-xl border-[#E5E7E2] cursor-pointer"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                )}

                {/* ================= REWARDS TAB ================= */}
                {activeTab === "rewards" && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="p-5 bg-white border border-[#E5E7E2] rounded-3xl">
                        <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">
                          Total Rewards Earned
                        </span>
                        <div className="text-3xl font-extrabold font-heading text-[#111111] mt-1">
                          {trainer.rewardsEarned}
                        </div>
                        <span className="text-[11px] text-[#4B5563] mt-1 block">
                          Free post-workout meal vouchers
                        </span>
                      </Card>
                      <Card className="p-5 bg-white border border-[#E5E7E2] rounded-3xl">
                        <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">
                          Pending Rewards
                        </span>
                        <div className="text-3xl font-extrabold font-heading text-amber-600 mt-1">
                          {trainer.pendingRewards}
                        </div>
                        <span className="text-[11px] text-amber-700 font-semibold mt-1 block">
                          Ready to redeem at kiosk
                        </span>
                      </Card>
                      <Card className="p-5 bg-white border border-[#E5E7E2] rounded-3xl">
                        <span className="text-[11px] font-bold text-[#4B5563] uppercase tracking-wider">
                          Redeemed Rewards
                        </span>
                        <div className="text-3xl font-extrabold font-heading text-[#2F7D16] mt-1">
                          {trainer.redeemedRewards}
                        </div>
                        <span className="text-[11px] text-[#2F7D16] font-semibold mt-1 block">
                          Meals claimed
                        </span>
                      </Card>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#EAF4E3] border border-[#2F7D16]/25 text-xs text-[#111111] flex items-center justify-between flex-wrap gap-2">
                      <span>
                        <strong>Affiliate Reward Rule:</strong> Every <strong>5 active subscribers</strong> referred with your code unlocks <strong>1 Free Post-Workout Meal / Juice Voucher</strong>.
                      </span>
                      <Badge className="bg-[#2F7D16] text-white font-bold text-[11px]">
                        Progress: {trainer.progressToNextReward} / 5 toward next meal
                      </Badge>
                    </div>

                    <Card className="p-6 bg-white border border-[#E5E7E2] rounded-3xl space-y-4">
                      <h3 className="font-heading font-extrabold text-base text-[#111111]">
                        Reward Transaction History
                      </h3>

                      {rewards.length === 0 ? (
                        <div className="py-10 text-center space-y-2 border border-dashed border-[#E5E7E2] rounded-2xl bg-[#F7FAF4]/60">
                          <Trophy className="w-8 h-8 text-amber-500/60 mx-auto" />
                          <p className="text-sm font-bold text-[#111111]">No meal rewards yet</p>
                          <p className="text-xs text-[#4B5563]">
                            Refer 5 active subscribers to unlock your first free post-workout meal voucher.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-[#E5E7E2] text-[11px] font-extrabold uppercase tracking-wider text-[#4B5563]">
                                <th className="py-3 pr-4">Reward</th>
                                <th className="py-3 px-3">Generated By</th>
                                <th className="py-3 px-3">Earned Date</th>
                                <th className="py-3 px-3">Status</th>
                                <th className="py-3 pl-3 text-right">Redeemed Date</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E5E7E2] text-xs">
                              {rewards.map((rw) => (
                                <tr key={rw.id}>
                                  <td className="py-3.5 pr-4 font-bold text-[#111111]">
                                    {rw.rewardTitle}
                                  </td>
                                  <td className="py-3.5 px-3 text-[#4B5563]">
                                    {rw.milestoneSource}
                                  </td>
                                  <td className="py-3.5 px-3 text-[#4B5563]">
                                    {formatDate(rw.earnedAt)}
                                  </td>
                                  <td className="py-3.5 px-3">
                                    <Badge
                                      variant="outline"
                                      className={
                                        rw.isClaimed
                                          ? "bg-[#EAF4E3] text-[#2F7D16] border-[#2F7D16]/25 text-[10px] font-bold"
                                          : "bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-bold"
                                      }
                                    >
                                      {rw.status}
                                    </Badge>
                                  </td>
                                  <td className="py-3.5 pl-3 text-right text-[#4B5563]">
                                    {formatDate(rw.claimedAt)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </Card>
                  </div>
                )}

                {/* ================= QR & CODE TAB ================= */}
                {activeTab === "qr" && (
                  <Card className="p-6 sm:p-8 bg-white border border-[#E5E7E2] rounded-3xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      <div className="space-y-4">
                        <Badge className="bg-[#EAF4E3] text-[#2F7D16] border-none font-bold text-xs">
                          10% Client Discount + Meal Rewards
                        </Badge>
                        <h2 className="text-2xl font-extrabold font-heading text-[#111111]">
                          Share Your Trainer Referral Code
                        </h2>
                        <p className="text-sm text-[#4B5563] leading-relaxed">
                          Clients who register via your QR link or enter your code at checkout receive an instant <strong>10% discount</strong>, and their subscription and orders are automatically attributed to your partner account.
                        </p>

                        <div className="space-y-3 pt-2">
                          <div>
                            <span className="text-[11px] font-bold uppercase text-[#4B5563] block mb-1">
                              Your Referral Code
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 bg-[#F7FAF4] border border-[#E5E7E2] px-4 py-3 rounded-2xl font-mono text-base font-extrabold text-[#2F7D16]">
                                {trainer.referralCode}
                              </div>
                              <Button
                                type="button"
                                onClick={handleCopyCode}
                                className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold text-xs rounded-2xl px-4 py-3 cursor-pointer"
                              >
                                {copiedCode ? "Copied!" : "Copy Code"}
                              </Button>
                            </div>
                          </div>

                          <div>
                            <span className="text-[11px] font-bold uppercase text-[#4B5563] block mb-1">
                              Registration Link
                            </span>
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                readOnly
                                value={referralUrl}
                                className="flex-1 bg-[#F7FAF4] border border-[#E5E7E2] px-3 py-2.5 rounded-2xl text-xs text-[#4B5563]"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={handleCopyLink}
                                className="border-[#E5E7E2] font-bold text-xs rounded-2xl px-4 py-2.5 cursor-pointer"
                              >
                                {copiedLink ? "Copied!" : "Copy Link"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-center justify-center p-6 bg-[#F7FAF4] border border-[#E5E7E2] rounded-3xl space-y-4">
                        <QRCodeSVG
                          value={referralUrl}
                          size={210}
                          bgColor="#F7FAF4"
                          fgColor="#111111"
                          level="H"
                        />
                        <Button
                          type="button"
                          onClick={handleDownloadQR}
                          className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold text-xs rounded-2xl px-5 py-2.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4 mr-1.5" /> Download QR PNG
                        </Button>
                      </div>
                    </div>
                  </Card>
                )}

                {/* ================= PROFILE TAB ================= */}
                {activeTab === "profile" && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card className="p-6 bg-white border border-[#E5E7E2] rounded-3xl space-y-5">
                      <div>
                        <h3 className="font-heading font-extrabold text-base text-[#111111]">
                          Partner Details
                        </h3>
                        <p className="text-xs text-[#4B5563]">
                          Update your display name or contact phone number.
                        </p>
                      </div>

                      {profileNotice && (
                        <div
                          className={cn(
                            "p-3 rounded-2xl text-xs font-semibold border",
                            profileNotice.type === "success"
                              ? "bg-[#EAF4E3] border-[#2F7D16]/25 text-[#2F7D16]"
                              : "bg-rose-50 border-rose-200 text-rose-800"
                          )}
                        >
                          {profileNotice.text}
                        </div>
                      )}

                      <form onSubmit={handleSaveProfile} className="space-y-4">
                        <div>
                          <label className="text-xs font-bold text-[#111111] block mb-1">
                            Trainer Name
                          </label>
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-3 text-sm font-medium rounded-2xl border border-[#E5E7E2] bg-[#F7FAF4] focus:bg-white focus:border-[#2F7D16] focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-[#111111] block mb-1">
                            Email Address
                          </label>
                          <input
                            type="email"
                            readOnly
                            value={trainer.email}
                            className="w-full p-3 text-sm font-medium rounded-2xl border border-[#E5E7E2] bg-neutral-100 text-[#4B5563]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-bold text-[#111111] block mb-1">
                            Phone Number
                          </label>
                          <input
                            type="tel"
                            value={editPhone}
                            placeholder="+91 98765 43210"
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="w-full p-3 text-sm font-medium rounded-2xl border border-[#E5E7E2] bg-[#F7FAF4] focus:bg-white focus:border-[#2F7D16] focus:outline-none"
                          />
                        </div>

                        <Button
                          type="submit"
                          disabled={savingProfile}
                          className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold text-xs px-6 py-3 rounded-2xl cursor-pointer"
                        >
                          {savingProfile ? "Saving..." : "Save Profile Changes"}
                        </Button>
                      </form>
                    </Card>

                    <Card className="p-6 bg-white border border-[#E5E7E2] rounded-3xl space-y-4">
                      <h3 className="font-heading font-extrabold text-base text-[#111111]">
                        Partner Status &amp; Performance
                      </h3>
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between py-2 border-b border-[#E5E7E2]">
                          <span className="text-[#4B5563]">Partner Status</span>
                          <Badge className="bg-[#EAF4E3] text-[#2F7D16] border-none font-bold text-[10px]">
                            {trainer.partnerStatus}
                          </Badge>
                        </div>
                        <div className="flex justify-between py-2 border-b border-[#E5E7E2]">
                          <span className="text-[#4B5563]">Unique Referral Code</span>
                          <span className="font-mono font-extrabold text-[#2F7D16]">
                            {trainer.referralCode}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-[#E5E7E2]">
                          <span className="text-[#4B5563]">Total Referrals</span>
                          <span className="font-extrabold text-[#111111]">
                            {trainer.totalReferrals}
                          </span>
                        </div>
                        <div className="flex justify-between py-2 border-b border-[#E5E7E2]">
                          <span className="text-[#4B5563]">Active Subscribers</span>
                          <span className="font-extrabold text-[#2F7D16]">
                            {trainer.activeSubscribers}
                          </span>
                        </div>
                        <div className="flex justify-between py-2">
                          <span className="text-[#4B5563]">Meal Rewards Earned</span>
                          <span className="font-extrabold text-amber-600">
                            {trainer.rewardsEarned}
                          </span>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}
              </>
            )
          )}
        </div>
      </main>

      {/* Hidden high-res QR Canvas for PNG Download */}
      {trainer && (
        <div ref={qrCanvasWrapperRef} className="hidden" aria-hidden="true">
          <QRCodeCanvas
            value={referralUrl}
            size={512}
            bgColor="#FFFFFF"
            fgColor="#111111"
            level="H"
            includeMargin={true}
          />
        </div>
      )}

      {/* ================= REFERRAL DETAIL DRAWER ================= */}
      {selectedReferralId && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white h-full overflow-y-auto p-6 shadow-2xl border-l border-[#E5E7E2] space-y-5">
            <div className="flex items-center justify-between border-b border-[#E5E7E2] pb-3">
              <h3 className="font-heading font-extrabold text-base text-[#111111]">
                Referral Profile
              </h3>
              <button
                type="button"
                onClick={() => setSelectedReferralId(null)}
                className="p-1.5 rounded-xl hover:bg-[#F7FAF4] text-[#4B5563] cursor-pointer"
                aria-label="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {detailLoading && (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#2F7D16]" />
              </div>
            )}

            {detailError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                {detailError}
              </div>
            )}

            {referralDetail && !detailLoading && (
              <div className="space-y-5 text-xs">
                <div className="p-4 rounded-2xl bg-[#F7FAF4] border border-[#E5E7E2] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-heading font-extrabold text-base text-[#111111]">
                      {referralDetail.clientName}
                    </span>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px] font-bold",
                        statusBadge(referralDetail.subscriptionStatus)
                      )}
                    >
                      {referralDetail.subscriptionStatus}
                    </Badge>
                  </div>
                  <p className="text-[#4B5563]">{referralDetail.email}</p>
                  {referralDetail.phone && (
                    <p className="text-[#4B5563]">Phone: {referralDetail.phone}</p>
                  )}
                  <p className="text-[#4B5563]">
                    Joined: <strong>{formatDate(referralDetail.referredAt)}</strong> • Code:{" "}
                    <span className="font-mono font-bold text-[#2F7D16]">
                      {referralDetail.codeUsed}
                    </span>
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl border border-[#E5E7E2]">
                    <span className="text-[10px] font-bold uppercase text-[#4B5563] block">
                      First Purchase
                    </span>
                    <span className="font-bold text-[#111111] mt-0.5 block">
                      {formatDate(referralDetail.firstPurchaseDate)}
                    </span>
                  </div>
                  <div className="p-3 rounded-2xl border border-[#E5E7E2]">
                    <span className="text-[10px] font-bold uppercase text-[#4B5563] block">
                      Completed Orders
                    </span>
                    <span className="font-bold text-[#2F7D16] mt-0.5 block">
                      {referralDetail.totalCompletedOrders} orders
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-[#EAF4E3]/70 border border-[#2F7D16]/20 text-[#111111]">
                  <span className="font-bold block">Reward Contribution</span>
                  <span className="text-[#4B5563]">{referralDetail.rewardContribution}</span>
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-[#111111] uppercase tracking-wider text-[11px]">
                    Subscription &amp; Pass History
                  </h4>
                  {referralDetail.subscriptionHistory.length === 0 ? (
                    <p className="text-[#4B5563]">No NutriFlexs Pass purchased yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {referralDetail.subscriptionHistory.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="p-3 rounded-xl border border-[#E5E7E2] flex items-center justify-between"
                        >
                          <div>
                            <div className="font-bold text-[#111111]">{sub.planName}</div>
                            <div className="text-[11px] text-[#4B5563]">
                              {formatDate(sub.startDate)} → {formatDate(sub.endDate)}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={cn("text-[10px] font-bold", statusBadge(sub.status))}
                          >
                            {sub.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-bold text-[#111111] uppercase tracking-wider text-[11px]">
                    Referral Activity Timeline
                  </h4>
                  <div className="space-y-2.5 border-l-2 border-[#EAF4E3] pl-3 ml-1">
                    {referralDetail.timeline.map((ev: any) => (
                      <div key={ev.id} className="space-y-0.5">
                        <div className="font-semibold text-[#111111]">{ev.title}</div>
                        <div className="text-[10px] text-[#4B5563] flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {formatDate(ev.date)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
