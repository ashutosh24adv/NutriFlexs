"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { CartItemType } from "@/components/customer/cart-drawer";

interface CartContextType {
  cart: CartItemType[];
  cartItems: CartItemType[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (product: any, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  totalItemCount: number;
  getSubtotal: () => number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const GUEST_CART_KEY = "nutriflexs_guest_cart";
const getUserCartKey = (email: string) => `nutriflexs_user_cart_${email.toLowerCase().trim()}`;

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const prevUserEmailRef = useRef<string | null>(null);
  const cartItemsRef = useRef<CartItemType[]>(cartItems);
  cartItemsRef.current = cartItems;

  // Helper to revalidate prices & availability against the server (/api/products)
  const revalidateWithServer = useCallback(async (items: CartItemType[]): Promise<CartItemType[]> => {
    if (!items || items.length === 0) return [];
    try {
      const res = await fetch("/api/products");
      if (!res.ok) return items;
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        const liveMap = new Map<string, any>(data.products.map((p: any) => [p.id, p]));
        return items
          .filter((item) => liveMap.has(item.product.id))
          .map((item) => {
            const live = liveMap.get(item.product.id);
            return {
              ...item,
              product: {
                ...item.product,
                price: live.price,
                isAvailable: live.isAvailable,
                name: live.name,
                protein: live.protein,
                calories: live.calories,
                imageUrl: live.imageUrl || item.product.imageUrl,
                isVeg: live.isVeg,
              },
            };
          });
      }
    } catch (e) {
      console.warn("Could not revalidate cart prices with server:", e);
    }
    return items;
  }, []);

  // 1. Initial Cart Load on Mount
  useEffect(() => {
    try {
      let initialCart: CartItemType[] = [];
      const savedGuest = localStorage.getItem(GUEST_CART_KEY);
      if (savedGuest) {
        const parsed = JSON.parse(savedGuest);
        if (Array.isArray(parsed)) initialCart = parsed;
      }
      setCartItems(initialCart);
      setHasInitialized(true);

      // Async server revalidation of prices
      if (initialCart.length > 0) {
        revalidateWithServer(initialCart).then((validated) => {
          setCartItems(validated);
        });
      }
    } catch (e) {
      console.error("Error reading cart from localStorage", e);
      setHasInitialized(true);
    }
  }, [revalidateWithServer]);

  // 2. Auth State Transition & Guest Cart Merge
  useEffect(() => {
    if (!hasInitialized) return;

    const currentUserEmail = session?.user?.email ? session.user.email.toLowerCase().trim() : null;

    // Detect transition from Guest to Authenticated
    if (status === "authenticated" && currentUserEmail && prevUserEmailRef.current !== currentUserEmail) {
      try {
        const userKey = getUserCartKey(currentUserEmail);
        const existingUserRaw = localStorage.getItem(userKey);
        const existingUserCart: CartItemType[] = existingUserRaw ? JSON.parse(existingUserRaw) : [];

        // Read current guest cart items from state or storage
        const guestRaw = localStorage.getItem(GUEST_CART_KEY);
        const guestCart: CartItemType[] = guestRaw ? JSON.parse(guestRaw) : cartItemsRef.current;

        // Merge guest cart items into authenticated cart without duplicates
        const mergedMap = new Map<string, CartItemType>();

        // First populate user cart
        for (const item of existingUserCart) {
          if (item?.product?.id) {
            mergedMap.set(item.product.id, { ...item });
          }
        }

        // Then merge guest items (combining quantity if already present)
        for (const guestItem of guestCart) {
          if (!guestItem?.product?.id) continue;
          if (mergedMap.has(guestItem.product.id)) {
            const current = mergedMap.get(guestItem.product.id)!;
            current.quantity = Math.max(current.quantity, current.quantity + guestItem.quantity);
          } else {
            mergedMap.set(guestItem.product.id, { ...guestItem });
          }
        }

        const mergedItems = Array.from(mergedMap.values());

        // Revalidate server-side prices and set state
        revalidateWithServer(mergedItems).then((validated) => {
          setCartItems(validated);
          localStorage.setItem(userKey, JSON.stringify(validated));
          // Clear guest cart once merged
          localStorage.removeItem(GUEST_CART_KEY);
        });
      } catch (err) {
        console.error("Error merging guest cart on login:", err);
      }
    }

    prevUserEmailRef.current = currentUserEmail;
  }, [status, session?.user?.email, hasInitialized, revalidateWithServer]);

  // 3. Persist cart changes to storage
  useEffect(() => {
    if (!hasInitialized) return;

    try {
      const currentUserEmail = session?.user?.email ? session.user.email.toLowerCase().trim() : null;
      if (currentUserEmail) {
        localStorage.setItem(getUserCartKey(currentUserEmail), JSON.stringify(cartItems));
      } else {
        localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cartItems));
      }
    } catch (e) {
      console.error("Error saving cart to localStorage", e);
    }
  }, [cartItems, session?.user?.email, hasInitialized]);

  const addToCart = (product: any, quantity: number = 1) => {
    setCartItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.product.id === product.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].quantity += quantity;
        return updated;
      }
      return [...prev, { product, quantity }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(productId);
      return;
    }
    setCartItems((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity } : i))
    );
  };

  const removeItem = (productId: string) => {
    setCartItems((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => {
    setCartItems([]);
    try {
      const currentUserEmail = session?.user?.email ? session.user.email.toLowerCase().trim() : null;
      if (currentUserEmail) {
        localStorage.removeItem(getUserCartKey(currentUserEmail));
      } else {
        localStorage.removeItem(GUEST_CART_KEY);
      }
    } catch (e) {}
  };

  const getSubtotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
  };

  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart: cartItems,
        cartItems,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        totalItemCount,
        getSubtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
