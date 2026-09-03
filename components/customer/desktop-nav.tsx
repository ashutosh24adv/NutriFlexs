"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { GymSelector } from "@/components/customer/gym-selector";
import { ShoppingBag, User, Shield, ChefHat, Dumbbell, Bell } from "lucide-react";
import { cn } from "@/lib/utils";

interface DesktopNavProps {
  cartCount?: number;
  onOpenCart?: () => void;
  userName?: string;
  userRole?: string;
}

export function DesktopNav({ cartCount = 0, onOpenCart, userName = "Ashu", userRole = "CUSTOMER" }: DesktopNavProps) {
  const pathname = usePathname();
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const links = [
    { label: "Home", href: "/home" },
    { label: "Menu", href: "/menu" },
    { label: "NutriFlexs Pass", href: "/pass" },
    { label: "Orders", href: "/orders" },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-nutri-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left Logo + Gym Selector */}
        <div className="flex items-center gap-4">
          <NutriFlexsLogo size="md" />
          <div className="hidden sm:block border-l border-nutri-border pl-4">
            <GymSelector />
          </div>
        </div>

        {/* Center Links */}
        <nav className="hidden md:flex items-center gap-6">
          {links.map((link, idx) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={idx}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-nutri-green",
                  isActive ? "text-nutri-green font-semibold border-b-2 border-nutri-green pb-0.5" : "text-nutri-muted"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Role Portal Quick Switcher (For Demo & Tester Convenience) */}
          <div className="relative">
            <button
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              className="text-xs bg-nutri-border-light hover:bg-nutri-border text-nutri-charcoal font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-nutri-border"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Portal View</span>
            </button>

            {showRoleMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowRoleMenu(false)} />
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl p-2 shadow-float border border-nutri-border z-50 animate-slide-up text-xs space-y-1">
                  <div className="px-3 py-1.5 font-bold text-nutri-muted uppercase tracking-wider text-[10px]">
                    Switch View Portal
                  </div>
                  <Link
                    href="/home"
                    onClick={() => setShowRoleMenu(false)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-nutri-green-light text-nutri-green font-medium"
                  >
                    <User className="w-4 h-4" /> Customer App
                  </Link>
                  <Link
                    href="/kitchen"
                    onClick={() => setShowRoleMenu(false)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-amber-50 text-amber-800 font-medium"
                  >
                    <ChefHat className="w-4 h-4 text-amber-600" /> Kitchen Kiosk
                  </Link>
                  <Link
                    href="/trainer"
                    onClick={() => setShowRoleMenu(false)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-indigo-50 text-indigo-800 font-medium"
                  >
                    <Dumbbell className="w-4 h-4 text-indigo-600" /> Trainer Dashboard
                  </Link>
                  <Link
                    href="/admin"
                    onClick={() => setShowRoleMenu(false)}
                    className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-rose-50 text-rose-800 font-medium"
                  >
                    <Shield className="w-4 h-4 text-rose-600" /> Admin Operations
                  </Link>
                </div>
              </>
            )}
          </div>

          {/* Cart Icon Button */}
          <button
            onClick={onOpenCart}
            className="relative p-2 rounded-full bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft transition-colors"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white font-bold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>

          {/* Profile Quick Link */}
          <Link
            href="/profile"
            className="flex items-center gap-2 pl-2 border-l border-nutri-border"
          >
            <div className="w-8 h-8 rounded-full bg-nutri-green text-white flex items-center justify-center font-bold text-xs">
              {userName.charAt(0).toUpperCase()}
            </div>
            <span className="hidden lg:inline text-xs font-semibold text-nutri-charcoal">
              {userName}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
