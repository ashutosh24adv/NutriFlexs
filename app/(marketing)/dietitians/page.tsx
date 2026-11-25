"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search,
  CheckCircle2,
  Star,
  Languages,
  ArrowRight,
  RefreshCw,
  UserCheck,
  Flame,
  Target,
  TrendingUp,
  TrendingDown,
  Dumbbell,
  Sparkles,
  Zap,
  Activity,
  HeartPulse,
  Bot,
  Calendar,
  MessageCircle,
  Award,
  ChevronRight,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

interface Dietitian {
  id: string;
  fullName: string;
  bio: string;
  qualifications: string;
  experienceYears: number;
  consultationFee: number;
  rating: number;
  reviewCount: number;
  isVerified: boolean;
  languages: string[];
  specializations: string[];
  availableFormats: string[];
  profileImageUrl?: string;
  availabilities?: any[];
}

const FITNESS_GOALS = [
  {
    id: "Lose Weight",
    title: "Lose Weight",
    icon: Flame,
    color: "from-amber-500/10 to-rose-500/10 border-amber-200 text-amber-700",
    iconBg: "bg-amber-100 text-amber-700",
    desc: "Sustainable fat loss with targeted nutrition, accountability & smart calorie balance.",
    queryMatch: "Lose Weight",
  },
  {
    id: "Build Muscle",
    title: "Build Muscle",
    icon: Dumbbell,
    color: "from-emerald-500/10 to-teal-500/10 border-emerald-200 text-[#2F7D16]",
    iconBg: "bg-[#EAF4E3] text-[#2F7D16]",
    desc: "Hypertrophy training, high-protein meal planning & lean mass development.",
    queryMatch: "Build Muscle",
  },
  {
    id: "Gain Weight",
    title: "Gain Weight",
    icon: TrendingUp,
    color: "from-orange-500/10 to-amber-500/10 border-orange-200 text-orange-700",
    iconBg: "bg-orange-100 text-orange-700",
    desc: "Nutrient-dense calorie surplus, strength progression & healthy weight gain.",
    queryMatch: "Gain Weight",
  },
  {
    id: "Improve Strength",
    title: "Improve Strength",
    icon: Zap,
    color: "from-blue-500/10 to-indigo-500/10 border-blue-200 text-blue-700",
    iconBg: "bg-blue-100 text-blue-700",
    desc: "Compound lift mechanics, progressive overload & breaking strength plateaus.",
    queryMatch: "Improve Strength",
  },
  {
    id: "Improve Athletic Performance",
    title: "Improve Athletic Performance",
    icon: Activity,
    color: "from-purple-500/10 to-violet-500/10 border-purple-200 text-purple-700",
    iconBg: "bg-purple-100 text-purple-700",
    desc: "Endurance, stamina, speed, explosive power & athletic recovery protocols.",
    queryMatch: "Improve Athletic Performance",
  },
  {
    id: "Build Healthy Habits",
    title: "Build Healthy Habits",
    icon: Sparkles,
    color: "from-teal-500/10 to-emerald-500/10 border-teal-200 text-teal-700",
    iconBg: "bg-teal-100 text-teal-700",
    desc: "Sustainable lifestyle routines, consistency coaching & everyday wellness.",
    queryMatch: "Build Healthy Habits",
  },
];

const SPECIALIZATION_FILTERS = [
  "All",
  "Lose Weight",
  "Build Muscle",
  "Gain Weight",
  "Improve Strength",
  "Improve Athletic Performance",
  "Build Healthy Habits",
  "Sports Nutrition",
  "Workout Consistency",
];

const LANGUAGES = ["All", "English", "Hindi", "Telugu", "Gujarati", "Kannada", "Malayalam"];

export default function HealthCoachesPage() {
  const [dietitians, setDietitians] = useState<Dietitian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("All");
  const [selectedLang, setSelectedLang] = useState("All");
  const [maxFee, setMaxFee] = useState<number | null>(null);
  const [minExp, setMinExp] = useState<number | null>(null);

  const coachesSectionRef = useRef<HTMLDivElement>(null);

  // Debounce search input by 300ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchDietitians = useCallback(async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();

    try {
      const params = new URLSearchParams();
      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (selectedSpec !== "All") params.set("specialization", selectedSpec);
      if (selectedLang !== "All") params.set("language", selectedLang);
      if (maxFee) params.set("maxFee", maxFee.toString());
      if (minExp) params.set("minExperience", minExp.toString());

      const res = await fetch(`/api/dietitians?${params.toString()}`, {
        signal: controller.signal,
      });
      const data = await res.json();

      if (data.success && Array.isArray(data.dietitians)) {
        setDietitians(data.dietitians);
      } else {
        setError(data.error || "Failed to load health coaches");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError("Network error loading health coaches directory. Please retry.");
      }
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [debouncedSearch, selectedSpec, selectedLang, maxFee, minExp]);

  useEffect(() => {
    fetchDietitians();
  }, [fetchDietitians]);

  const handleSelectGoal = (goalQuery: string) => {
    setSelectedSpec(goalQuery);
    if (coachesSectionRef.current) {
      coachesSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleScrollToCoaches = () => {
    if (coachesSectionRef.current) {
      coachesSectionRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFEFC] space-y-12 sm:space-y-16 pb-16">
      {/* ============================================================== */}
      {/* SECTION A: HERO                                                */}
      {/* ============================================================== */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#F3F7EE] via-[#F7FAF4] to-[#FDFEFC] border-b border-[#E5E7E2] pt-12 sm:pt-16 pb-14 sm:pb-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Column: Heading & CTAs */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
              <Badge
                variant="gold"
                className="bg-[#EAF4E3] text-[#2F7D16] border-[#2F7D16]/20 font-extrabold text-xs px-3.5 py-1 inline-flex items-center gap-1.5 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#2F7D16] shrink-0" />
                <span>YOUR FITNESS JOURNEY. YOUR PERSONAL COACH.</span>
              </Badge>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight leading-[1.15]">
                Find Your Coach. <br />
                <span className="text-[#2F7D16]">Build Your Stronger Self.</span>
              </h1>

              <p className="text-sm sm:text-base text-nutri-secondary max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                Whether your goal is fat loss, muscle building or a healthier lifestyle, find the right coach to guide your journey. Get guidance, motivation and personalised support from fitness and lifestyle coaches who help you build muscle, lose weight, improve nutrition and stay consistent.
              </p>

              {/* Dual Action CTAs */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Button
                  onClick={handleScrollToCoaches}
                  size="lg"
                  className="w-full sm:w-auto bg-[#2F7D16] text-white hover:bg-[#24630F] font-extrabold text-sm px-7 py-3.5 rounded-full shadow-md shadow-[#2F7D16]/20 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                >
                  <Dumbbell className="w-4 h-4" />
                  <span>Explore Coaches</span>
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <Link href="/ai-coach" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    variant="outline"
                    className="w-full sm:w-auto bg-white text-[#2F7D16] hover:bg-[#EAF4E3] border-2 border-[#2F7D16] font-extrabold text-sm px-6 py-3.5 rounded-full shadow-2xs flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    <Bot className="w-4 h-4 text-[#2F7D16]" />
                    <span>Meet Your AI Coach</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  </Button>
                </Link>
              </div>

              {/* Highlights strip */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-4 sm:gap-6 text-xs font-semibold text-nutri-secondary border-t border-[#E5E7E2]/70">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2F7D16]" /> 1-on-1 Fitness Mentors
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2F7D16]" /> Online &amp; In-Person
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#2F7D16]" /> Real Nutrition Tracking
                </span>
              </div>
            </div>

            {/* Right Column: Visual Composition */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-sm rounded-3xl overflow-hidden shadow-float border border-[#E5E7E2] bg-white p-3 space-y-3">
                <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden bg-neutral-100">
                  <Image
                    src="https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80"
                    alt="NutriFlexs Fitness Coaching"
                    fill
                    priority
                    sizes="(max-width: 1024px) 100vw, 420px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3 text-white">
                    <span className="bg-[#2F7D16] text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full inline-block mb-1">
                      Certified Mentors
                    </span>
                    <h3 className="text-sm font-bold font-heading">
                      Guiding 10,000+ Fitness Milestones
                    </h3>
                  </div>
                </div>

                {/* Micro Stats Card */}
                <div className="bg-[#F7FAF4] rounded-2xl p-3 border border-[#E5E7E2] flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-nutri-muted block uppercase">Client Satisfaction</span>
                    <span className="text-sm font-black text-nutri-charcoal flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" /> 4.9 / 5.0
                    </span>
                  </div>
                  <div className="w-px h-8 bg-neutral-200" />
                  <div>
                    <span className="text-[10px] font-bold text-nutri-muted block uppercase">Verified Coaches</span>
                    <span className="text-sm font-black text-[#2F7D16]">100% Vetted</span>
                  </div>
                  <div className="w-px h-8 bg-neutral-200" />
                  <div>
                    <span className="text-[10px] font-bold text-nutri-muted block uppercase">Sessions</span>
                    <span className="text-sm font-black text-nutri-charcoal">Flexible</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION B: CHOOSE YOUR FITNESS GOAL                            */}
      {/* ============================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-1.5">
          <Badge
            variant="gold"
            className="bg-[#EAF4E3] text-[#2F7D16] border-[#2F7D16]/20 text-[11px] font-extrabold"
          >
            TARGETED COACHING
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Choose Your Fitness Goal
          </h2>
          <p className="text-xs sm:text-sm text-nutri-secondary">
            Select what you are working towards to discover coaches specialized in your journey.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FITNESS_GOALS.map((goal) => {
            const Icon = goal.icon;
            const isSelected = selectedSpec === goal.queryMatch;

            return (
              <div
                key={goal.id}
                onClick={() => handleSelectGoal(goal.queryMatch)}
                className={`group rounded-3xl p-5 border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 shadow-2xs hover:shadow-md hover:-translate-y-0.5 ${
                  isSelected
                    ? "bg-[#EAF4E3]/70 border-[#2F7D16] ring-2 ring-[#2F7D16]/30"
                    : "bg-white border-[#E5E7E2] hover:border-[#2F7D16]"
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${goal.iconBg} shadow-2xs`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    {isSelected && (
                      <span className="text-[10px] font-extrabold bg-[#2F7D16] text-white px-2 py-0.5 rounded-full">
                        Active Filter
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold font-heading text-nutri-charcoal group-hover:text-[#2F7D16] transition-colors">
                    {goal.title}
                  </h3>

                  <p className="text-xs text-nutri-secondary leading-relaxed">
                    {goal.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E5E7E2]/60 flex items-center justify-between text-xs font-bold text-[#2F7D16]">
                  <span>Explore Coaches</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION C: MEET YOUR HEALTH COACHES (LISTINGS & FILTERS)        */}
      {/* ============================================================== */}
      <section ref={coachesSectionRef} id="coaches-catalog" className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-[#E5E7E2] pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                Meet Your Health Coaches
              </h2>
              <span className="text-xs font-bold bg-[#EAF4E3] text-[#2F7D16] px-2.5 py-0.5 rounded-full">
                {dietitians.length} Mentors
              </span>
            </div>
            <p className="text-xs sm:text-sm text-nutri-secondary mt-1">
              Personalised fitness mentorship, nutrition accountability, and workout guidance.
            </p>
          </div>

          {selectedSpec !== "All" && (
            <button
              onClick={() => setSelectedSpec("All")}
              className="text-xs font-bold text-rose-700 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Reset to All Coaches (✕)
            </button>
          )}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-[#E5E7E2] rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nutri-secondary" />
              <input
                type="text"
                placeholder="Search coaches by name, training specialty, or goals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-full pl-9 pr-4 py-2.5 text-xs sm:text-sm font-medium placeholder:text-nutri-muted text-nutri-charcoal focus:outline-none focus:border-[#2F7D16] focus:bg-white transition-all"
              />
            </div>

            {/* Quick Fee & Experience Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Filter by maximum consultation fee"
                value={maxFee || ""}
                onChange={(e) => setMaxFee(e.target.value ? Number(e.target.value) : null)}
                className="bg-white border border-[#E5E7E2] text-xs font-semibold rounded-full px-3 py-2 text-nutri-charcoal focus:outline-none focus:border-[#2F7D16]"
              >
                <option value="">Any Session Fee</option>
                <option value="600">Under ₹600</option>
                <option value="800">Under ₹800</option>
                <option value="1000">Under ₹1,000</option>
              </select>

              <select
                aria-label="Filter by minimum years of experience"
                value={minExp || ""}
                onChange={(e) => setMinExp(e.target.value ? Number(e.target.value) : null)}
                className="bg-white border border-[#E5E7E2] text-xs font-semibold rounded-full px-3 py-2 text-nutri-charcoal focus:outline-none focus:border-[#2F7D16]"
              >
                <option value="">Any Experience</option>
                <option value="4">4+ Years</option>
                <option value="6">6+ Years</option>
                <option value="8">8+ Years</option>
              </select>

              <select
                aria-label="Filter by coaching language"
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-white border border-[#E5E7E2] text-xs font-semibold rounded-full px-3 py-2 text-nutri-charcoal focus:outline-none focus:border-[#2F7D16]"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang}>
                    {lang === "All" ? "All Languages" : lang}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Goal & Specialization Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-[#E5E7E2]/60">
            <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider mr-1 shrink-0">
              Focus:
            </span>
            {SPECIALIZATION_FILTERS.map((spec) => {
              const isSelected = selectedSpec === spec;
              return (
                <button
                  key={spec}
                  onClick={() => setSelectedSpec(spec)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-[#2F7D16] text-white border-[#2F7D16] font-bold shadow-xs"
                      : "bg-[#F3F7EE]/60 text-nutri-secondary border-[#E5E7E2] hover:border-[#2F7D16] hover:text-nutri-charcoal"
                  }`}
                >
                  {spec}
                </button>
              );
            })}
          </div>
        </div>

        {/* Coach Cards Grid */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#2F7D16] animate-spin mx-auto" />
            <p className="text-xs font-bold text-nutri-secondary">Loading certified health coaches...</p>
          </div>
        ) : error ? (
          <div className="py-14 px-6 max-w-md mx-auto text-center bg-white border border-[#E5E7E2] rounded-3xl shadow-sm space-y-3">
            <p className="text-sm font-bold text-rose-700">{error}</p>
            <Button
              onClick={fetchDietitians}
              className="bg-[#2F7D16] text-white rounded-full text-xs px-5 py-2 font-bold hover:bg-[#24630F]"
            >
              Retry Search
            </Button>
          </div>
        ) : dietitians.length === 0 ? (
          <div className="py-16 px-6 text-center bg-white border border-[#E5E7E2] rounded-3xl space-y-3">
            <div className="w-12 h-12 rounded-full bg-[#EAF4E3] text-[#2F7D16] mx-auto flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold font-heading text-nutri-charcoal">
              No Coaches Match Your Selected Filters
            </h3>
            <p className="text-xs text-nutri-secondary max-w-sm mx-auto leading-relaxed">
              Try resetting your search or specialization filters. Only verified fitness, nutrition and
              lifestyle mentors appear in the directory.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setSelectedSpec("All");
                setSelectedLang("All");
                setMaxFee(null);
                setMinExp(null);
              }}
              className="rounded-full text-xs font-bold border-[#E5E7E2] hover:border-[#2F7D16]"
            >
              Clear All Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dietitians.map((d) => (
              <div
                key={d.id}
                className="group bg-white rounded-3xl p-5 border border-[#E5E7E2] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top Profile Header */}
                  <div className="flex items-start gap-3.5">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden bg-neutral-100 shrink-0 border border-[#E5E7E2]">
                      <Image
                        src={
                          d.profileImageUrl ||
                          "https://images.unsplash.com/photo-1594824813511-236be048b64a?auto=format&fit=crop&w=400&q=80"
                        }
                        alt={d.fullName}
                        fill
                        sizes="64px"
                        loading="lazy"
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h3 className="text-base font-bold font-heading text-nutri-charcoal leading-snug group-hover:text-[#2F7D16] transition-colors truncate">
                          {d.fullName}
                        </h3>
                        {d.isVerified && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 shrink-0"
                            title="Admin-Verified Health & Fitness Coach"
                          >
                            <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 fill-emerald-600" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-nutri-secondary mt-0.5 line-clamp-1 font-medium">
                        {d.qualifications}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 text-[11px] text-nutri-secondary">
                        <span className="inline-flex items-center gap-1 font-bold text-amber-800">
                          <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                          {d.rating.toFixed(1)}
                        </span>
                        {d.reviewCount > 0 && (
                          <span className="text-nutri-muted">({d.reviewCount} reviews)</span>
                        )}
                        <span>•</span>
                        <span className="font-semibold text-nutri-charcoal">
                          {d.experienceYears}+ yrs exp
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Short Bio / Coaching Philosophy */}
                  <p className="text-xs text-nutri-secondary line-clamp-2 leading-relaxed">
                    {d.bio}
                  </p>

                  {/* Specialization Badges */}
                  <div className="flex flex-wrap gap-1.5">
                    {d.specializations.slice(0, 3).map((spec, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-[#F3F7EE] text-[#2F7D16] border border-[#2F7D16]/20"
                      >
                        {spec}
                      </span>
                    ))}
                    {d.specializations.length > 3 && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600">
                        +{d.specializations.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Languages & Formats */}
                  <div className="flex items-center justify-between text-[11px] text-nutri-secondary pt-2 border-t border-[#E5E7E2]/70">
                    <div className="flex items-center gap-1">
                      <Languages className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{d.languages.join(", ")}</span>
                    </div>
                    <span className="text-[10px] font-medium text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full">
                      {d.availableFormats.join(" & ")}
                    </span>
                  </div>
                </div>

                {/* Bottom Card Footer */}
                <div className="pt-4 mt-4 border-t border-[#E5E7E2]/70 flex items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-medium text-nutri-muted block">Session Fee</span>
                    <span className="text-base font-extrabold font-heading text-nutri-charcoal">
                      {formatPrice(d.consultationFee)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/dietitians/${d.id}`}
                      className="text-xs font-bold px-3 py-1.5 rounded-full border border-[#E5E7E2] hover:border-[#2F7D16] text-nutri-charcoal hover:text-[#2F7D16] transition-colors"
                    >
                      View Profile
                    </Link>
                    <Link
                      href={`/dietitians/${d.id}?book=true`}
                      className="text-xs font-bold px-3.5 py-1.5 rounded-full bg-[#2F7D16] text-white hover:bg-[#24630F] shadow-2xs transition-colors flex items-center gap-1"
                    >
                      <span>Book Session</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* SECTION D: HOW COACHING WORKS                                  */}
      {/* ============================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-1.5">
          <Badge
            variant="gold"
            className="bg-[#EAF4E3] text-[#2F7D16] border-[#2F7D16]/20 text-[11px] font-extrabold"
          >
            SIMPLE 3-STEP JOURNEY
          </Badge>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            How Coaching Works
          </h2>
          <p className="text-xs sm:text-sm text-nutri-secondary">
            Structured fitness and nutrition mentorship designed to fit your everyday routine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 space-y-3 shadow-2xs relative">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF4E3] text-[#2F7D16] font-black text-sm flex items-center justify-center">
              01
            </div>
            <h3 className="text-base font-bold font-heading text-nutri-charcoal">
              Choose Your Coach
            </h3>
            <p className="text-xs text-nutri-secondary leading-relaxed">
              Select a certified mentor based on your fitness goal — whether fat loss, hypertrophy, strength training, or building consistency.
            </p>
          </div>

          <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 space-y-3 shadow-2xs relative">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF4E3] text-[#2F7D16] font-black text-sm flex items-center justify-center">
              02
            </div>
            <h3 className="text-base font-bold font-heading text-nutri-charcoal">
              Create Your Plan
            </h3>
            <p className="text-xs text-nutri-secondary leading-relaxed">
              Discuss your personal targets, gym routine, food preferences, and daily schedule during a dedicated 1-on-1 session.
            </p>
          </div>

          <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 space-y-3 shadow-2xs relative">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF4E3] text-[#2F7D16] font-black text-sm flex items-center justify-center">
              03
            </div>
            <h3 className="text-base font-bold font-heading text-nutri-charcoal">
              Track Your Progress
            </h3>
            <p className="text-xs text-nutri-secondary leading-relaxed">
              Log meals, track daily protein, stay consistent with workout routines, and review milestones regularly with your coach.
            </p>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION E: AI COACH PROMOTION                                  */}
      {/* ============================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-r from-[#111B0F] via-[#1E3A1E] to-[#111B0F] text-white rounded-3xl p-8 sm:p-10 shadow-float border border-[#2F7D16]/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#2F7D16]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-8 space-y-4">
              <Badge
                variant="gold"
                className="bg-[#2F7D16] text-white border-none font-extrabold text-[11px] px-3 py-1 inline-flex items-center gap-1.5"
              >
                <Bot className="w-3.5 h-3.5 text-[#86EFAC]" />
                <span>INTELLIGENT COMPANION</span>
              </Badge>

              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-heading text-white tracking-tight">
                Your Personal AI Health Coach. <br />
                <span className="text-[#86EFAC]">Always Here.</span>
              </h2>

              <p className="text-xs sm:text-sm text-neutral-300 max-w-xl leading-relaxed">
                Get instant guidance, smarter food suggestions and personalised insights based on your nutrition and fitness journey. Connected directly to your live tracker and NutriFlexs menu.
              </p>

              <div className="pt-2 flex flex-wrap items-center gap-4">
                <Link href="/ai-coach">
                  <Button
                    size="lg"
                    className="bg-[#2F7D16] hover:bg-[#24630F] text-white font-extrabold text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-lg shadow-[#2F7D16]/30 flex items-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    <Bot className="w-4 h-4 text-[#86EFAC]" />
                    <span>Start AI Coaching</span>
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>

                <span className="text-xs text-neutral-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#86EFAC]" /> Free with your NutriFlexs account
                </span>
              </div>
            </div>

            {/* Micro Preview of Chat Bubble */}
            <div className="lg:col-span-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-[#86EFAC] font-bold text-[11px]">
                <Bot className="w-4 h-4" />
                <span>Live Insight Preview</span>
              </div>
              <p className="text-white/90 leading-snug">
                &ldquo;You’ve crushed 92g of protein today! To hit your 120g target, grab our Lean Grilled Chicken Breast or High-Protein Paneer Bowl for 28g+ clean protein.&rdquo;
              </p>
              <div className="pt-1 text-[10px] text-neutral-400 font-medium">
                • Real food calculations • Zero guesses
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* SECTION F: ETHICAL & QUALIFICATION NOTICE                      */}
      {/* ============================================================== */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-2xl p-4 text-center text-xs text-nutri-secondary space-y-1">
          <p className="font-semibold text-nutri-charcoal">
            🛡️ Coaching Transparency &amp; Health Disclaimer
          </p>
          <p className="text-[11px] leading-relaxed max-w-2xl mx-auto text-nutri-muted">
            NutriFlexs Health Coaches are certified fitness trainers, sports nutrition specialists, and registered dietitians.
            Individual credentials, certifications, and areas of expertise are displayed transparently on each coach profile.
            Coaching is focused on fitness mentorship, lifestyle habit building, and general nutrition support. It is not acute medical treatment or hospital care.
          </p>
        </div>
      </section>
    </div>
  );
}
