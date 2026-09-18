"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/customer/cart-context";

interface DietaryContextType {
  isVegetarian: boolean;
  setIsVegetarian: (value: boolean) => Promise<void>;
  toggleVegetarian: () => Promise<void>;
  nonVegRemovedAlert: string | null;
  clearNonVegAlert: () => void;
  isLoadingPreference: boolean;
}

const DietaryContext = createContext<DietaryContextType | undefined>(undefined);

const STORAGE_KEY = "nutriflexs_is_vegetarian";

export function DietaryProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const { cartItems, removeItem } = useCart();

  const [isVegetarian, setIsVegetarianState] = useState<boolean>(false);
  const [isLoadingPreference, setIsLoadingPreference] = useState<boolean>(true);
  const [nonVegRemovedAlert, setNonVegRemovedAlert] = useState<string | null>(null);

  // 1. Initial load: check localStorage first for instant hydration
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved !== null) {
        setIsVegetarianState(saved === "true");
      }
    } catch (e) {
      console.error("Failed to read dietary mode from localStorage", e);
    } finally {
      setIsLoadingPreference(false);
    }
  }, []);

  // 2. If user is authenticated, sync with server profile preference
  useEffect(() => {
    let isMounted = true;

    async function syncServerPreference() {
      if (!isAuthenticated) return;
      try {
        const res = await fetch("/api/user/preference");
        const data = await res.json();
        if (data.success && typeof data.isVegetarian === "boolean" && isMounted) {
          setIsVegetarianState(data.isVegetarian);
          try {
            localStorage.setItem(STORAGE_KEY, String(data.isVegetarian));
          } catch (e) {}
        }
      } catch (err) {
        console.error("Failed to sync dietary preference with server", err);
      }
    }

    if (isAuthenticated) {
      syncServerPreference();
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated]);

  // 3. Helper to sanitize cart when Vegetarian Mode is active
  const purgeNonVegCartItems = useCallback(() => {
    const nonVegItems = cartItems.filter((item) => !item.product.isVeg);
    if (nonVegItems.length > 0) {
      nonVegItems.forEach((item) => {
        removeItem(item.product.id);
      });
      setNonVegRemovedAlert("Non-vegetarian items were removed because Vegetarian Mode is enabled.");
    }
  }, [cartItems, removeItem]);

  // 4. Update dietary state & persist to DB/localStorage
  const setIsVegetarian = useCallback(
    async (targetValue: boolean) => {
      setIsVegetarianState(targetValue);
      try {
        localStorage.setItem(STORAGE_KEY, String(targetValue));
      } catch (e) {}

      if (targetValue) {
        purgeNonVegCartItems();
      }

      if (isAuthenticated) {
        try {
          await fetch("/api/user/preference", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ isVegetarian: targetValue }),
          });
        } catch (err) {
          console.error("Failed to save dietary preference to database", err);
        }
      }
    },
    [isAuthenticated, purgeNonVegCartItems]
  );

  const toggleVegetarian = useCallback(async () => {
    await setIsVegetarian(!isVegetarian);
  }, [isVegetarian, setIsVegetarian]);

  const clearNonVegAlert = useCallback(() => {
    setNonVegRemovedAlert(null);
  }, []);

  // Auto-dismiss notification after 7 seconds
  useEffect(() => {
    if (nonVegRemovedAlert) {
      const timer = setTimeout(() => {
        setNonVegRemovedAlert(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [nonVegRemovedAlert]);

  return (
    <DietaryContext.Provider
      value={{
        isVegetarian,
        setIsVegetarian,
        toggleVegetarian,
        nonVegRemovedAlert,
        clearNonVegAlert,
        isLoadingPreference,
      }}
    >
      {children}
    </DietaryContext.Provider>
  );
}

export function useDietary() {
  const context = useContext(DietaryContext);
  if (!context) {
    throw new Error("useDietary must be used within a DietaryProvider");
  }
  return context;
}
