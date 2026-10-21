"use client";

import React from "react";
import Link from "next/link";
import { ChefHat, Dumbbell, Shield, Lock, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StaffPortalItem {
  id: "kitchen" | "trainer" | "admin";
  name: string;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  loginHref: string;
  signupHref: string;
  borderColor: string;
  bgTint: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
  loginBtnClass: string;
  signupBtnClass: string;
}

export const STAFF_PORTALS: StaffPortalItem[] = [
  {
    id: "kitchen",
    name: "Kitchen Display Kiosk",
    tagline: "Order fulfillment & queue",
    icon: ChefHat,
    loginHref: "/login?portal=kitchen&callbackUrl=%2Fkitchen&staff=true",
    signupHref: "/signup?portal=kitchen&callbackUrl=%2Fkitchen&staff=true",
    borderColor: "border-amber-200/80 hover:border-amber-300",
    bgTint: "bg-amber-50/70",
    iconBg: "bg-amber-100",
    iconColor: "text-amber-700",
    textColor: "text-amber-950",
    loginBtnClass:
      "bg-white hover:bg-amber-100/90 text-amber-900 border border-amber-200/80",
    signupBtnClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-2xs",
  },
  {
    id: "trainer",
    name: "Trainer Partner Portal",
    tagline: "Referrals & rewards dashboard",
    icon: Dumbbell,
    loginHref: "/login?portal=trainer&callbackUrl=%2Ftrainer&staff=true",
    signupHref: "/signup?portal=trainer&callbackUrl=%2Ftrainer&staff=true",
    borderColor: "border-indigo-200/80 hover:border-indigo-300",
    bgTint: "bg-indigo-50/70",
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-700",
    textColor: "text-indigo-950",
    loginBtnClass:
      "bg-white hover:bg-indigo-100/90 text-indigo-900 border border-indigo-200/80",
    signupBtnClass: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-2xs",
  },
  {
    id: "admin",
    name: "Super Admin Operations",
    tagline: "System analytics & catalog ops",
    icon: Shield,
    loginHref: "/login?portal=admin&callbackUrl=%2Fadmin&staff=true",
    signupHref: "/signup?portal=admin&callbackUrl=%2Fadmin&staff=true",
    borderColor: "border-rose-200/80 hover:border-rose-300",
    bgTint: "bg-rose-50/70",
    iconBg: "bg-rose-100",
    iconColor: "text-rose-700",
    textColor: "text-rose-950",
    loginBtnClass:
      "bg-white hover:bg-rose-100/90 text-rose-900 border border-rose-200/80",
    signupBtnClass: "bg-rose-600 hover:bg-rose-700 text-white shadow-2xs",
  },
];

interface StaffPortalDropdownProps {
  isOpen: boolean;
  onClose: () => void;
  align?: "left" | "right";
  className?: string;
}

export function StaffPortalDropdown({
  isOpen,
  onClose,
  align = "right",
  className,
}: StaffPortalDropdownProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Click outside backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />

      {/* Floating Dropdown Card */}
      <div
        className={cn(
          "absolute mt-2 w-72 sm:w-80 bg-white rounded-3xl p-3 shadow-xl border border-nutri-border z-50 animate-slide-up text-xs space-y-2.5",
          align === "right" ? "right-0" : "left-0",
          className
        )}
        role="menu"
        aria-label="Staff Portals Menu"
      >
        {/* Header */}
        <div className="px-2 pt-1 pb-2 border-b border-nutri-border-light flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-nutri-green stroke-[2.5]" />
            <span className="font-extrabold text-nutri-charcoal tracking-wider text-[11px] uppercase">
              Staff Portals
            </span>
          </div>
          <span className="text-[10px] font-bold text-nutri-green bg-nutri-green-light px-2 py-0.5 rounded-full border border-nutri-green/20">
            Authorized Only
          </span>
        </div>

        {/* Portal Cards List */}
        <div className="space-y-2">
          {STAFF_PORTALS.map((portal) => {
            const Icon = portal.icon;
            return (
              <div
                key={portal.id}
                className={cn(
                  "p-2.5 rounded-2xl border transition-all duration-150 space-y-2",
                  portal.bgTint,
                  portal.borderColor
                )}
              >
                {/* Portal Identity */}
                <div className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-2xs",
                      portal.iconBg,
                      portal.iconColor
                    )}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-bold text-xs leading-tight truncate", portal.textColor)}>
                      {portal.name}
                    </p>
                    <p className="text-[10px] text-nutri-secondary truncate leading-tight">
                      {portal.tagline}
                    </p>
                  </div>
                </div>

                {/* Portal Action Buttons: Login and Sign Up */}
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  <Link
                    href={portal.loginHref}
                    onClick={onClose}
                    className={cn(
                      "py-1.5 px-2.5 rounded-xl font-bold text-[11px] text-center transition-colors flex items-center justify-center gap-1 cursor-pointer",
                      portal.loginBtnClass
                    )}
                  >
                    Login
                  </Link>

                  <Link
                    href={portal.signupHref}
                    onClick={onClose}
                    className={cn(
                      "py-1.5 px-2.5 rounded-xl font-extrabold text-[11px] text-center transition-colors flex items-center justify-center gap-1 cursor-pointer",
                      portal.signupBtnClass
                    )}
                  >
                    Sign Up
                    <ArrowUpRight className="w-3 h-3 stroke-[2.5]" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info note */}
        <div className="px-2 pt-1 pb-0.5 text-center border-t border-nutri-border-light">
          <p className="text-[10px] text-nutri-secondary font-medium">
            Staff registration requires an authorized role passcode.
          </p>
        </div>
      </div>
    </>
  );
}
