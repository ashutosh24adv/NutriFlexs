"use client";

import React from "react";
import { DesktopNav } from "@/components/customer/desktop-nav";
import { MobileHeader } from "@/components/customer/mobile-header";
import { MobileNav } from "@/components/customer/mobile-nav";
import { CartDrawer } from "@/components/customer/cart-drawer";
import { useCart } from "@/components/customer/cart-context";
import { useDietary } from "@/components/customer/dietary-context";
import { Leaf, X } from "lucide-react";

function DietaryAlertBanner() {
  const { nonVegRemovedAlert, clearNonVegAlert } = useDietary();

  if (!nonVegRemovedAlert) return null;

  return (
    <div className="fixed top-20 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-slide-down">
      <div className="bg-nutri-green text-white p-3.5 sm:p-4 rounded-2xl shadow-xl border border-nutri-green-dark flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-1 rounded-full bg-white/20 text-white shrink-0 mt-0.5">
            <Leaf className="w-4 h-4 fill-white" />
          </div>
          <div>
            <p className="text-xs font-bold font-heading">Vegetarian Mode Active</p>
            <p className="text-[11px] text-white/95 mt-0.5 leading-snug">{nonVegRemovedAlert}</p>
          </div>
        </div>
        <button
          onClick={clearNonVegAlert}
          className="p-1 text-white/80 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
          aria-label="Dismiss alert"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function CustomerLayoutContent({ children }: { children: React.ReactNode }) {
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
    <div className="min-h-screen flex flex-col pb-20 md:pb-6 bg-nutri-bg">
      <DietaryAlertBanner />

      <MobileHeader
        cartCount={totalItemCount}
        onOpenCart={() => setIsCartOpen(true)}
      />
      
      <DesktopNav
        cartCount={totalItemCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {children}
      </main>

      <MobileNav
        cartCount={totalItemCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />
    </div>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <CustomerLayoutContent>{children}</CustomerLayoutContent>;
}
