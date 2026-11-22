"use client";

import React, { useState, useEffect, useCallback } from "react";
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
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

const SPECIALIZATIONS = [
  "All",
  "Weight Management",
  "Sports Nutrition",
  "PCOS / Hormonal Health",
  "Diabetes & Gut Health",
  "Plant-Based & Vegetarian Diets",
  "Hypertrophy & Muscle Gain",
];

const LANGUAGES = ["All", "English", "Hindi", "Telugu", "Gujarati", "Kannada"];

export default function DietitiansPage() {
  const [dietitians, setDietitians] = useState<Dietitian[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSpec, setSelectedSpec] = useState("All");
  const [selectedLang, setSelectedLang] = useState("All");
  const [maxFee, setMaxFee] = useState<number | null>(null);
  const [minExp, setMinExp] = useState<number | null>(null);

  const fetchDietitians = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("search", searchQuery.trim());
      if (selectedSpec !== "All") params.set("specialization", selectedSpec);
      if (selectedLang !== "All") params.set("language", selectedLang);
      if (maxFee) params.set("maxFee", maxFee.toString());
      if (minExp) params.set("minExperience", minExp.toString());

      const res = await fetch(`/api/dietitians?${params.toString()}`);
      const data = await res.json();

      if (data.success && Array.isArray(data.dietitians)) {
        setDietitians(data.dietitians);
      } else {
        setError(data.error || "Failed to load dietitians");
      }
    } catch {
      setError("Network error loading dietitian directory. Please retry.");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, selectedSpec, selectedLang, maxFee, minExp]);

  useEffect(() => {
    fetchDietitians();
  }, [fetchDietitians]);

  return (
    <div className="min-h-screen bg-[#FDFEFC]">
      {/* Main Discovery Section */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-12 space-y-6 sm:space-y-8">
        {/* Search & Filter Toolbar */}
        <div className="bg-white border border-[#E5E7E2] rounded-3xl p-4 sm:p-6 shadow-2xs space-y-4 overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nutri-secondary" />
              <input
                type="text"
                placeholder="Search dietitians by name, qualifications, or specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-full pl-9 pr-4 py-2 text-xs sm:text-sm font-medium placeholder:text-nutri-muted text-nutri-charcoal focus:outline-none focus:border-[#2F7D16] focus:bg-white transition-all"
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
                <option value="">Any Consultation Fee</option>
                <option value="600">Under ₹600</option>
                <option value="800">Under ₹800</option>
                <option value="1000">Under ₹1,000</option>
              </select>

              <select
                aria-label="Filter by minimum years of clinical experience"
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
                aria-label="Filter by consultation language"
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

          {/* Specialization Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none pt-2 border-t border-[#E5E7E2]/60">
            <span className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider mr-1 shrink-0">
              Focus:
            </span>
            {SPECIALIZATIONS.map((spec) => {
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

        {/* 3. Results Section */}
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-8 h-8 text-[#2F7D16] animate-spin mx-auto" />
            <p className="text-xs font-bold text-nutri-secondary">Loading verified dietitians...</p>
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
              No Dietitians Match Your Selected Criteria
            </h3>
            <p className="text-xs text-nutri-secondary max-w-sm mx-auto leading-relaxed">
              Try clearing filters or search terms. Only verified, admin-approved clinical
              professionals appear in the public NutriFlexs directory.
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
                            title="Admin-Verified Professional Credential"
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

                  {/* Bio */}
                  <p className="text-xs text-nutri-secondary line-clamp-2 leading-relaxed">
                    {d.bio}
                  </p>

                  {/* Specialization Chips */}
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
                    <span className="text-[10px] font-medium text-nutri-muted block">Fee per session</span>
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
                      <span>Book</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 4. Medical Disclaimer Strip */}
        <div className="bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-2xl p-4 text-center text-xs text-nutri-secondary space-y-1">
          <p className="font-semibold text-nutri-charcoal">
            🛡️ Certified Nutrition Practice &amp; Medical Disclaimer
          </p>
          <p className="text-[11px] leading-relaxed max-w-2xl mx-auto text-nutri-muted">
            Consultations through NutriFlexs provide professional lifestyle, metabolic, and dietary
            guidance authored by accredited dietitians. They are not intended as substitutes for
            acute medical diagnosis, hospital emergency treatment, or prescription medicine.
          </p>
        </div>
      </div>
    </div>
  );
}
