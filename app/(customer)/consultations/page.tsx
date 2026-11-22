"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  MessageCircle,
  FileText,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  HeartPulse,
  Flame,
  Zap,
  Wheat,
  Droplets,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice, formatMacro } from "@/lib/utils";

export default function CustomerConsultationsPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [activeTab, setActiveTab] = useState<"appointments" | "diet-plan" | "history">("appointments");
  const [consultations, setConsultations] = useState<any[]>([]);
  const [activePlan, setActivePlan] = useState<any | null>(null);
  const [allPlans, setAllPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingMealId, setLoggingMealId] = useState<string | null>(null);
  const [logToast, setLogToast] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [resConsult, resPlans] = await Promise.all([
        fetch("/api/consultations"),
        fetch("/api/diet-plans"),
      ]);

      const dataConsult = await resConsult.json();
      const dataPlans = await resPlans.json();

      if (dataConsult.success && Array.isArray(dataConsult.consultations)) {
        setConsultations(dataConsult.consultations);
      }
      if (dataPlans.success) {
        setActivePlan(dataPlans.activePlan || null);
        setAllPlans(dataPlans.allPlans || []);
      }
    } catch {
      setError("Failed to load your consultations and diet plans.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated") {
      loadData();
    } else if (authStatus === "unauthenticated") {
      router.push("/login?callbackUrl=/consultations");
    }
  }, [authStatus, loadData, router]);

  const handleCancel = async (consultationId: string) => {
    if (!confirm("Are you sure you want to cancel this consultation?")) return;
    try {
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED", reason: "Cancelled by customer" }),
      });
      const data = await res.json();
      if (data.success) {
        await loadData();
      } else {
        alert(data.error || "Failed to cancel consultation.");
      }
    } catch {
      alert("Network error.");
    }
  };

  const handleLogMeal = async (mealId: string) => {
    if (!activePlan) return;
    setLoggingMealId(mealId);
    try {
      const res = await fetch(`/api/diet-plans/${activePlan.id}/log-meal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealId }),
      });
      const data = await res.json();
      if (data.success) {
        setLogToast(data.message || "Meal successfully logged to your Food Diary!");
        setTimeout(() => setLogToast(null), 4000);
      } else {
        alert(data.error || "Failed to log meal.");
      }
    } catch {
      alert("Network error logging meal.");
    } finally {
      setLoggingMealId(null);
    }
  };

  const upcomingConsultations = consultations.filter(
    (c) => c.status === "CONFIRMED" || c.status === "PENDING"
  );
  const pastConsultations = consultations.filter(
    (c) => c.status === "COMPLETED" || c.status === "CANCELLED" || c.status === "REJECTED"
  );

  return (
    <div className="min-h-screen bg-[#FDFEFC] pb-24">
      {/* Toast Notification */}
      {logToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-slide-down max-w-sm">
          <div className="bg-[#2F7D16] text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-white/20">
            <CheckCircle2 className="w-4 h-4 shrink-0 fill-white text-[#2F7D16]" />
            <span>{logToast}</span>
          </div>
        </div>
      )}

      {/* Header Banner */}
      <section className="bg-gradient-to-b from-[#F3F7EE] to-[#FDFEFC] pt-10 pb-8 border-b border-[#E5E7E2]/70">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-[#EAF4E3] text-[#2F7D16] text-[11px] font-bold border border-[#2F7D16]/20">
                <HeartPulse className="w-3.5 h-3.5" />
                <span>MY COACH CONSULTATIONS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight mt-1">
                Health Coaching Sessions &amp; Nutrition Plans
              </h1>
              <p className="text-xs sm:text-sm text-nutri-secondary mt-0.5">
                Manage your scheduled coach sessions, private chat, and personalized meal targets.
              </p>
            </div>

            <Link href="/dietitians">
              <Button className="bg-[#2F7D16] hover:bg-[#24630F] text-white rounded-full text-xs font-bold px-5 py-2.5 shadow-2xs cursor-pointer">
                <Plus className="w-4 h-4 mr-1" />
                Book New Consultation
              </Button>
            </Link>
          </div>

          {/* Nav Tabs */}
          <div className="flex items-center gap-2 pt-4 border-t border-[#E5E7E2]/60 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("appointments")}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "appointments"
                  ? "bg-[#2F7D16] text-white shadow-xs"
                  : "bg-white text-nutri-secondary border border-[#E5E7E2] hover:border-[#2F7D16] hover:text-nutri-charcoal"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Appointments ({consultations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("diet-plan")}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "diet-plan"
                  ? "bg-[#2F7D16] text-white shadow-xs"
                  : "bg-white text-nutri-secondary border border-[#E5E7E2] hover:border-[#2F7D16] hover:text-nutri-charcoal"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Active Diet Plan {activePlan ? "• Live" : ""}</span>
            </button>

            <button
              onClick={() => setActiveTab("history")}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "history"
                  ? "bg-[#2F7D16] text-white shadow-xs"
                  : "bg-white text-nutri-secondary border border-[#E5E7E2] hover:border-[#2F7D16] hover:text-nutri-charcoal"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Plan History ({allPlans.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#2F7D16] animate-spin mx-auto" />
            <p className="text-xs font-bold text-nutri-secondary">Loading consultation data...</p>
          </div>
        ) : error ? (
          <div className="py-12 px-6 max-w-md mx-auto text-center bg-white border border-[#E5E7E2] rounded-3xl shadow-sm space-y-3">
            <p className="text-sm font-bold text-rose-700">{error}</p>
            <Button onClick={loadData} variant="outline" className="rounded-full text-xs font-bold">
              Retry
            </Button>
          </div>
        ) : activeTab === "appointments" ? (
          /* =================================================== */
          /* APPOINTMENTS TAB */
          /* =================================================== */
          <div className="space-y-8">
            {/* Upcoming Section */}
            <div className="space-y-4">
              <h2 className="text-base font-extrabold font-heading text-nutri-charcoal flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#2F7D16]" />
                Upcoming Appointments ({upcomingConsultations.length})
              </h2>

              {upcomingConsultations.length === 0 ? (
                <div className="py-12 px-6 text-center bg-white border border-[#E5E7E2] rounded-3xl space-y-3">
                  <div className="w-12 h-12 rounded-full bg-[#EAF4E3] text-[#2F7D16] mx-auto flex items-center justify-center">
                    <Calendar className="w-6 h-6" />
                  </div>
                  <h3 className="text-sm font-bold text-nutri-charcoal">No Upcoming Consultations</h3>
                  <p className="text-xs text-nutri-secondary max-w-sm mx-auto">
                    You do not have any active appointments scheduled. Book a 1-on-1 session with an
                    experienced health coach today.
                  </p>
                  <Link href="/dietitians">
                    <Button className="bg-[#2F7D16] hover:bg-[#24630F] text-white rounded-full text-xs font-bold px-5 py-2">
                      Find a Health Coach
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {upcomingConsultations.map((c) => (
                    <div
                      key={c.id}
                      className="bg-white border border-[#E5E7E2] rounded-3xl p-5 shadow-2xs hover:shadow-sm transition-all space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        {/* Dietitian Header */}
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="relative w-12 h-12 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-[#E5E7E2]">
                              <Image
                                src={
                                  c.dietitian?.profileImageUrl ||
                                  "https://images.unsplash.com/photo-1594824813511-236be048b64a?auto=format&fit=crop&w=400&q=80"
                                }
                                alt={c.dietitian?.fullName || "Health Coach"}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <h3 className="text-sm font-bold font-heading text-nutri-charcoal">
                                {c.dietitian?.fullName}
                              </h3>
                              <p className="text-[11px] text-nutri-secondary font-medium">
                                {c.dietitian?.qualifications}
                              </p>
                            </div>
                          </div>

                          <span
                            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                              c.status === "CONFIRMED"
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-amber-50 text-amber-800 border-amber-300"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>

                        {/* Date & Time Slot Details */}
                        <div className="p-3 rounded-2xl bg-[#F3F7EE]/70 border border-[#E5E7E2]/70 text-xs space-y-1">
                          <div className="flex items-center gap-2 font-bold text-nutri-charcoal">
                            <Calendar className="w-3.5 h-3.5 text-[#2F7D16]" />
                            <span>
                              {new Date(c.scheduledDate).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                            <span>•</span>
                            <Clock className="w-3.5 h-3.5 text-[#2F7D16]" />
                            <span>{c.timeSlot}</span>
                          </div>
                          <div className="flex items-center gap-2 text-nutri-secondary text-[11px] pt-1">
                            {c.consultationType === "ONLINE" ? (
                              <div className="flex items-center gap-1 text-[#2F7D16] font-semibold">
                                <Video className="w-3.5 h-3.5" />
                                <span>Online Video Call</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-neutral-700 font-semibold">
                                <MapPin className="w-3.5 h-3.5 text-[#2F7D16]" />
                                <span>{c.location || "Indiranagar Cult Kiosk Suite"}</span>
                              </div>
                            )}
                            <span>•</span>
                            <span>Fee: {formatPrice(c.fee)} (Paid)</span>
                          </div>
                        </div>

                        {/* Primary Goal / Concern */}
                        <div className="text-xs">
                          <span className="font-semibold text-nutri-secondary">Focus Area: </span>
                          <span className="text-nutri-charcoal italic">&ldquo;{c.primaryConcern}&rdquo;</span>
                        </div>
                      </div>

                      {/* Action CTAs */}
                      <div className="pt-3 border-t border-[#E5E7E2]/70 flex items-center justify-between gap-2">
                        <Link
                          href={`/consultations/${c.id}/chat`}
                          className="flex-1 bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold text-xs py-2 rounded-full inline-flex items-center justify-center gap-1.5 shadow-2xs transition-colors"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>Chat with Coach</span>
                        </Link>

                        {c.meetingLink && (
                          <a
                            href={c.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-white border border-[#E5E7E2] hover:border-[#2F7D16] text-[#2F7D16] font-bold text-xs px-3 py-2 rounded-full inline-flex items-center gap-1 transition-colors"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Join</span>
                          </a>
                        )}

                        <button
                          type="button"
                          onClick={() => handleCancel(c.id)}
                          className="text-xs font-semibold text-neutral-400 hover:text-rose-600 px-2 py-1 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Past Section */}
            {pastConsultations.length > 0 && (
              <div className="space-y-4 pt-6 border-t border-[#E5E7E2]/70">
                <h2 className="text-sm font-bold font-heading text-nutri-secondary uppercase tracking-wider">
                  Past Consultations ({pastConsultations.length})
                </h2>
                <div className="bg-white border border-[#E5E7E2] rounded-3xl divide-y divide-[#E5E7E2]/70 overflow-hidden text-xs">
                  {pastConsultations.map((c) => (
                    <div
                      key={c.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-nutri-charcoal">{c.dietitian?.fullName}</strong>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              c.status === "COMPLETED"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-rose-50 text-rose-800"
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-nutri-secondary mt-0.5">
                          {new Date(c.scheduledDate).toLocaleDateString()} • {c.timeSlot} • {c.primaryConcern}
                        </p>
                      </div>

                      <Link
                        href={`/consultations/${c.id}/chat`}
                        className="text-xs font-bold text-[#2F7D16] hover:underline flex items-center gap-1 shrink-0"
                      >
                        <span>View Chat History</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : activeTab === "diet-plan" ? (
          /* =================================================== */
          /* ACTIVE DIET PLAN TAB */
          /* =================================================== */
          <div className="space-y-8">
            {!activePlan ? (
              <div className="py-16 px-6 text-center bg-white border border-[#E5E7E2] rounded-3xl space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#EAF4E3] text-[#2F7D16] mx-auto flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="text-base font-bold font-heading text-nutri-charcoal">
                  No Active Diet Plan Yet
                </h3>
                <p className="text-xs text-nutri-secondary max-w-md mx-auto leading-relaxed">
                  Once you complete a consultation, your coach will author and publish a bespoke,
                  calorie- and macro-calculated nutrition plan directly to your account.
                </p>
                <Link href="/dietitians">
                  <Button className="bg-[#2F7D16] hover:bg-[#24630F] text-white rounded-full text-xs font-bold px-5 py-2">
                    Book a Consultation
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Plan Header Card */}
                <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 shadow-2xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                          Active Plan
                        </span>
                        <span className="text-xs text-nutri-secondary font-medium">
                          Created by {activePlan.dietitian?.fullName}
                        </span>
                      </div>
                      <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal mt-1">
                        {activePlan.title}
                      </h2>
                    </div>

                    <Link
                      href="/nutrition"
                      className="text-xs font-bold px-4 py-2 rounded-full bg-[#F3F7EE] text-[#2F7D16] border border-[#2F7D16]/20 hover:bg-[#EAF4E3] transition-colors inline-flex items-center gap-1.5 shrink-0"
                    >
                      <span>Open Daily Food Diary</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Daily Macro Targets Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                    <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-3 text-center">
                      <Flame className="w-4 h-4 text-orange-600 mx-auto mb-1 fill-orange-600" />
                      <span className="block text-lg font-extrabold text-orange-900 font-heading">
                        {activePlan.dailyCalorieTarget}
                      </span>
                      <span className="text-[10px] font-bold text-orange-800 uppercase">Daily Calories</span>
                    </div>

                    <div className="bg-[#EAF4E3] border border-[#2F7D16]/20 rounded-2xl p-3 text-center">
                      <Zap className="w-4 h-4 text-[#2F7D16] mx-auto mb-1 fill-[#2F7D16]" />
                      <span className="block text-lg font-extrabold text-[#2F7D16] font-heading">
                        {formatMacro(activePlan.proteinTargetGrams)}
                      </span>
                      <span className="text-[10px] font-bold text-[#2F7D16] uppercase">Protein Goal</span>
                    </div>

                    <div className="bg-blue-50 border border-blue-200/80 rounded-2xl p-3 text-center">
                      <Wheat className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                      <span className="block text-lg font-extrabold text-blue-900 font-heading">
                        {formatMacro(activePlan.carbsTargetGrams)}
                      </span>
                      <span className="text-[10px] font-bold text-blue-800 uppercase">Carbohydrates</span>
                    </div>

                    <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3 text-center">
                      <Droplets className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                      <span className="block text-lg font-extrabold text-amber-900 font-heading">
                        {formatMacro(activePlan.fatsTargetGrams)}
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 uppercase">Healthy Fats</span>
                    </div>
                  </div>

                  {/* Coach Notes */}
                  {activePlan.notes && (
                    <div className="p-3.5 rounded-2xl bg-[#F3F7EE]/60 border border-[#E5E7E2] text-xs text-nutri-secondary leading-relaxed">
                      <strong className="text-nutri-charcoal block mb-0.5">Coach Guidance:</strong>
                      {activePlan.notes}
                    </div>
                  )}

                  {activePlan.foodsToLimit && (
                    <div className="p-3 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 leading-relaxed">
                      <strong>Foods to Limit / Avoid: </strong>
                      {activePlan.foodsToLimit}
                    </div>
                  )}
                </div>

                {/* Meals Breakdown by MealType */}
                <div className="space-y-4">
                  <h3 className="text-sm font-extrabold font-heading text-nutri-charcoal uppercase tracking-wider flex items-center justify-between">
                    <span>Prescribed Meals &amp; Portions</span>
                    <span className="text-[11px] font-semibold text-nutri-secondary lowercase">
                      Click &ldquo;+ Log&rdquo; to add to your Food Diary
                    </span>
                  </h3>

                  {["BREAKFAST", "LUNCH", "SNACKS", "DINNER"].map((mType) => {
                    const mealsForType = activePlan.meals?.filter((m: any) => m.mealType === mType) || [];
                    if (mealsForType.length === 0) return null;

                    return (
                      <div key={mType} className="bg-white border border-[#E5E7E2] rounded-3xl p-5 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between border-b border-[#E5E7E2]/70 pb-2">
                          <h4 className="text-xs font-bold text-nutri-charcoal uppercase tracking-wider flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#2F7D16]" />
                            {mType}
                          </h4>
                          <span className="text-[11px] font-semibold text-nutri-secondary">
                            {mealsForType.reduce((acc: number, m: any) => acc + m.calories, 0)} kcal total
                          </span>
                        </div>

                        <div className="space-y-2.5">
                          {mealsForType.map((meal: any) => {
                            const isLogging = loggingMealId === meal.id;
                            return (
                              <div
                                key={meal.id}
                                className="p-3 rounded-2xl bg-[#F3F7EE]/50 border border-[#E5E7E2]/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F3F7EE] transition-colors"
                              >
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-nutri-charcoal">
                                      {meal.foodName}
                                    </span>
                                    <span className="text-[10px] font-medium text-nutri-secondary bg-white px-2 py-0.5 rounded-full border border-[#E5E7E2]">
                                      {meal.servingSize}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-nutri-secondary">
                                    <span className="font-semibold text-orange-800">{meal.calories} kcal</span>
                                    <span>•</span>
                                    <span className="font-semibold text-[#2F7D16]">{meal.protein}g Protein</span>
                                    <span>•</span>
                                    <span>{meal.carbohydrates}g Carbs</span>
                                    <span>•</span>
                                    <span>{meal.fat}g Fats</span>
                                  </div>
                                  {meal.dietitianTip && (
                                    <p className="text-[10px] text-[#2F7D16] font-medium italic">
                                      Tip: {meal.dietitianTip}
                                    </p>
                                  )}
                                </div>

                                <Button
                                  type="button"
                                  size="sm"
                                  disabled={isLogging}
                                  onClick={() => handleLogMeal(meal.id)}
                                  className="rounded-full bg-white border border-[#2F7D16] text-[#2F7D16] hover:bg-[#2F7D16] hover:text-white text-xs font-bold px-3.5 py-1.5 shadow-2xs transition-all shrink-0 cursor-pointer disabled:opacity-50"
                                >
                                  {isLogging ? (
                                    <span className="inline-flex items-center gap-1">
                                      <RefreshCw className="w-3 h-3 animate-spin" /> Logging...
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1">
                                      <Plus className="w-3.5 h-3.5" /> Log to Diary
                                    </span>
                                  )}
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* =================================================== */
          /* PLAN HISTORY TAB */
          /* =================================================== */
          <div className="space-y-4">
            <h2 className="text-base font-extrabold font-heading text-nutri-charcoal">
              Previous Diet Plans ({allPlans.length})
            </h2>

            {allPlans.length === 0 ? (
              <div className="py-12 px-6 text-center bg-white border border-[#E5E7E2] rounded-3xl text-xs text-nutri-secondary">
                No archived plans found.
              </div>
            ) : (
              <div className="space-y-3">
                {allPlans.map((p) => (
                  <div
                    key={p.id}
                    className="bg-white border border-[#E5E7E2] rounded-3xl p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-nutri-charcoal">{p.title}</h4>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            p.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-800"
                              : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>
                      <p className="text-[11px] text-nutri-secondary mt-1">
                        Prescribed: {new Date(p.createdAt).toLocaleDateString()} • {p.dailyCalorieTarget} kcal • {p.proteinTargetGrams}g Protein • {p.meals?.length || 0} Meals Prescribed
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setActivePlan(p);
                        setActiveTab("diet-plan");
                      }}
                      className="text-xs font-bold text-[#2F7D16] hover:underline shrink-0 text-left"
                    >
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
