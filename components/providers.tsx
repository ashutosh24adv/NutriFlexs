"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/components/customer/cart-context";
import { DietaryProvider } from "@/components/customer/dietary-context";
import { GymProvider } from "@/components/customer/gym-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <GymProvider>
        <CartProvider>
          <DietaryProvider>{children}</DietaryProvider>
        </CartProvider>
      </GymProvider>
    </SessionProvider>
  );
}
