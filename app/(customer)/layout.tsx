"use client";

import React from "react";
import { DesktopNav } from "@/components/customer/desktop-nav";
import { MobileNav } from "@/components/customer/mobile-nav";
import { CartDrawer } from "@/components/customer/cart-drawer";
import { CartProvider, useCart } from "@/components/customer/cart-context";

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
    <div className="min-h-screen flex flex-col pb-20 md:pb-0 bg-nutri-bg">
      <DesktopNav
        cartCount={totalItemCount}
        onOpenCart={() => setIsCartOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
  return (
    <CartProvider>
      <CustomerLayoutContent>{children}</CustomerLayoutContent>
    </CartProvider>
  );
}
