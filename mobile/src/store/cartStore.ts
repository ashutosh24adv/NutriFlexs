import { useState, useEffect } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  proteinGrams: number;
  calories: number;
  prepTimeMinutes: number;
  isVeg: boolean;
  imageUrl: string;
}

export interface CartState {
  items: Record<string, CartItem>;
  autoLogToDiary: boolean;
  couponCode: string;
  couponDiscount: number;
  useWallet: boolean;
  passApplied: boolean;
  trainerCode: string;
  trainerDiscountApplied: boolean;
  kioskLocation: string;
  activeOrderId: string | null;
}

// Cart starts completely empty (0 items) by default
const INITIAL_ITEMS: Record<string, CartItem> = {};

let state: CartState = {
  items: INITIAL_ITEMS,
  autoLogToDiary: true,
  couponCode: '',
  couponDiscount: 0,
  useWallet: true,
  passApplied: false,
  trainerCode: '',
  trainerDiscountApplied: false,
  kioskLocation: 'Cult.fit HSR Layout',
  activeOrderId: null,
};

const listeners = new Set<(s: CartState) => void>();

function notify() {
  for (const listener of listeners) {
    listener(state);
  }
}

export const cartActions = {
  addItem: (item: Omit<CartItem, 'quantity'>) => {
    const current = state.items[item.id];
    state = {
      ...state,
      items: {
        ...state.items,
        [item.id]: {
          ...item,
          quantity: (current?.quantity || 0) + 1,
        },
      },
    };
    notify();
  },

  increment: (id: string) => {
    const current = state.items[id];
    if (current) {
      state = {
        ...state,
        items: {
          ...state.items,
          [id]: {
            ...current,
            quantity: current.quantity + 1,
          },
        },
      };
      notify();
    }
  },

  decrement: (id: string) => {
    const current = state.items[id];
    if (!current) return;
    if (current.quantity <= 1) {
      const copy = { ...state.items };
      delete copy[id];
      state = { ...state, items: copy };
    } else {
      state = {
        ...state,
        items: {
          ...state.items,
          [id]: {
            ...current,
            quantity: current.quantity - 1,
          },
        },
      };
    }
    notify();
  },

  clearCart: () => {
    state = {
      ...state,
      items: {},
      couponCode: '',
      couponDiscount: 0,
      passApplied: false,
      trainerCode: '',
      trainerDiscountApplied: false,
    };
    notify();
  },

  setAutoLogToDiary: (autoLog: boolean) => {
    state = { ...state, autoLogToDiary: autoLog };
    notify();
  },

  setCoupon: (code: string, discount: number) => {
    state = {
      ...state,
      couponCode: code.toUpperCase().trim(),
      couponDiscount: Math.max(0, discount),
      trainerCode: code.toUpperCase().trim(),
      trainerDiscountApplied: discount > 0,
    };
    notify();
  },

  removeCoupon: () => {
    state = {
      ...state,
      couponCode: '',
      couponDiscount: 0,
      trainerCode: '',
      trainerDiscountApplied: false,
    };
    notify();
  },

  setUseWallet: (use: boolean) => {
    state = { ...state, useWallet: use };
    notify();
  },

  setPassApplied: (applied: boolean) => {
    state = {
      ...state,
      passApplied: applied,
      trainerDiscountApplied: applied ? false : state.trainerDiscountApplied,
    };
    notify();
  },

  applyTrainerCode: (code: string): { success: boolean; message: string } => {
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) {
      return { success: false, message: 'Please enter a valid coupon code' };
    }
    if (cleaned === 'COACHAMIT' || cleaned === 'FIT10' || cleaned === 'TRAINER10' || cleaned === 'WELCOME10') {
      state = {
        ...state,
        couponCode: cleaned,
        couponDiscount: 0, // Calculated dynamically or handled by validate
        trainerCode: cleaned,
        trainerDiscountApplied: true,
        passApplied: false,
      };
      notify();
      return { success: true, message: `Coupon code ${cleaned} applied` };
    }
    return { success: false, message: 'Invalid coupon code. Try WELCOME10 or FIT50' };
  },

  removeTrainerCode: () => {
    state = {
      ...state,
      couponCode: '',
      couponDiscount: 0,
      trainerCode: '',
      trainerDiscountApplied: false,
    };
    notify();
  },

  setKioskLocation: (kiosk: string) => {
    state = { ...state, kioskLocation: kiosk };
    notify();
  },

  placeOrder: (customOrderId?: string): string => {
    const orderId = customOrderId || `NF-${Math.floor(100 + Math.random() * 900)}`;
    state = {
      ...state,
      activeOrderId: orderId,
      items: {}, // Clear cart upon successful order
    };
    notify();
    return orderId;
  },
};

export function useCartStore() {
  const [current, setCurrent] = useState<CartState>(state);

  useEffect(() => {
    listeners.add(setCurrent);
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);

  // Derived calculations
  const itemsList = Object.values(current.items);
  const totalCount = itemsList.reduce((acc, it) => acc + it.quantity, 0);
  const itemTotal = itemsList.reduce((acc, it) => acc + it.price * it.quantity, 0);
  const totalProtein = itemsList.reduce((acc, it) => acc + it.proteinGrams * it.quantity, 0);
  const totalCalories = itemsList.reduce((acc, it) => acc + it.calories * it.quantity, 0);

  // Discount calculation
  let discount = current.couponDiscount || 0;
  let discountLabel = current.couponCode ? `Coupon (${current.couponCode})` : '';

  if (!discount && current.trainerDiscountApplied && current.trainerCode) {
    discount = Math.round(itemTotal * 0.10);
    discountLabel = `Coupon (${current.trainerCode} 10% OFF)`;
  } else if (!discount && current.passApplied) {
    discount = Math.round(itemTotal * 0.35);
    discountLabel = 'NutriFlexs Wallet (35% OFF)';
  }

  // Taxes & Packaging: 5% GST on net food total + ₹15 eco-friendly packaging
  const netFood = Math.max(0, itemTotal - discount);
  const taxesAndPackaging = netFood > 0 ? Math.round(netFood * 0.05) + 15 : 0;
  const toPay = netFood + taxesAndPackaging;

  return {
    ...current,
    itemsList,
    totalCount,
    itemTotal,
    totalProtein,
    totalCalories,
    discount,
    discountLabel,
    taxesAndPackaging,
    toPay,
    totalAmount: toPay,
    ...cartActions,
  };
}
