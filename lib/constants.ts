/**
 * NutriFlexs Centralized Application Constants
 */

export const APP_CONFIG = {
  name: "NutriFlexs",
  tagline: "REAL FOOD. REAL FUEL.",
  description: "Fresh cold-pressed juices & freshly prepared high-protein meals right outside your gym in 5 minutes.",
  
  // Preparation & Pickup estimates
  preparationTimeMinutes: 5,
  preparationTimeLabel: "~5 min",
  preparationTimeEstimate: "Ready in ~5 minutes",
  pickupTimeText: "5 minutes",
  pickupHighlight: "5 Min Pickup",
  
  // Canonical Routes
  routes: {
    landing: "/",
    home: "/home",
    menu: "/menu",
    cart: "/cart",
    checkout: "/checkout",
    pass: "/pass",
    orders: "/orders",
    profile: "/profile",
    login: "/login",
    signup: "/signup",
    kitchen: "/kitchen",
    trainer: "/trainer",
    admin: "/admin",
  },
} as const;
