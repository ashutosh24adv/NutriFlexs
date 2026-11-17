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
  passApplied: boolean;
  trainerCode: string;
  trainerDiscountApplied: boolean;
  kioskLocation: string;
  activeOrderId: string | null;
}

const INITIAL_ITEMS: Record<string, CartItem> = {
  '1': {
    id: '1',
    name: 'High Protein Peanut Butter Banana Shake',
    price: 199,
    quantity: 1,
    proteinGrams: 32,
    calories: 420,
    prepTimeMinutes: 5,
    isVeg: true,
    imageUrl:
      'https://images.unsplash.com/photo-1553530666-ba11a7da3888?auto=format&fit=crop&w=400&q=80',
  },
  '2': {
    id: '2',
    name: 'Low-Fat Paneer Quinoa Power Bowl',
    price: 249,
    quantity: 1,
    proteinGrams: 28,
    calories: 380,
    prepTimeMinutes: 7,
    isVeg: true,
    imageUrl:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=400&q=80',
  },
};

let state: CartState = {
  items: INITIAL_ITEMS,
  autoLogToDiary: true,
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
    state = { ...state, items: {} };
    notify();
  },

  setAutoLogToDiary: (autoLog: boolean) => {
    state = { ...state, autoLogToDiary: autoLog };
    notify();
  },

  setPassApplied: (applied: boolean) => {
    state = {
      ...state,
      passApplied: applied,
      // If pass applied, trainer discount cannot double up with pass
      trainerDiscountApplied: applied ? false : state.trainerDiscountApplied,
    };
    notify();
  },

  applyTrainerCode: (code: string): { success: boolean; message: string } => {
    const cleaned = code.trim().toUpperCase();
    if (!cleaned) {
      return { success: false, message: 'Please enter a valid trainer code' };
    }
    if (cleaned === 'COACHAMIT' || cleaned === 'FIT10' || cleaned === 'TRAINER10') {
      state = {
        ...state,
        trainerCode: cleaned,
        trainerDiscountApplied: true,
        passApplied: false, // Trainer discount replaces pass
      };
      notify();
      return { success: true, message: `Trainer code ${cleaned} applied (10% OFF)` };
    }
    return { success: false, message: 'Invalid trainer code. Try COACHAMIT' };
  },

  removeTrainerCode: () => {
    state = {
      ...state,
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
  let discount = 0;
  let discountLabel = '';
  if (current.passApplied) {
    discount = Math.round(itemTotal * 0.35); // 35% NutriFlexs Pass Discount
    discountLabel = 'NutriFlexs Pass (35% OFF)';
  } else if (current.trainerDiscountApplied) {
    discount = Math.round(itemTotal * 0.10); // 10% Trainer Referral Discount
    discountLabel = `Trainer ${current.trainerCode} (10% OFF)`;
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
