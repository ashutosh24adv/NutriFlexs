"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Utensils,
  Flame,
  Building2,
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  MapPin,
  Phone,
  Mail,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SUBJECT_OPTIONS = [
  "General Enquiry",
  "Food Order Support",
  "Nutrition Tracker Support",
  "AI Meal Scanner Support",
  "Payment Issue",
  "Gym Partnership",
  "Trainer Partnership",
  "Feedback or Suggestion",
  "Other",
] as const;

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    category: "General Enquiry",
    orderId: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<{
    submissionId: string;
    message: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) setError(null);
  };

  const handleSelectCategory = (cat: string) => {
    setFormData((prev) => ({ ...prev, category: cat }));
    if (error) setError(null);
    const formElement = document.getElementById("contact-form-section");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic client validation
    if (!formData.name.trim()) {
      setError("Please enter your full name.");
      return;
    }
    if (!formData.email.trim() || !formData.email.includes("@")) {
      setError("Please provide a valid email address.");
      return;
    }
    if (!formData.message.trim() || formData.message.trim().length < 10) {
      setError("Please provide a message with at least 10 characters.");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim() || undefined,
          category: formData.category,
          orderId: formData.orderId.trim() || undefined,
          message: formData.message.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to submit your message. Please try again.");
      }

      setSuccessData({
        submissionId: data.submissionId || "NF-INQUIRY",
        message: data.message || "Your message has been received.",
      });
    } catch (err: any) {
      console.error("Contact submission error:", err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-nutri-bg">
      {/* =========================================================================
          1. HERO SECTION
          ========================================================================= */}
      <section className="relative overflow-hidden pt-12 pb-10 sm:pt-16 sm:pb-14 border-b border-nutri-border/60 bg-gradient-to-b from-nutri-green-soft/50 via-nutri-bg to-nutri-bg">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-nutri-green-light/40 rounded-full blur-3xl pointer-events-none -z-10" />

        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-4">
          <Badge
            variant="green"
            className="text-xs uppercase font-extrabold tracking-wider px-3.5 py-1 inline-flex items-center gap-1.5 shadow-2xs"
          >
            <MessageSquare className="w-3.5 h-3.5 text-nutri-green" />
            <span>WE&apos;RE HERE TO HELP</span>
          </Badge>

          <h1 className="text-3xl sm:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Let&apos;s Talk!
          </h1>

          <p className="text-sm sm:text-base text-nutri-secondary max-w-2xl mx-auto leading-relaxed">
            Have a question, suggestion or need assistance? We&apos;re here to help.
          </p>
        </div>
      </section>

      {/* =========================================================================
          2. CONTACT CATEGORIES (4 INFORMATION CARDS)
          ========================================================================= */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="text-center space-y-1 mb-8">
          <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
            Choose a Support Channel
          </h2>
          <p className="text-xs sm:text-sm text-nutri-secondary">
            Select the topic that best matches your inquiry to route your request directly.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Card 1: General Enquiries */}
          <Card
            onClick={() => handleSelectCategory("General Enquiry")}
            className={cn(
              "p-6 rounded-3xl border bg-white shadow-xs space-y-3 transition-all cursor-pointer flex flex-col justify-between",
              formData.category === "General Enquiry"
                ? "border-nutri-green ring-1 ring-nutri-green shadow-card"
                : "border-nutri-border hover:border-nutri-green/40 hover:shadow-float"
            )}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center font-bold text-lg shrink-0">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-nutri-charcoal font-heading">
                  General Enquiries
                </h3>
                <p className="text-xs text-nutri-secondary mt-1.5 leading-relaxed">
                  General questions about NutriFlexs, platform features, or media inquiries.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-nutri-border-light text-xs font-bold text-nutri-green flex items-center justify-between">
              <span>Select Category</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Card>

          {/* Card 2: Order Support */}
          <Card
            onClick={() => handleSelectCategory("Food Order Support")}
            className={cn(
              "p-6 rounded-3xl border bg-white shadow-xs space-y-3 transition-all cursor-pointer flex flex-col justify-between",
              formData.category === "Food Order Support"
                ? "border-nutri-green ring-1 ring-nutri-green shadow-card"
                : "border-nutri-border hover:border-nutri-green/40 hover:shadow-float"
            )}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center font-bold text-lg shrink-0">
                <Utensils className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-nutri-charcoal font-heading">
                  Order Support
                </h3>
                <p className="text-xs text-nutri-secondary mt-1.5 leading-relaxed">
                  Need assistance with express kiosk pickups, real-time prep status, or meal orders.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-nutri-border-light text-xs font-bold text-nutri-green flex items-center justify-between">
              <span>Select Category</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Card>

          {/* Card 3: Nutrition Support */}
          <Card
            onClick={() => handleSelectCategory("Nutrition Tracker Support")}
            className={cn(
              "p-6 rounded-3xl border bg-white shadow-xs space-y-3 transition-all cursor-pointer flex flex-col justify-between",
              formData.category === "Nutrition Tracker Support"
                ? "border-nutri-green ring-1 ring-nutri-green shadow-card"
                : "border-nutri-border hover:border-nutri-green/40 hover:shadow-float"
            )}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center font-bold text-lg shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-nutri-charcoal font-heading">
                  Nutrition Support
                </h3>
                <p className="text-xs text-nutri-secondary mt-1.5 leading-relaxed">
                  Questions regarding calorie targets, Indian gravy precision tracking, or AI meal scanning.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-nutri-border-light text-xs font-bold text-nutri-green flex items-center justify-between">
              <span>Select Category</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Card>

          {/* Card 4: Business Partnerships */}
          <Card
            onClick={() => handleSelectCategory("Gym Partnership")}
            className={cn(
              "p-6 rounded-3xl border bg-white shadow-xs space-y-3 transition-all cursor-pointer flex flex-col justify-between",
              formData.category === "Gym Partnership" || formData.category === "Trainer Partnership"
                ? "border-nutri-green ring-1 ring-nutri-green shadow-card"
                : "border-nutri-border hover:border-nutri-green/40 hover:shadow-float"
            )}
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center font-bold text-lg shrink-0">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-nutri-charcoal font-heading">
                  Business Partnerships
                </h3>
                <p className="text-xs text-nutri-secondary mt-1.5 leading-relaxed">
                  Explore setting up an express kiosk at your gym or joining our certified trainer network.
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-nutri-border-light text-xs font-bold text-nutri-green flex items-center justify-between">
              <span>Select Category</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </Card>
        </div>
      </section>

      {/* =========================================================================
          3. CONTACT FORM & SUBMISSION HANDLING
          ========================================================================= */}
      <section id="contact-form-section" className="max-w-3xl mx-auto px-4 sm:px-6 pb-20">
        <Card className="p-6 sm:p-10 rounded-3xl border border-nutri-border bg-white shadow-card">
          {successData ? (
            /* =====================================================================
               SUBMISSION SUCCESS SCREEN
               ===================================================================== */
            <div className="text-center py-6 sm:py-8 space-y-6 animate-in fade-in duration-300">
              <div className="w-16 h-16 rounded-full bg-nutri-green-light text-nutri-green flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div className="space-y-2">
                <Badge variant="green" className="text-xs font-bold px-3 py-0.5">
                  MESSAGE CONFIRMED
                </Badge>
                <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                  Thank You for Reaching Out!
                </h2>
                <p className="text-xs sm:text-sm text-nutri-secondary max-w-md mx-auto leading-relaxed">
                  Your message has been received. Our team will review it.
                </p>
              </div>

              {/* Inquiry Reference Summary */}
              <div className="p-4 bg-nutri-green-soft rounded-2xl border border-nutri-border max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between items-center text-nutri-secondary">
                  <span>Reference ID:</span>
                  <span className="font-mono font-bold text-nutri-charcoal">{successData.submissionId}</span>
                </div>
                <div className="flex justify-between items-center text-nutri-secondary">
                  <span>Category:</span>
                  <span className="font-bold text-nutri-green">{formData.category}</span>
                </div>
                <div className="flex justify-between items-center text-nutri-secondary">
                  <span>Contact Email:</span>
                  <span className="font-semibold text-nutri-charcoal">{formData.email}</span>
                </div>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link href="/" className="w-full sm:w-auto">
                  <Button
                    size="md"
                    className="w-full bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs px-6 py-3 rounded-full cursor-pointer shadow-xs"
                  >
                    Return to NutriFlexs
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="md"
                  onClick={() => {
                    setSuccessData(null);
                    setFormData({
                      name: "",
                      email: "",
                      phone: "",
                      category: "General Enquiry",
                      orderId: "",
                      message: "",
                    });
                  }}
                  className="w-full sm:w-auto text-xs font-bold rounded-full cursor-pointer"
                >
                  Send Another Message
                </Button>
              </div>
            </div>
          ) : (
            /* =====================================================================
               INTERACTIVE CONTACT FORM
               ===================================================================== */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
                  Send Us a Message
                </h2>
                <p className="text-xs sm:text-sm text-nutri-secondary">
                  Fill out the form below and we will get back to you promptly.
                </p>
              </div>

              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Full Name */}
                <div className="space-y-1.5">
                  <label htmlFor="name" className="block text-xs font-bold text-nutri-charcoal">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-4 py-2.5 bg-nutri-bg border border-nutri-border rounded-xl text-xs sm:text-sm text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:ring-2 focus:ring-nutri-green/30 focus:border-nutri-green transition-all"
                  />
                </div>

                {/* Email Address */}
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-xs font-bold text-nutri-charcoal">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="e.g. rahul@example.com"
                    className="w-full px-4 py-2.5 bg-nutri-bg border border-nutri-border rounded-xl text-xs sm:text-sm text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:ring-2 focus:ring-nutri-green/30 focus:border-nutri-green transition-all"
                  />
                </div>

                {/* Phone Number (Optional) */}
                <div className="space-y-1.5">
                  <label htmlFor="phone" className="block text-xs font-bold text-nutri-charcoal">
                    Phone Number <span className="text-nutri-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full px-4 py-2.5 bg-nutri-bg border border-nutri-border rounded-xl text-xs sm:text-sm text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:ring-2 focus:ring-nutri-green/30 focus:border-nutri-green transition-all"
                  />
                </div>

                {/* Subject / Enquiry Category */}
                <div className="space-y-1.5">
                  <label htmlFor="category" className="block text-xs font-bold text-nutri-charcoal">
                    Subject / Category <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2.5 bg-nutri-bg border border-nutri-border rounded-xl text-xs sm:text-sm text-nutri-charcoal focus:outline-none focus:ring-2 focus:ring-nutri-green/30 focus:border-nutri-green transition-all"
                  >
                    {SUBJECT_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Related Order ID (Optional) */}
              {(formData.category === "Food Order Support" || formData.category === "Payment Issue") && (
                <div className="space-y-1.5 animate-in fade-in duration-200">
                  <label htmlFor="orderId" className="block text-xs font-bold text-nutri-charcoal">
                    Related Order ID <span className="text-nutri-muted font-normal">(Optional)</span>
                  </label>
                  <input
                    id="orderId"
                    name="orderId"
                    type="text"
                    value={formData.orderId}
                    onChange={handleChange}
                    placeholder="e.g. ord_clx123abc456"
                    className="w-full px-4 py-2.5 bg-nutri-bg border border-nutri-border rounded-xl text-xs sm:text-sm text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:ring-2 focus:ring-nutri-green/30 focus:border-nutri-green transition-all"
                  />
                </div>
              )}

              {/* Message */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label htmlFor="message" className="block text-xs font-bold text-nutri-charcoal">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[10px] text-nutri-muted">
                    {formData.message.length} / 2000
                  </span>
                </div>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={5}
                  value={formData.message}
                  onChange={handleChange}
                  maxLength={2000}
                  placeholder="Please describe how we can assist you with your orders, nutrition tracking or partnership inquiries..."
                  className="w-full p-4 bg-nutri-bg border border-nutri-border rounded-2xl text-xs sm:text-sm text-nutri-charcoal placeholder:text-nutri-muted focus:outline-none focus:ring-2 focus:ring-nutri-green/30 focus:border-nutri-green transition-all resize-y"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <Button
                  type="submit"
                  size="lg"
                  disabled={loading}
                  className="w-full sm:w-auto bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-sm px-8 py-3.5 rounded-full shadow-xs cursor-pointer flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Sending Message...</span>
                    </>
                  ) : (
                    <>
                      <span>Send Message</span>
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </Card>
      </section>
    </div>
  );
}
