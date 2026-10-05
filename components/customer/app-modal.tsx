"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Smartphone, Sparkles, X, ArrowRight, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface OpenAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenAppModal({ isOpen, onClose }: OpenAppModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-float border border-nutri-border p-6 sm:p-7 z-10 overflow-hidden space-y-5 animate-slide-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-nutri-secondary hover:text-nutri-charcoal hover:bg-nutri-green-soft transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5 stroke-[2.2]" />
        </button>

        {/* Header Icon & Tag */}
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-nutri-green-light text-nutri-green flex items-center justify-center">
            <Smartphone className="w-6 h-6 stroke-[2.2]" />
          </div>

          <div className="space-y-1">
            <Badge variant="gold" className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-[11px] px-2.5 py-0.5">
              <Sparkles className="w-3 h-3 mr-1 fill-nutri-green" /> MOBILE APP IN DEVELOPMENT
            </Badge>
            <h3 className="text-xl font-extrabold font-heading text-nutri-charcoal">
              NutriFlexs Mobile App
            </h3>
            <p className="text-xs text-nutri-muted leading-relaxed">
              We are actively developing the official NutriFlexs Android &amp; iOS apps with instant gym kiosk express pickup &amp; live kitchen tracking.
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div className="bg-nutri-bg rounded-2xl p-4 border border-nutri-border space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-nutri-charcoal">
            <Zap className="w-4 h-4 text-nutri-green shrink-0" />
            <span>5-minute pickup at express gym kiosks</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-nutri-charcoal">
            <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
            <span>Full macro breakdown on cold-pressed juices &amp; fuel bowls</span>
          </div>
          <div className="flex items-center gap-2 font-semibold text-nutri-charcoal">
            <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0" />
            <span>Instant web ordering available now with zero setup</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <Link href="/home" onClick={onClose} className="block w-full">
            <Button
              className="w-full bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-sm py-3 rounded-2xl cursor-pointer shadow-xs flex items-center justify-center gap-2"
            >
              Continue on Web App <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-nutri-secondary hover:text-nutri-charcoal transition-colors cursor-pointer text-center"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
