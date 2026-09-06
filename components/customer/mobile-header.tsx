"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, ShoppingBag, X, User, Utensils, Clock, Shield, LogOut, Lock, ChefHat, Dumbbell } from "lucide-react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { GymSelector } from "@/components/customer/gym-selector";
import { cn } from "@/lib/utils";

interface MobileHeaderProps {
  cartCount?: number;
  onOpenCart?: () => void;
  showStaffPortal?: boolean;
}

export function MobileHeader({ cartCount = 0, onOpenCart, showStaffPortal = false }: MobileHeaderProps) {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const sessionContext = useSession();
  const session = sessionContext?.data;
  const status = sessionContext?.status || "unauthenticated";

  const isAuthenticated = status === "authenticated";
  const user = session?.user as any;
  const userName = user?.name || "Guest";

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 bg-white border-b border-nutri-border px-4 py-2.5 shadow-xs">
        <div className="flex items-center justify-between gap-2 max-w-md mx-auto">
          {/* Hamburger Menu Icon */}
          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 -ml-2 rounded-full text-nutri-green hover:bg-nutri-green-light transition-colors cursor-pointer"
            aria-label="Open navigation menu"
          >
            <Menu className="w-6 h-6 stroke-[2.2]" />
          </button>

          {/* Centered NutriFlexs Logo & Tagline */}
          <div className="flex-1 flex justify-center">
            <NutriFlexsLogo size="sm" showTagline={true} showIcon={false} />
          </div>

          {/* Right Actions: Cart */}
          <div className="flex items-center gap-1.5 -mr-1">
            <button
              onClick={onOpenCart}
              className="relative p-2 rounded-full text-nutri-charcoal hover:text-nutri-green hover:bg-nutri-green-light transition-colors cursor-pointer"
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
          <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl p-6 flex flex-col justify-between z-10 animate-slide-left overflow-y-auto">
            <div>
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-nutri-border">
                <NutriFlexsLogo size="md" showTagline={true} />
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full text-nutri-secondary hover:bg-nutri-border-light cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-6">
                <p className="text-[11px] font-bold text-nutri-secondary uppercase tracking-wider mb-2">
                  Select Gym Location
                </p>
                <GymSelector />
              </div>

              <nav className="space-y-1.5">
                <Link
                  href="/home"
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl font-bold text-sm transition-colors",
                    pathname === "/home" || pathname === "/" ? "bg-nutri-green-light text-nutri-green" : "text-nutri-charcoal hover:bg-nutri-green-soft"
                  )}
                >
                  <Utensils className="w-4 h-4" /> Home
                </Link>
                <Link
                  href="/menu"
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl font-bold text-sm transition-colors",
                    pathname.startsWith("/menu") ? "bg-nutri-green-light text-nutri-green" : "text-nutri-charcoal hover:bg-nutri-green-soft"
                  )}
                >
                  <Utensils className="w-4 h-4 text-nutri-secondary" /> Menu
                </Link>
                <Link
                  href="/pass"
                  onClick={() => setIsMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-2xl font-bold text-sm transition-colors",
                    pathname.startsWith("/pass") ? "bg-nutri-green-light text-nutri-green" : "text-nutri-charcoal hover:bg-nutri-green-soft"
                  )}
                >
                  <Clock className="w-4 h-4 text-nutri-secondary" /> NutriFlexs Pass
                </Link>

                {isAuthenticated ? (
                  <>
                    <Link
                      href="/orders"
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl font-bold text-sm transition-colors",
                        pathname.startsWith("/orders") ? "bg-nutri-green-light text-nutri-green" : "text-nutri-charcoal hover:bg-nutri-green-soft"
                      )}
                    >
                      <Clock className="w-4 h-4 text-nutri-secondary" /> Your Orders
                    </Link>
                    <Link
                      href="/profile"
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl font-bold text-sm transition-colors",
                        pathname.startsWith("/profile") ? "bg-nutri-green-light text-nutri-green" : "text-nutri-charcoal hover:bg-nutri-green-soft"
                      )}
                    >
                      <User className="w-4 h-4 text-nutri-secondary" /> Profile ({userName})
                    </Link>
                  </>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => setIsMenuOpen(false)}
                    className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-nutri-green text-white font-bold text-sm mt-4 shadow-xs"
                  >
                    Login / Sign Up
                  </Link>
                )}
              </nav>
            </div>

            {/* Staff Portals Section (Rendered ONLY if showStaffPortal is explicitly true) */}
            {showStaffPortal && (
              <div className="pt-4 border-t border-nutri-border space-y-2 mt-6">
                <p className="text-[10px] font-bold text-nutri-secondary uppercase tracking-wider flex items-center gap-1">
                  <Lock className="w-3 h-3 text-nutri-green" /> Staff Portals
                </p>
                <div className="grid grid-cols-3 gap-1.5 text-[11px] font-bold text-center">
                  <Link
                    href="/kitchen"
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-xl bg-amber-50 text-amber-900 border border-amber-200"
                  >
                    Kitchen
                  </Link>
                  <Link
                    href="/trainer"
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200"
                  >
                    Trainer
                  </Link>
                  <Link
                    href="/admin"
                    onClick={() => setIsMenuOpen(false)}
                    className="p-2 rounded-xl bg-rose-50 text-rose-900 border border-rose-200"
                  >
                    Admin
                  </Link>
                </div>
              </div>
            )}

            {isAuthenticated && (
              <div className="pt-3 border-t border-nutri-border-light mt-3">
                <button
                  onClick={() => {
                    setIsMenuOpen(false);
                    signOut({ callbackUrl: "/home" });
                  }}
                  className="w-full text-left flex items-center gap-2 text-xs font-bold text-rose-600 p-1 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" /> Sign Out ({userName})
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
