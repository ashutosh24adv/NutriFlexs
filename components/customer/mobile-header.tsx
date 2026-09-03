"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Menu, Bell, ShoppingBag, X, User, Utensils, Clock, Shield } from "lucide-react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { GymSelector } from "@/components/customer/gym-selector";

interface MobileHeaderProps {
  cartCount?: number;
  onOpenCart?: () => void;
}

export function MobileHeader({ cartCount = 0, onOpenCart }: MobileHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-nutri-border-light px-4 py-2.5 shadow-sm">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          {/* Hamburger Menu Icon */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 rounded-full text-nutri-green hover:bg-nutri-green-light transition-colors"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Centered NutriFlexs Logo & Tagline */}
          <div className="flex-1 flex justify-center">
            <NutriFlexsLogo size="sm" showTagline={true} showIcon={false} />
          </div>

          {/* Right Actions: Notification Bell + Cart */}
          <div className="flex items-center gap-1.5 -mr-1">
            <button
              className="relative p-2 rounded-full text-nutri-charcoal hover:text-nutri-green hover:bg-nutri-green-light transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5 stroke-[2]" />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-nutri-green ring-2 ring-white" />
            </button>

            <button
              onClick={onOpenCart}
              className="relative p-2 rounded-full text-nutri-charcoal hover:text-nutri-green hover:bg-nutri-green-light transition-colors"
              aria-label="Shopping Bag"
            >
              <ShoppingBag className="w-5 h-5 stroke-[2]" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 bg-nutri-green text-white font-extrabold text-[10px] w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-white">
                  {cartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Slide-out Mobile Menu Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl p-6 flex flex-col justify-between z-10 animate-slide-left">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-nutri-border">
                <NutriFlexsLogo size="md" showTagline={true} />
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full text-nutri-muted hover:bg-nutri-border-light"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-[11px] font-bold text-nutri-muted uppercase tracking-wider mb-2">
                  Select Gym Location
                </p>
                <GymSelector />
              </div>

              <nav className="space-y-2">
                <Link
                  href="/home"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-nutri-green-light text-nutri-green font-bold text-sm"
                >
                  <Utensils className="w-4 h-4" /> Home
                </Link>
                <Link
                  href="/menu"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl text-nutri-charcoal hover:bg-nutri-border-light font-semibold text-sm"
                >
                  <Utensils className="w-4 h-4 text-nutri-muted" /> Menu
                </Link>
                <Link
                  href="/pass"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl text-nutri-charcoal hover:bg-nutri-border-light font-semibold text-sm"
                >
                  <Clock className="w-4 h-4 text-nutri-muted" /> NutriFlexs Pass
                </Link>
                <Link
                  href="/orders"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl text-nutri-charcoal hover:bg-nutri-border-light font-semibold text-sm"
                >
                  <Clock className="w-4 h-4 text-nutri-muted" /> Your Orders
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-2xl text-nutri-charcoal hover:bg-nutri-border-light font-semibold text-sm"
                >
                  <User className="w-4 h-4 text-nutri-muted" /> Profile
                </Link>
              </nav>
            </div>

            <div className="pt-4 border-t border-nutri-border space-y-2">
              <p className="text-[10px] font-bold text-nutri-muted uppercase tracking-wider">
                Demo Portals
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                <Link
                  href="/kitchen"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-xl bg-amber-50 text-amber-800 text-center"
                >
                  Kitchen
                </Link>
                <Link
                  href="/trainer"
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-xl bg-indigo-50 text-indigo-800 text-center"
                >
                  Trainer
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
