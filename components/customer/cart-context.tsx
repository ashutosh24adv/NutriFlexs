"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItemType[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Load guest cart from localStorage on initial render
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("nutriflexs_guest_cart");
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
    } catch (e) {
      console.error("Error reading guest cart from localStorage", e);
    }
  }, []);

  // Sync cartItems to localStorage whenever cart changes
  useEffect(() => {
    try {
      localStorage.setItem("nutriflexs_guest_cart", JSON.stringify(cartItems));
    } catch (e) {
      console.error("Error saving guest cart to localStorage", e);
    }
  }, [cartItems]);

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
      localStorage.removeItem("nutriflexs_guest_cart");
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
