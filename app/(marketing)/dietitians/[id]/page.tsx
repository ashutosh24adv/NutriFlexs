"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Calendar,
  Clock,
  Star,
  CheckCircle2,
  Languages,
  ShieldCheck,
  Video,
  MapPin,
  HeartPulse,
  Sparkles,
  ArrowLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  Check,
  MessageCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

interface DietitianProfile {
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
  availabilities: any[];
  reviews: any[];
}

export default function DietitianProfilePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoOpenBooking = searchParams.get("book") === "true";
  const { data: session } = useSession();

  const [dietitian, setDietitian] = useState<DietitianProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Booking Form State
  const [selectedFormat, setSelectedFormat] = useState<string>("ONLINE");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1); // default to tomorrow
    return d.toISOString().split("T")[0];
  });
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [primaryConcern, setPrimaryConcern] = useState<string>("");
  const [healthNotes, setHealthNotes] = useState<string>("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [bookedConsultation, setBookedConsultation] = useState<any | null>(null);

  // Fetch dietitian data
  const fetchDietitian = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dietitians/${params.id}`);
      const data = await res.json();
      if (data.success && data.dietitian) {
        setDietitian(data.dietitian);
        if (data.dietitian.availableFormats?.length > 0) {
          setSelectedFormat(data.dietitian.availableFormats[0]);
        }
      } else {
        setError(data.error || "Dietitian profile not found");
      }
    } catch {
      setError("Failed to load dietitian profile.");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchDietitian();
  }, [fetchDietitian]);

  // Fetch slots whenever selectedDate changes
  const fetchSlots = useCallback(async () => {
    if (!params.id || !selectedDate) return;
    setLoadingSlots(true);
    try {
      const res = await fetch(`/api/dietitians/${params.id}/slots?date=${selectedDate}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.slots)) {
        setAvailableSlots(data.slots);
        if (data.slots.length > 0) {
          setSelectedSlot(data.slots[0]);
        } else {
          setSelectedSlot("");
        }
      }
    } catch {
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }, [params.id, selectedDate]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Handle Booking Submission
  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      router.push(`/login?callbackUrl=/dietitians/${params.id}?book=true`);
      return;
    }

    if (!selectedSlot) {
      setBookingError("Please select an available consultation time slot.");
      return;
    }

    if (primaryConcern.trim().length < 5) {
      setBookingError("Please describe your primary goal or health concern (min 5 characters).");
      return;
    }

    setBookingLoading(true);
    setBookingError(null);

    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dietitianId: params.id,
          scheduledDate: selectedDate,
          timeSlot: selectedSlot,
          consultationType: selectedFormat,
          primaryConcern: primaryConcern.trim(),
          healthNotes: healthNotes.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (data.success && data.consultation) {
        setBookedConsultation(data.consultation);
      } else {
        setBookingError(data.error || "Failed to book appointment. Please select another slot.");
      }
    } catch {
      setBookingError("Network error while submitting booking. Please retry.");
    } finally {
      setBookingLoading(false);
    }
  };

  // Next 7 days list for date buttons
  const dateOptions = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i + 1);
    const dateStr = d.toISOString().split("T")[0];
    const dayName = d.toLocaleDateString("en-US", { weekday: "short" });
    const dayNum = d.getDate();
    const monthName = d.toLocaleDateString("en-US", { month: "short" });
    return { dateStr, dayName, dayNum, monthName };
  });

  if (loading) {
    return (
      <div className="min-h-screen py-24 text-center space-y-3 bg-[#FDFEFC]">
        <Loader2 className="w-8 h-8 text-[#2F7D16] animate-spin mx-auto" />
        <p className="text-xs font-bold text-nutri-secondary">Loading health coach profile...</p>
      </div>
    );
  }

  if (error || !dietitian) {
    return (
      <div className="min-h-screen py-24 px-4 max-w-md mx-auto text-center space-y-4 bg-[#FDFEFC]">
        <AlertCircle className="w-10 h-10 text-rose-600 mx-auto" />
        <h2 className="text-lg font-bold text-nutri-charcoal">Profile Unavailable</h2>
        <p className="text-xs text-nutri-secondary">{error || "Health coach profile not found"}</p>
        <Link href="/dietitians">
          <Button variant="outline" className="rounded-full text-xs font-bold">
            ← Back to Directory
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFEFC] pb-20">
      {/* Top Breadcrumb & Nav */}
      <div className="border-b border-[#E5E7E2]/70 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs font-medium text-nutri-secondary">
          <Link
            href="/dietitians"
            className="flex items-center gap-1.5 text-nutri-charcoal hover:text-[#2F7D16] transition-colors font-bold"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>All Health Coaches</span>
          </Link>
          <div className="flex items-center gap-2">
            <span>Health Coaches</span>
            <ChevronRight className="w-3 h-3 text-neutral-400" />
            <span className="text-[#2F7D16] font-bold">{dietitian.fullName}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Profile Details (7 Cols) */}
          <div className="lg:col-span-7 space-y-8">
            {/* Header Hero Card */}
            <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 shadow-2xs space-y-5">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
                <div className="relative w-24 h-24 rounded-3xl overflow-hidden bg-neutral-100 border-2 border-[#E5E7E2] shrink-0">
                  <Image
                    src={
                      dietitian.profileImageUrl ||
                      "https://images.unsplash.com/photo-1594824813511-236be048b64a?auto=format&fit=crop&w=400&q=80"
                    }
                    alt={dietitian.fullName}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                      {dietitian.fullName}
                    </h1>
                    {dietitian.isVerified && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 fill-emerald-600" />
                        Admin-Verified
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-semibold text-nutri-secondary">
                    {dietitian.qualifications}
                  </p>
                  <div className="flex items-center gap-3 pt-1 text-xs text-nutri-secondary">
                    <div className="flex items-center gap-1 font-bold text-amber-800">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>{dietitian.rating.toFixed(1)}</span>
                      {dietitian.reviewCount > 0 && (
                        <span className="text-nutri-muted font-normal">
                          ({dietitian.reviewCount} client reviews)
                        </span>
                      )}
                    </div>
                    <span>•</span>
                    <span className="font-semibold text-nutri-charcoal">
                      {dietitian.experienceYears}+ Years Experience
                    </span>
                  </div>
                </div>
              </div>

              {/* Languages & Consultation Formats Badges */}
              <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-[#E5E7E2]/70 text-xs">
                <div className="flex items-center gap-1.5 text-nutri-secondary">
                  <Languages className="w-4 h-4 text-[#2F7D16]" />
                  <span>Languages: <strong>{dietitian.languages.join(", ")}</strong></span>
                </div>
                <span className="text-neutral-300">•</span>
                <div className="flex items-center gap-1.5 text-nutri-secondary">
                  <Video className="w-4 h-4 text-[#2F7D16]" />
                  <span>Format: <strong>{dietitian.availableFormats.join(" & ")}</strong></span>
                </div>
              </div>
            </div>

            {/* About & Clinical Philosophy */}
            <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 shadow-2xs space-y-3">
              <h2 className="text-sm font-extrabold font-heading text-nutri-charcoal uppercase tracking-wider flex items-center gap-2">
                <HeartPulse className="w-4 h-4 text-[#2F7D16]" />
                Professional Background &amp; Philosophy
              </h2>
              <p className="text-xs sm:text-sm text-nutri-secondary leading-relaxed whitespace-pre-line">
                {dietitian.bio}
              </p>
            </div>

            {/* Focus Areas & Specializations */}
            <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 shadow-2xs space-y-3">
              <h2 className="text-sm font-extrabold font-heading text-nutri-charcoal uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#2F7D16]" />
                Specializations &amp; Focus Areas
              </h2>
              <div className="flex flex-wrap gap-2">
                {dietitian.specializations.map((spec, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-semibold px-3 py-1.5 rounded-full bg-[#EAF4E3] text-[#2F7D16] border border-[#2F7D16]/20"
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            {/* Reviews Section (Only genuine verified reviews) */}
            <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-extrabold font-heading text-nutri-charcoal uppercase tracking-wider flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                  Client Reviews &amp; Testimonials
                </h2>
                <span className="text-xs text-nutri-secondary font-semibold">
                  {dietitian.reviews?.length || 0} Verified Reviews
                </span>
              </div>

              {dietitian.reviews && dietitian.reviews.length > 0 ? (
                <div className="space-y-3 divide-y divide-[#E5E7E2]/70">
                  {dietitian.reviews.map((r, idx) => (
                    <div key={idx} className="pt-3 first:pt-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-nutri-charcoal">
                          {r.customer?.name || "Verified Client"}
                        </span>
                        <div className="flex items-center text-amber-500">
                          {Array.from({ length: r.rating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-500" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-nutri-secondary italic leading-relaxed">
                        &ldquo;{r.comment || "Exceptional consultation and practical nutrition targets."}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-nutri-secondary bg-[#F3F7EE]/60 rounded-2xl p-4">
                  <p className="font-semibold text-nutri-charcoal">No public reviews yet</p>
                  <p className="text-[11px] text-nutri-muted mt-0.5">
                    Be the first client to complete a consultation and leave a verified review.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Appointment Booking Widget (5 Cols) */}
          <div className="lg:col-span-5 sticky top-24">
            <div className="bg-white border border-[#E5E7E2] rounded-3xl p-6 shadow-md space-y-5">
              {bookedConsultation ? (
                /* Booking Success View */
                <div className="text-center py-4 space-y-4 animate-fade-in">
                  <div className="w-14 h-14 rounded-full bg-[#EAF4E3] text-[#2F7D16] mx-auto flex items-center justify-center">
                    <Check className="w-7 h-7 stroke-[3]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-extrabold font-heading text-nutri-charcoal">
                      Appointment Confirmed!
                    </h3>
                    <p className="text-xs text-nutri-secondary">
                      Your consultation with {dietitian.fullName} is scheduled for:
                    </p>
                    <p className="text-sm font-bold text-[#2F7D16] pt-1">
                      {new Date(bookedConsultation.scheduledDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "short",
                        day: "numeric",
                      })}{" "}
                      • {bookedConsultation.timeSlot}
                    </p>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-[#F3F7EE] text-xs text-nutri-charcoal text-left space-y-1.5 border border-[#E5E7E2]">
                    <div className="flex justify-between">
                      <span className="text-nutri-secondary">Format:</span>
                      <strong className="capitalize">{bookedConsultation.consultationType.toLowerCase()}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-nutri-secondary">Fee Paid:</span>
                      <strong className="text-[#2F7D16]">{formatPrice(bookedConsultation.fee)}</strong>
                    </div>
                    {bookedConsultation.meetingLink && (
                      <div className="pt-1.5 border-t border-[#E5E7E2]/70 text-right">
                        <a
                          href={bookedConsultation.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#2F7D16] font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <Video className="w-3.5 h-3.5" /> Join Video Room
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2 pt-2">
                    <Link
                      href={`/consultations/${bookedConsultation.id}/chat`}
                      className="w-full bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold text-xs py-2.5 rounded-full inline-flex items-center justify-center gap-2 shadow-xs transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Open Private Chat with Coach</span>
                    </Link>
                    <Link
                      href="/consultations"
                      className="w-full bg-white border border-[#E5E7E2] hover:border-[#2F7D16] text-nutri-charcoal font-bold text-xs py-2.5 rounded-full inline-flex items-center justify-center transition-colors"
                    >
                      View My Consultations
                    </Link>
                  </div>
                </div>
              ) : (
                /* Booking Form View */
                <form onSubmit={handleBookingSubmit} className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-[#E5E7E2]/70">
                    <div>
                      <h3 className="text-base font-extrabold font-heading text-nutri-charcoal">
                        Book Consultation
                      </h3>
                      <p className="text-[11px] text-nutri-secondary mt-0.5">
                        30-minute 1-on-1 personalized coaching session
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-nutri-muted uppercase block font-bold">Fee</span>
                      <span className="text-lg font-extrabold font-heading text-[#2F7D16]">
                        {formatPrice(dietitian.consultationFee)}
                      </span>
                    </div>
                  </div>

                  {bookingError && (
                    <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                      <span>{bookingError}</span>
                    </div>
                  )}

                  {/* 1. Format Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-nutri-charcoal block">
                      1. Consultation Format:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {dietitian.availableFormats.includes("ONLINE") && (
                        <button
                          type="button"
                          onClick={() => setSelectedFormat("ONLINE")}
                          className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            selectedFormat === "ONLINE"
                              ? "bg-[#EAF4E3] border-[#2F7D16] text-[#2F7D16] shadow-2xs"
                              : "bg-white border-[#E5E7E2] text-nutri-secondary hover:border-[#2F7D16]"
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Online Video</span>
                        </button>
                      )}
                      {dietitian.availableFormats.includes("IN_PERSON") && (
                        <button
                          type="button"
                          onClick={() => setSelectedFormat("IN_PERSON")}
                          className={`p-2.5 rounded-2xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            selectedFormat === "IN_PERSON"
                              ? "bg-[#EAF4E3] border-[#2F7D16] text-[#2F7D16] shadow-2xs"
                              : "bg-white border-[#E5E7E2] text-nutri-secondary hover:border-[#2F7D16]"
                          }`}
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Gym Kiosk Suite</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 2. Select Date */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-nutri-charcoal block">
                      2. Select Date:
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
                      {dateOptions.map((opt) => {
                        const isSelected = selectedDate === opt.dateStr;
                        return (
                          <button
                            key={opt.dateStr}
                            type="button"
                            onClick={() => setSelectedDate(opt.dateStr)}
                            className={`p-2 rounded-2xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? "bg-[#2F7D16] text-white border-[#2F7D16] shadow-xs"
                                : "bg-white text-nutri-secondary border-[#E5E7E2] hover:border-[#2F7D16] hover:text-nutri-charcoal"
                            }`}
                          >
                            <span className="block text-[10px] font-medium opacity-80 uppercase">
                              {opt.dayName}
                            </span>
                            <span className="block text-sm font-extrabold">{opt.dayNum}</span>
                            <span className="block text-[9px] font-medium opacity-75">{opt.monthName}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* 3. Available Time Slots */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-nutri-charcoal">
                        3. Available Time Slots:
                      </label>
                      {loadingSlots && (
                        <span className="text-[10px] text-nutri-secondary flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin text-[#2F7D16]" /> Checking...
                        </span>
                      )}
                    </div>

                    {loadingSlots ? (
                      <div className="py-6 text-center text-xs text-nutri-secondary">
                        Checking calendar slots...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <div className="p-3 text-center bg-[#F3F7EE]/60 border border-[#E5E7E2] rounded-2xl text-xs text-nutri-secondary">
                        No open slots on this date. Please select another day.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                        {availableSlots.map((slot) => {
                          const isSelected = selectedSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              onClick={() => setSelectedSlot(slot)}
                              className={`p-2 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                isSelected
                                  ? "bg-[#2F7D16] text-white border-[#2F7D16] shadow-xs"
                                  : "bg-white text-nutri-secondary border-[#E5E7E2] hover:border-[#2F7D16] hover:text-nutri-charcoal"
                              }`}
                            >
                              <Clock className="w-3 h-3 shrink-0" />
                              <span>{slot}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* 4. Primary Concern / Health Goal */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-nutri-charcoal block">
                      4. Your Goal or Primary Health Concern:
                    </label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g. Fat loss plateau, athletic meal timing, or PCOS hormonal regulation..."
                      value={primaryConcern}
                      onChange={(e) => setPrimaryConcern(e.target.value)}
                      className="w-full bg-[#F3F7EE]/40 border border-[#E5E7E2] rounded-2xl p-2.5 text-xs text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:border-[#2F7D16] focus:bg-white transition-all"
                    />
                  </div>

                  {/* 5. Health Notes (Optional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-nutri-charcoal flex items-center justify-between">
                      <span>5. Allergies / Dietary Restrictions:</span>
                      <span className="text-[10px] text-nutri-muted font-normal">(Optional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Lactose intolerant, nut allergy, strictly vegetarian..."
                      value={healthNotes}
                      onChange={(e) => setHealthNotes(e.target.value)}
                      className="w-full bg-[#F3F7EE]/40 border border-[#E5E7E2] rounded-2xl px-3 py-2 text-xs text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:border-[#2F7D16] focus:bg-white transition-all"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={bookingLoading || !selectedSlot}
                    className="w-full bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold text-xs sm:text-sm py-3 rounded-full shadow-md shadow-[#2F7D16]/20 disabled:opacity-50 cursor-pointer transition-all"
                  >
                    {bookingLoading ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Verifying &amp; Reserving Slot...
                      </span>
                    ) : (
                      `Confirm & Book Consultation · ${formatPrice(dietitian.consultationFee)}`
                    )}
                  </Button>

                  <p className="text-[10px] text-center text-nutri-muted leading-tight">
                    Instant confirmation • Free cancellation up to 4 hours before session
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
