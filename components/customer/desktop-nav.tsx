"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { GymSelector } from "@/components/customer/gym-selector";
import { ShoppingBag, Shield, ChefHat, Dumbbell, LogOut, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface DesktopNavProps {
  cartCount?: number;
  onOpenCart?: () => void;
  userName?: string;
  userRole?: string;
  showStaffPortal?: boolean;
}

export function DesktopNav({ cartCount = 0, onOpenCart, showStaffPortal = false }: DesktopNavProps) {
  const pathname = usePathname();
  const sessionContext = useSession();
  const session = sessionContext?.data;
  const status = sessionContext?.status || "unauthenticated";

  const [showPortalMenu, setShowPortalMenu] = useState(false);

  const isAuthenticated = status === "authenticated";
  const user = session?.user as any;
  const userName = user?.name || "Guest";

  // Main customer links
  const baseLinks = [
    { label: "Home", href: "/home" },
    { label: "Menu", href: "/menu" },
    { label: "NutriFlexs Pass", href: "/pass" },
  ];

  const authenticatedLinks = [
    { label: "Orders", href: "/orders" },
    { label: "Profile", href: "/profile" },
  ];

  const links = isAuthenticated ? [...baseLinks, ...authenticatedLinks] : baseLinks;

  return (
    <header className="hidden md:block sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-nutri-border">
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
            const isActive = link.href === "/home" ? (pathname === "/home" || pathname === "/") : pathname.startsWith(link.href);
            return (
              <Link
                key={idx}
                href={link.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-nutri-green",
                  isActive ? "text-nutri-green font-bold border-b-2 border-nutri-green pb-0.5" : "text-nutri-secondary"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Staff Portal Dropdown (Rendered ONLY when explicitly enabled on Landing Page) */}
          {showStaffPortal && (
            <div className="relative">
              <button
                onClick={() => setShowPortalMenu(!showPortalMenu)}
                className="text-xs bg-nutri-green-soft hover:bg-nutri-green-light text-nutri-green font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-nutri-border cursor-pointer transition-colors"
              >
                <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Staff Portal</span>
              </button>

              {showPortalMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowPortalMenu(false)} />
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl p-2.5 shadow-md border border-nutri-border z-50 animate-slide-up text-xs space-y-1">
                    <div className="px-3 py-1 font-bold text-nutri-secondary uppercase tracking-wider text-[10px] border-b border-nutri-border-light pb-1 mb-1">
                      Internal Staff Portals
                    </div>
                    <Link
                      href="/kitchen"
                      onClick={() => setShowPortalMenu(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-amber-50 text-amber-900 font-bold transition-colors"
                    >
                      <ChefHat className="w-4 h-4 text-amber-600" /> Kitchen Display Kiosk
                    </Link>
                    <Link
                      href="/trainer"
                      onClick={() => setShowPortalMenu(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-indigo-50 text-indigo-900 font-bold transition-colors"
                    >
                      <Dumbbell className="w-4 h-4 text-indigo-600" /> Trainer Partner Portal
                    </Link>
                    <Link
                      href="/admin"
                      onClick={() => setShowPortalMenu(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-rose-50 text-rose-900 font-bold transition-colors"
                    >
                      <Shield className="w-4 h-4 text-rose-600" /> Super Admin Operations
                    </Link>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Cart Icon Button */}
          <button
            onClick={onOpenCart}
            className="relative p-2 rounded-full bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft transition-colors cursor-pointer"
            aria-label="View Cart"
          >
            <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-nutri-green text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                {cartCount}
              </span>
            )}
          </button>

          {/* Auth Button / Profile Indicator */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2 pl-2 border-l border-nutri-border">
              <Link href="/profile" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-nutri-green text-white flex items-center justify-center font-extrabold text-xs">
                  {userName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden lg:inline text-xs font-bold text-nutri-charcoal">
                  {userName}
                </span>
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: "/home" })}
                className="p-1.5 text-nutri-secondary hover:text-rose-600 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-nutri-green text-white hover:bg-nutri-green-dark text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer shadow-xs"
            >
              Login / Sign Up
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
