"use client";

import React from "react";
import { SessionProvider } from "next-auth/react";
import { CartProvider } from "@/components/customer/cart-context";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>{children}</CartProvider>
    </SessionProvider>
  );
}
