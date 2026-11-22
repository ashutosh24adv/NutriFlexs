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
  User,
  Trash2,
  Save,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

export default function DietitianPortalPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();

  const [activeTab, setActiveTab] = useState<"appointments" | "plan-creator" | "clients">("appointments");
  const [consultations, setConsultations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Diet Plan Creator State
  const [selectedConsultationId, setSelectedConsultationId] = useState<string>("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [planTitle, setPlanTitle] = useState("Metabolic Balance & High-Protein Fuel Plan");
  const [targetCalories, setTargetCalories] = useState<number>(1850);
  const [targetProtein, setTargetProtein] = useState<number>(130);
  const [targetCarbs, setTargetCarbs] = useState<number>(180);
  const [targetFats, setTargetFats] = useState<number>(55);
  const [notes, setNotes] = useState("Focus on whole food sources, drink 3L water daily, and eat within 45 mins after workout.");
  const [foodsToLimit, setFoodsToLimit] = useState("Deep fried snacks, refined sugars, ultra-processed packaged beverages.");
  
  const [meals, setMeals] = useState<any[]>([
    {
      mealType: "BREAKFAST",
      foodName: "High-Protein Egg Scramble with Spinach & Oats Toast",
      servingSize: "2 Whole Eggs + 2 Whites + 2 Slices",
      quantity: 1,
      unit: "serving",
      calories: 360,
      protein: 26,
      carbohydrates: 34,
      fat: 12,
      dietitianTip: "Season with pink salt & black pepper.",
    },
    {
      mealType: "LUNCH",
      foodName: "Grilled Chicken & Quinoa Energy Bowl with Mixed Greens",
      servingSize: "1 Large Bowl (350g)",
      quantity: 1,
      unit: "serving",
      calories: 520,
      protein: 42,
      carbohydrates: 55,
      fat: 14,
      dietitianTip: "Add lemon dressing instead of creamy mayo.",
    },
    {
      mealType: "SNACKS",
      foodName: "Green Electrolyte & Alkalizer Juice with Roasted Almonds",
      servingSize: "1 Bottle (250ml) + 15g Almonds",
      quantity: 1,
      unit: "serving",
      calories: 175,
      protein: 6.5,
      carbohydrates: 18,
      fat: 9,
      dietitianTip: "Great mid-afternoon energy recovery.",
    },
    {
      mealType: "DINNER",
      foodName: "Herb-Grilled Paneer Skewers with Sautéed Broccoli & Lentil Soup",
      servingSize: "150g Paneer + 1 Cup Dal",
      quantity: 1,
      unit: "serving",
      calories: 480,
      protein: 32,
      carbohydrates: 28,
      fat: 22,
      dietitianTip: "Complete dinner at least 2 hours before sleep.",
    },
  ]);

  const [savingPlan, setSavingPlan] = useState(false);
  const [planSuccessToast, setPlanSuccessToast] = useState<string | null>(null);

  const loadConsultations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/consultations");
      const data = await res.json();
      if (data.success && Array.isArray(data.consultations)) {
        setConsultations(data.consultations);
        if (data.consultations.length > 0 && !selectedCustomerId) {
          setSelectedConsultationId(data.consultations[0].id);
          setSelectedCustomerId(data.consultations[0].customer?.id || "");
        }
      } else {
        setError(data.error || "Failed to load consultations.");
      }
    } catch {
      setError("Network error loading consultations.");
    } finally {
      setLoading(false);
    }
  }, [selectedCustomerId]);

  useEffect(() => {
    if (authStatus === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role !== "DIETITIAN" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
        router.push("/login?portal=dietitian&error=unauthorized_role");
        return;
      }
      loadConsultations();
    } else if (authStatus === "unauthenticated") {
      router.push("/login?portal=dietitian&staff=true");
    }
  }, [authStatus, loadConsultations, router, session]);

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (data.success) {
        await loadConsultations();
      } else {
        alert(data.error || "Failed to update status");
      }
    } catch {
      alert("Network error");
    }
  };

  const handleAddMealRow = (mealType: string) => {
    setMeals((prev) => [
      ...prev,
      {
        mealType,
        foodName: "New Healthy Meal Option",
        servingSize: "1 Serving",
        quantity: 1,
        unit: "serving",
        calories: 300,
        protein: 20,
        carbohydrates: 30,
        fat: 10,
        dietitianTip: "",
      },
    ]);
  };

  const handleRemoveMealRow = (index: number) => {
    setMeals((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateMeal = (index: number, field: string, value: any) => {
    setMeals((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const handlePublishPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a client to assign this diet plan to.");
      return;
    }

    setSavingPlan(true);
    try {
      const res = await fetch("/api/diet-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          consultationId: selectedConsultationId || undefined,
          customerId: selectedCustomerId,
          title: planTitle,
          dailyCalorieTarget: Number(targetCalories),
          proteinTargetGrams: Number(targetProtein),
          carbsTargetGrams: Number(targetCarbs),
          fatsTargetGrams: Number(targetFats),
          notes,
          foodsToLimit,
          meals,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setPlanSuccessToast("Diet Plan successfully authored and published to client!");
        setTimeout(() => setPlanSuccessToast(null), 5000);
        await loadConsultations();
      } else {
        alert(data.error || "Failed to publish diet plan.");
      }
    } catch {
      alert("Network error publishing diet plan.");
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFEFC] pb-24">
      {/* Toast Alert */}
      {planSuccessToast && (
        <div className="fixed top-20 right-4 sm:right-6 z-50 animate-slide-down max-w-sm">
          <div className="bg-[#2F7D16] text-white p-3.5 rounded-2xl shadow-xl flex items-center gap-2.5 text-xs font-bold border border-white/20">
            <CheckCircle2 className="w-4 h-4 shrink-0 fill-white text-[#2F7D16]" />
            <span>{planSuccessToast}</span>
          </div>
        </div>
      )}

      {/* Specialist Header */}
      <header className="bg-gradient-to-b from-[#F3F7EE] to-[#FDFEFC] border-b border-[#E5E7E2]/70 pt-10 pb-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center border border-[#2F7D16]/20 shrink-0">
                <HeartPulse className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-extrabold font-heading text-nutri-charcoal">
                    Health Coach Operations
                  </h1>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                    Coach Portal
                  </span>
                </div>
                <p className="text-xs text-nutri-secondary mt-0.5">
                  Logged in as <strong>{session?.user?.name || "Health Coach"}</strong> • Manage client consultations &amp; custom nutrition plans
                </p>
              </div>
            </div>

            <Link
              href="/dietitians"
              target="_blank"
              className="text-xs font-bold px-4 py-2 rounded-full border border-[#E5E7E2] hover:border-[#2F7D16] text-nutri-charcoal hover:text-[#2F7D16] inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <span>View Public Directory</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 pt-3 border-t border-[#E5E7E2]/60 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("appointments")}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "appointments"
                  ? "bg-[#2F7D16] text-white shadow-xs"
                  : "bg-white text-nutri-secondary border border-[#E5E7E2] hover:border-[#2F7D16] hover:text-nutri-charcoal"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Appointments Queue ({consultations.length})</span>
            </button>

            <button
              onClick={() => setActiveTab("plan-creator")}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                activeTab === "plan-creator"
                  ? "bg-[#2F7D16] text-white shadow-xs"
                  : "bg-white text-nutri-secondary border border-[#E5E7E2] hover:border-[#2F7D16] hover:text-nutri-charcoal"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Diet Plan Studio</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#2F7D16] animate-spin mx-auto" />
            <p className="text-xs font-bold text-nutri-secondary">Loading clinical dashboard...</p>
          </div>
        ) : error ? (
          <div className="py-12 px-6 max-w-md mx-auto text-center bg-white border border-[#E5E7E2] rounded-3xl shadow-sm space-y-3">
            <p className="text-sm font-bold text-rose-700">{error}</p>
            <Button onClick={loadConsultations} variant="outline" className="rounded-full text-xs font-bold">
              Retry
            </Button>
          </div>
        ) : activeTab === "appointments" ? (
          /* =================================================== */
          /* APPOINTMENTS QUEUE TAB */
          /* =================================================== */
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold font-heading text-nutri-charcoal">
                Scheduled Consultations ({consultations.length})
              </h2>
              <Button
                variant="outline"
                size="sm"
                onClick={loadConsultations}
                className="rounded-full text-xs font-bold"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" /> Refresh
              </Button>
            </div>

            {consultations.length === 0 ? (
              <div className="py-16 px-6 text-center bg-white border border-[#E5E7E2] rounded-3xl space-y-2">
                <Calendar className="w-8 h-8 text-neutral-400 mx-auto" />
                <h3 className="text-sm font-bold text-nutri-charcoal">No Appointments Scheduled Yet</h3>
                <p className="text-xs text-nutri-secondary max-w-sm mx-auto">
                  When clients book a consultation with your profile, they will appear here in real time.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {consultations.map((c) => (
                  <div
                    key={c.id}
                    className="bg-white border border-[#E5E7E2] rounded-3xl p-5 shadow-2xs space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Client Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#EAF4E3] text-[#2F7D16] flex items-center justify-center font-bold text-sm shrink-0">
                            {c.customer?.name?.charAt(0) || "C"}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold font-heading text-nutri-charcoal">
                              {c.customer?.name}
                            </h3>
                            <p className="text-[11px] text-nutri-secondary">{c.customer?.email}</p>
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            c.status === "CONFIRMED"
                              ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                              : c.status === "COMPLETED"
                              ? "bg-slate-100 text-slate-700 border-slate-300"
                              : "bg-amber-50 text-amber-800 border-amber-300"
                          }`}
                        >
                          {c.status}
                        </span>
                      </div>

                      {/* Schedule & Format */}
                      <div className="p-3 rounded-2xl bg-[#F3F7EE]/60 border border-[#E5E7E2] text-xs space-y-1">
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
                        <div className="text-[11px] text-nutri-secondary flex items-center gap-2 pt-0.5">
                          <span>Format: <strong className="capitalize">{c.consultationType.toLowerCase()}</strong></span>
                          <span>•</span>
                          <span>Fee: <strong className="text-[#2F7D16]">{formatPrice(c.fee)} (Paid)</strong></span>
                        </div>
                      </div>

                      {/* Primary Concern */}
                      <div className="text-xs space-y-0.5">
                        <span className="font-semibold text-nutri-secondary">Client Goal: </span>
                        <p className="text-nutri-charcoal italic leading-relaxed">&ldquo;{c.primaryConcern}&rdquo;</p>
                      </div>

                      {/* Health Notes */}
                      {c.healthNotes && (
                        <div className="text-[11px] text-amber-900 bg-amber-50 p-2 rounded-xl border border-amber-200">
                          <strong>Allergies / Notes: </strong> {c.healthNotes}
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-3 border-t border-[#E5E7E2] flex flex-wrap items-center justify-between gap-2">
                      <Link
                        href={`/consultations/${c.id}/chat`}
                        className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold text-xs px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Open Chat</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedConsultationId(c.id);
                          setSelectedCustomerId(c.customer?.id || "");
                          setActiveTab("plan-creator");
                        }}
                        className="bg-[#EAF4E3] text-[#2F7D16] hover:bg-[#F3F7EE] font-bold text-xs px-3 py-1.5 rounded-full border border-[#2F7D16]/20 transition-colors"
                      >
                        Author Diet Plan
                      </button>

                      {c.status === "CONFIRMED" && (
                        <button
                          type="button"
                          onClick={() => handleStatusUpdate(c.id, "COMPLETED")}
                          className="text-[11px] font-semibold text-neutral-500 hover:text-emerald-700 transition-colors"
                        >
                          Mark Completed
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* =================================================== */
          /* DIET PLAN STUDIO TAB */
          /* =================================================== */
          <form onSubmit={handlePublishPlan} className="space-y-6">
            <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 shadow-2xs space-y-5">
              <div className="border-b border-[#E5E7E2] pb-3">
                <h2 className="text-base font-extrabold font-heading text-nutri-charcoal">
                  Prescribe Personalized Diet Plan
                </h2>
                <p className="text-xs text-nutri-secondary mt-0.5">
                  Author macro targets and meal breakdown. The plan instantly publishes to the client&apos;s
                  NutriFlexs app and syncs with their Food Diary.
                </p>
              </div>

              {/* Client Selection */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-nutri-charcoal block">
                    Assign to Client / Consultation:
                  </label>
                  <select
                    required
                    value={selectedConsultationId}
                    onChange={(e) => {
                      const cId = e.target.value;
                      setSelectedConsultationId(cId);
                      const matching = consultations.find((c) => c.id === cId);
                      if (matching) setSelectedCustomerId(matching.customer?.id || "");
                    }}
                    className="w-full bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-2xl px-3 py-2 text-xs font-medium text-nutri-charcoal focus:outline-none focus:border-[#2F7D16]"
                  >
                    <option value="">Select a Client Consultation...</option>
                    {consultations.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.customer?.name} ({c.customer?.email}) • {c.timeSlot}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-nutri-charcoal block">
                    Plan Title:
                  </label>
                  <input
                    type="text"
                    required
                    value={planTitle}
                    onChange={(e) => setPlanTitle(e.target.value)}
                    className="w-full bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-2xl px-3 py-2 text-xs font-medium text-nutri-charcoal focus:outline-none focus:border-[#2F7D16]"
                  />
                </div>
              </div>

              {/* Daily Macro Targets Inputs */}
              <div className="space-y-2 pt-2 border-t border-[#E5E7E2]/70">
                <label className="text-xs font-bold text-nutri-charcoal block">
                  Daily Calculated Macro Targets:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-bold text-orange-800 uppercase block">Daily Calories (kcal)</span>
                    <input
                      type="number"
                      required
                      value={targetCalories}
                      onChange={(e) => setTargetCalories(Number(e.target.value))}
                      className="w-20 mx-auto mt-1 text-center font-extrabold text-base bg-white border border-orange-200 rounded-xl py-1 text-orange-900"
                    />
                  </div>

                  <div className="bg-[#EAF4E3] border border-[#2F7D16]/20 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-bold text-[#2F7D16] uppercase block">Protein Target (g)</span>
                    <input
                      type="number"
                      required
                      value={targetProtein}
                      onChange={(e) => setTargetProtein(Number(e.target.value))}
                      className="w-20 mx-auto mt-1 text-center font-extrabold text-base bg-white border border-[#2F7D16]/30 rounded-xl py-1 text-[#2F7D16]"
                    />
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-bold text-blue-800 uppercase block">Carbs Target (g)</span>
                    <input
                      type="number"
                      required
                      value={targetCarbs}
                      onChange={(e) => setTargetCarbs(Number(e.target.value))}
                      className="w-20 mx-auto mt-1 text-center font-extrabold text-base bg-white border border-blue-200 rounded-xl py-1 text-blue-900"
                    />
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase block">Fats Target (g)</span>
                    <input
                      type="number"
                      required
                      value={targetFats}
                      onChange={(e) => setTargetFats(Number(e.target.value))}
                      className="w-20 mx-auto mt-1 text-center font-extrabold text-base bg-white border border-amber-200 rounded-xl py-1 text-amber-900"
                    />
                  </div>
                </div>
              </div>

              {/* Guidance & Foods to Limit */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-nutri-charcoal block">
                    Specialist Notes &amp; Recommendations:
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-2xl p-2.5 text-xs text-nutri-charcoal focus:outline-none focus:border-[#2F7D16]"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-nutri-charcoal block">
                    Foods to Limit / Avoid:
                  </label>
                  <textarea
                    rows={3}
                    value={foodsToLimit}
                    onChange={(e) => setFoodsToLimit(e.target.value)}
                    className="w-full bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-2xl p-2.5 text-xs text-nutri-charcoal focus:outline-none focus:border-[#2F7D16]"
                  />
                </div>
              </div>
            </div>

            {/* Prescribed Meals Builder */}
            <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E5E7E2] pb-3">
                <h3 className="text-sm font-extrabold font-heading text-nutri-charcoal uppercase tracking-wider">
                  Prescribed Meals ({meals.length} Meals)
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-nutri-secondary font-semibold mr-1">Add:</span>
                  {["BREAKFAST", "LUNCH", "SNACKS", "DINNER"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleAddMealRow(t)}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F7EE] text-[#2F7D16] border border-[#2F7D16]/20 hover:bg-[#EAF4E3] transition-colors"
                    >
                      + {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {meals.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-2xl bg-[#F3F7EE]/40 border border-[#E5E7E2] space-y-2 relative"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <select
                          value={m.mealType}
                          onChange={(e) => handleUpdateMeal(idx, "mealType", e.target.value)}
                          className="bg-white border border-[#E5E7E2] text-[11px] font-bold rounded-xl px-2 py-1 text-[#2F7D16]"
                        >
                          <option value="BREAKFAST">BREAKFAST</option>
                          <option value="LUNCH">LUNCH</option>
                          <option value="SNACKS">SNACKS</option>
                          <option value="DINNER">DINNER</option>
                        </select>

                        <input
                          type="text"
                          required
                          value={m.foodName}
                          onChange={(e) => handleUpdateMeal(idx, "foodName", e.target.value)}
                          placeholder="Food name..."
                          className="bg-white border border-[#E5E7E2] text-xs font-bold rounded-xl px-2.5 py-1 text-nutri-charcoal flex-1 min-w-[200px]"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          required
                          value={m.servingSize}
                          onChange={(e) => handleUpdateMeal(idx, "servingSize", e.target.value)}
                          placeholder="Portion / Serving (e.g. 150g)"
                          className="bg-white border border-[#E5E7E2] text-[11px] rounded-xl px-2 py-1 text-nutri-secondary w-32"
                        />

                        <button
                          type="button"
                          onClick={() => handleRemoveMealRow(idx)}
                          className="text-neutral-400 hover:text-rose-600 p-1"
                          title="Remove Meal"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Macro values per meal */}
                    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 text-[11px] pt-1">
                      <div>
                        <span className="text-[9px] text-nutri-muted font-bold block uppercase">Kcal</span>
                        <input
                          type="number"
                          value={m.calories}
                          onChange={(e) => handleUpdateMeal(idx, "calories", Number(e.target.value))}
                          className="w-full bg-white border border-[#E5E7E2] rounded-lg px-2 py-0.5 text-center font-bold text-orange-900"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-nutri-muted font-bold block uppercase">Protein (g)</span>
                        <input
                          type="number"
                          value={m.protein}
                          onChange={(e) => handleUpdateMeal(idx, "protein", Number(e.target.value))}
                          className="w-full bg-white border border-[#E5E7E2] rounded-lg px-2 py-0.5 text-center font-bold text-[#2F7D16]"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-nutri-muted font-bold block uppercase">Carbs (g)</span>
                        <input
                          type="number"
                          value={m.carbohydrates}
                          onChange={(e) => handleUpdateMeal(idx, "carbohydrates", Number(e.target.value))}
                          className="w-full bg-white border border-[#E5E7E2] rounded-lg px-2 py-0.5 text-center font-bold text-blue-900"
                        />
                      </div>
                      <div>
                        <span className="text-[9px] text-nutri-muted font-bold block uppercase">Fats (g)</span>
                        <input
                          type="number"
                          value={m.fat}
                          onChange={(e) => handleUpdateMeal(idx, "fat", Number(e.target.value))}
                          className="w-full bg-white border border-[#E5E7E2] rounded-lg px-2 py-0.5 text-center font-bold text-amber-900"
                        />
                      </div>
                      <div className="col-span-4 sm:col-span-1">
                        <span className="text-[9px] text-nutri-muted font-bold block uppercase">Specialist Tip</span>
                        <input
                          type="text"
                          value={m.dietitianTip || ""}
                          onChange={(e) => handleUpdateMeal(idx, "dietitianTip", e.target.value)}
                          placeholder="e.g. Warm water"
                          className="w-full bg-white border border-[#E5E7E2] rounded-lg px-2 py-0.5 text-xs text-neutral-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit & Publish CTA */}
            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="submit"
                disabled={savingPlan || !selectedCustomerId || meals.length === 0}
                className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold text-xs sm:text-sm px-8 py-3 rounded-full shadow-md shadow-[#2F7D16]/20 disabled:opacity-50 cursor-pointer transition-all"
              >
                {savingPlan ? (
                  <span className="inline-flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin" /> Publishing Plan to Client...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Save className="w-4 h-4" /> Publish Diet Plan to Client
                  </span>
                )}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
