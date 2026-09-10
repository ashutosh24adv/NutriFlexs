"use client";

import React, { useState } from "react";
import Link from "next/link";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import { Lock, ChefHat, Dumbbell, Shield, ShoppingBag } from "lucide-react";
import { useCart } from "@/components/customer/cart-context";
import { CartDrawer } from "@/components/customer/cart-drawer";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  const [showStaffPortal, setShowStaffPortal] = useState(false);
  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    clearCart,
    totalItemCount,
  } = useCart();

  return (
    <div className="min-h-screen flex flex-col bg-nutri-bg">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-nutri-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <NutriFlexsLogo size="md" showTagline={true} />

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-nutri-secondary">
            <a href="#find-fit" className="hover:text-nutri-green transition-colors">Find Your Fuel</a>
            <a href="#why" className="hover:text-nutri-green transition-colors">Why NutriFlexs</a>
            <a href="#how" className="hover:text-nutri-green transition-colors">How It Works</a>
            <Link href="/menu" className="hover:text-nutri-green transition-colors">Menu</Link>
            <Link href="/pass" className="hover:text-nutri-green transition-colors">NutriFlexs Pass</Link>
          </nav>

          <div className="flex items-center gap-3">
            {/* Cart Icon */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft transition-colors cursor-pointer"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              {totalItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-nutri-green text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {totalItemCount}
                </span>
              )}
            </button>

            {/* Subtle Staff Portal Entry on Landing Page */}
            <div className="relative">
              <button
                onClick={() => setShowStaffPortal(!showStaffPortal)}
                className="text-xs bg-nutri-green-soft hover:bg-nutri-green-light text-nutri-green font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-nutri-border cursor-pointer transition-colors"
                title="Staff & Operator Portals"
              >
                <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                <span className="hidden sm:inline">Staff Portal</span>
              </button>

              {showStaffPortal && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowStaffPortal(false)} />
                  <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl p-2.5 shadow-md border border-nutri-border z-50 animate-slide-up text-xs space-y-1">
                    <div className="px-3 py-1 font-bold text-nutri-secondary uppercase tracking-wider text-[10px] border-b border-nutri-border-light pb-1 mb-1">
                      Internal Staff Portals
                    </div>
                    <Link
                      href="/kitchen"
                      onClick={() => setShowStaffPortal(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-amber-50 text-amber-900 font-bold transition-colors"
                    >
                      <ChefHat className="w-4 h-4 text-amber-600" /> Kitchen Display Kiosk
                    </Link>
                    <Link
                      href="/trainer"
                      onClick={() => setShowStaffPortal(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-indigo-50 text-indigo-900 font-bold transition-colors"
                    >
                      <Dumbbell className="w-4 h-4 text-indigo-600" /> Trainer Partner Portal
                    </Link>
                    <Link
                      href="/admin"
                      onClick={() => setShowStaffPortal(false)}
                      className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-rose-50 text-rose-900 font-bold transition-colors"
                    >
                      <Shield className="w-4 h-4 text-rose-600" /> Super Admin Operations
                    </Link>
                  </div>
                </>
              )}
            </div>

            <Link href="/login" className="hidden sm:inline-block text-xs font-bold text-nutri-charcoal hover:text-nutri-green px-2 py-1 transition-colors">
              Sign In
            </Link>

            <Link href="/home">
              <Button size="sm" className="bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs px-4 py-2 rounded-full cursor-pointer shadow-xs">
                OPEN APP →
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Page Content */}
      <main className="flex-1">{children}</main>

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />

      {/* Footer */}
      <footer className="bg-nutri-charcoal text-white pt-12 pb-8 border-t border-nutri-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 border-b border-white/10 pb-8">
            <div className="max-w-sm space-y-3">
              <NutriFlexsLogo size="md" className="text-white [&_span]:text-white" />
              <p className="text-xs text-nutri-secondary leading-relaxed">
                Gym-adjacent fitness nutrition platform delivering cold-pressed organic juices and freshly prepared high-protein meals in 5 minutes.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8 text-xs">
              <div>
                <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Product</h4>
                <ul className="space-y-2 text-nutri-secondary">
                  <li><Link href="/menu" className="hover:text-white transition-colors">Juices & Shakes</Link></li>
                  <li><Link href="/menu" className="hover:text-white transition-colors">Protein Bowls</Link></li>
                  <li><Link href="/pass" className="hover:text-white transition-colors">NutriFlexs Pass</Link></li>
                  <li><Link href="/trainer" className="hover:text-white transition-colors">Trainer Program</Link></li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Express Kiosks</h4>
                <ul className="space-y-2 text-nutri-secondary">
                  <li>Cult.fit Indiranagar</li>
                  <li>Gold&apos;s Gym Koramangala</li>
                  <li>Nitrro Wellness Bandra</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold font-heading text-white mb-3 uppercase tracking-wider">Portals</h4>
                <ul className="space-y-2 text-nutri-secondary">
                  <li><Link href="/home" className="hover:text-white transition-colors">Customer Order</Link></li>
                  <li><Link href="/kitchen" className="hover:text-white transition-colors">Kitchen Display</Link></li>
                  <li><Link href="/trainer" className="hover:text-white transition-colors">Trainer Portal</Link></li>
                  <li><Link href="/admin" className="hover:text-white transition-colors">Admin Suite</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-nutri-secondary gap-4">
            <p>© 2026 NutriFlexs Inc. All rights reserved. REAL FOOD. REAL FUEL.</p>
            <p className="text-[11px]">Located 50–100m from premium gym footfalls.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
