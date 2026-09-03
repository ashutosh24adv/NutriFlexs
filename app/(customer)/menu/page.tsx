"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, Leaf, Zap } from "lucide-react";
import { FoodCard } from "@/components/customer/food-card";
import { ProductModal } from "@/components/customer/product-modal";
import { useCart } from "@/components/customer/cart-context";

export default function MenuPage() {
  const { addToCart } = useCart();
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVegOnly, setFilterVegOnly] = useState(false);
  const [filterHighProtein, setFilterHighProtein] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial menu products dataset (13 exact products from requirements)
  const initialProducts = [
    {
      id: "prod-1",
      name: "ABC Stamina Rebuilder",
      slug: "abc-stamina-rebuilder",
      description: "Organic Apple, Beetroot, Carrot with Fresh Ginger & Lemon Juice. Ideal for nitric oxide boost & stamina.",
      price: 160,
      calories: 145,
      protein: 1.8,
      carbs: 34.0,
      fats: 0.4,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=80",
      categorySlug: "juices",
      isVeg: true,
      isPopular: true,
      ingredients: ["Organic Apple", "Organic Beetroot", "Organic Carrot", "Fresh Ginger", "Lemon Juice"],
    },
    {
      id: "prod-2",
      name: "Green Electrolyte & Alkalizer",
      slug: "green-electrolyte-alkalizer",
      description: "Spinach/Kale, Cucumber, Celery, Green Apple, Mint & Lemon. High magnesium & alkalizing minerals.",
      price: 140,
      calories: 85,
      protein: 2.5,
      carbs: 18.0,
      fats: 0.3,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&w=600&q=80",
      categorySlug: "juices",
      isVeg: true,
      isPopular: true,
      ingredients: ["Spinach/Kale", "Cucumber", "Celery", "Green Apple", "Mint", "Lemon"],
    },
    {
      id: "prod-3",
      name: "Citrus Hydrator & Recovery",
      slug: "citrus-hydrator-recovery",
      description: "Sweet Lime/Mosambi, Pineapple & Himalayan Pink Salt. Instant glycogen re-synthesis & hydration.",
      price: 150,
      calories: 160,
      protein: 2.0,
      carbs: 38.0,
      fats: 0.2,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=600&q=80",
      categorySlug: "juices",
      isVeg: true,
      isPopular: false,
      ingredients: ["Sweet Lime/Mosambi", "Pineapple", "Himalayan Pink Salt"],
    },
    {
      id: "prod-4",
      name: "Boiled Organic Egg White Pack",
      slug: "boiled-organic-egg-white-pack",
      description: "4 freshly steamed organic egg whites with black pepper and pink salt.",
      price: 90,
      calories: 72,
      protein: 16.0,
      carbs: 0.0,
      fats: 0.4,
      preparationTimeMinutes: 2,
      imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=600&q=80",
      categorySlug: "protein",
      isVeg: false,
      isPopular: true,
      ingredients: ["4 Organic Egg Whites", "Himalayan Pink Salt", "Black Pepper"],
    },
    {
      id: "prod-5",
      name: "High-Protein Egg Scramble on Toast",
      slug: "high-protein-egg-scramble-toast",
      description: "3 Whole Eggs + 1 Egg White on Whole-Wheat/Oat Toast with Spinach, Bell Peppers & Olive Oil.",
      price: 150,
      calories: 340,
      protein: 24.5,
      carbs: 28.0,
      fats: 14.0,
      preparationTimeMinutes: 4,
      imageUrl: "https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=80",
      categorySlug: "protein",
      isVeg: false,
      isPopular: false,
      ingredients: ["3 Whole Eggs", "1 Egg White", "Whole-Wheat Toast", "Spinach", "Bell Peppers"],
    },
    {
      id: "prod-6",
      name: "Herb-Grilled Organic Paneer Skewers",
      slug: "herb-grilled-organic-paneer-skewers",
      description: "150g grilled organic cottage cheese cubes marinated in rosemary, mint & olive oil.",
      price: 180,
      calories: 410,
      protein: 27.0,
      carbs: 9.0,
      fats: 30.0,
      preparationTimeMinutes: 4,
      imageUrl: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?auto=format&fit=crop&w=600&q=80",
      categorySlug: "protein",
      isVeg: true,
      isPopular: true,
      ingredients: ["Organic Paneer 150g", "Rosemary", "Mint", "Olive Oil"],
    },
    {
      id: "prod-7",
      name: "Lean Grilled Chicken Breast",
      slug: "lean-grilled-chicken-breast",
      description: "150g raw / approx 120g cooked tender chicken breast served with steamed broccoli & carrots.",
      price: 210,
      calories: 220,
      protein: 36.0,
      carbs: 3.5,
      fats: 6.0,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?auto=format&fit=crop&w=600&q=80",
      categorySlug: "protein",
      isVeg: false,
      isPopular: true,
      ingredients: ["Lean Chicken Breast 150g", "Steamed Broccoli", "Carrots", "Lemon"],
    },
    {
      id: "prod-8",
      name: "Pan-Seared Lemon Herb Fish Fillet",
      slug: "pan-seared-lemon-herb-fish-fillet",
      description: "140g fresh white fish fillet pan-seared in lemon, dill & pink salt with crisp side salad.",
      price: 290,
      calories: 190,
      protein: 28.0,
      carbs: 2.0,
      fats: 7.5,
      preparationTimeMinutes: 4,
      imageUrl: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80",
      categorySlug: "protein",
      isVeg: false,
      isPopular: false,
      ingredients: ["Fresh Fish Fillet 140g", "Lemon Juice", "Fresh Dill", "Side Salad"],
    },
    {
      id: "prod-9",
      name: "Grilled Chicken & Quinoa Energy Bowl",
      slug: "grilled-chicken-quinoa-energy-bowl",
      description: "High-protein bowl with grilled chicken breast, fluffy organic quinoa, roasted veggies & avocado dressing.",
      price: 250,
      calories: 430,
      protein: 32.0,
      carbs: 44.0,
      fats: 12.0,
      preparationTimeMinutes: 4,
      imageUrl: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80",
      categorySlug: "bowls",
      isVeg: false,
      isPopular: true,
      ingredients: ["Grilled Chicken", "Organic Quinoa", "Avocado", "Roasted Veggies"],
    },
    {
      id: "prod-10",
      name: "High-Protein Veggie & Sprouts Bowl",
      slug: "high-protein-veggie-sprouts-bowl",
      description: "Sprouted green gram, organic tofu/paneer, pomegranate, cucumbers, peanuts & mint chutney.",
      price: 170,
      calories: 320,
      protein: 21.0,
      carbs: 31.0,
      fats: 12.5,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80",
      categorySlug: "bowls",
      isVeg: true,
      isPopular: true,
      ingredients: ["Mixed Sprouts", "Organic Tofu/Paneer", "Pomegranate", "Roasted Peanuts"],
    },
    {
      id: "prod-11",
      name: "Lean Refuel Combo",
      slug: "lean-refuel-combo",
      description: "ABC Stamina Rebuilder Juice + 4 Boiled Egg Whites. Perfect fast recovery pack.",
      price: 230,
      calories: 217,
      protein: 17.8,
      carbs: 34.0,
      fats: 0.8,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80",
      categorySlug: "combos",
      isVeg: false,
      isPopular: true,
      ingredients: ["ABC Juice", "4 Boiled Egg Whites"],
    },
    {
      id: "prod-12",
      name: "Vegan Muscle Pack",
      slug: "vegan-muscle-pack",
      description: "Green Electrolyte & Alkalizer Juice + High-Protein Veggie & Sprouts Bowl.",
      price: 280,
      calories: 405,
      protein: 23.5,
      carbs: 49.0,
      fats: 12.8,
      preparationTimeMinutes: 3,
      imageUrl: "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=600&q=80",
      categorySlug: "combos",
      isVeg: true,
      isPopular: true,
      ingredients: ["Green Juice", "Sprouts & Tofu Bowl"],
    },
    {
      id: "prod-13",
      name: "Pro-Gainer Combo",
      slug: "pro-gainer-combo",
      description: "Citrus Hydrator Juice + Lean Grilled Chicken Breast. High glycogen & protein replenishment.",
      price: 340,
      calories: 380,
      protein: 38.0,
      carbs: 41.5,
      fats: 6.2,
      preparationTimeMinutes: 4,
      imageUrl: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80",
      categorySlug: "combos",
      isVeg: false,
      isPopular: true,
      ingredients: ["Citrus Hydrator Juice", "Lean Grilled Chicken Breast"],
    },
  ];

  useEffect(() => {
    async function loadProducts() {
      try {
        const res = await fetch("/api/products");
        const data = await res.json();
        if (data.success && data.products && data.products.length > 0) {
          setProducts(data.products);
        } else {
          setProducts(initialProducts);
        }
      } catch (e) {
        setProducts(initialProducts);
      } finally {
        setLoading(false);
      }
    }
    loadProducts();
  }, []);

  const categories = [
    { id: "all", label: "All Fuel" },
    { id: "juices", label: "Juices" },
    { id: "protein", label: "Protein" },
    { id: "bowls", label: "Bowls" },
    { id: "combos", label: "Combos" },
  ];

  const filteredProducts = products.filter((p) => {
    if (activeCategory !== "all" && p.categorySlug !== activeCategory && p.category?.slug !== activeCategory) {
      return false;
    }
    if (filterVegOnly && !p.isVeg) return false;
    if (filterHighProtein && p.protein < 25) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(q);
      const descMatch = p.description.toLowerCase().includes(q);
      const ingMatch = Array.isArray(p.ingredients) && p.ingredients.some((ing: any) =>
        (typeof ing === "string" ? ing : ing.ingredient?.name || "").toLowerCase().includes(q)
      );
      return nameMatch || descMatch || ingMatch;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal">
          Fitness Fuel Menu
        </h1>
        <p className="text-xs sm:text-sm text-nutri-muted mt-1">
          100% Organic, fresh cold-pressed & prepared in 3–5 minutes at Indiranagar Kiosk.
        </p>
      </div>

      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-nutri-muted absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search by meal, protein, or ingredient (e.g. chicken, spinach, juice)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-sm pl-11 pr-4 py-3 rounded-2xl border border-nutri-border shadow-sm focus:outline-none focus:border-nutri-green focus:ring-2 focus:ring-nutri-green/20"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveCategory(c.id)}
                className={`text-xs font-semibold px-4 py-2 rounded-full transition-all shrink-0 ${
                  activeCategory === c.id
                    ? "bg-nutri-green text-white shadow-sm"
                    : "bg-white text-nutri-muted border border-nutri-border hover:text-nutri-charcoal"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilterVegOnly(!filterVegOnly)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                filterVegOnly
                  ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                  : "bg-white text-nutri-muted border-nutri-border"
              }`}
            >
              <Leaf className="w-3 h-3 text-emerald-600" /> Veg Only
            </button>

            <button
              onClick={() => setFilterHighProtein(!filterHighProtein)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                filterHighProtein
                  ? "bg-nutri-green-light text-nutri-green border-nutri-green-soft"
                  : "bg-white text-nutri-muted border-nutri-border"
              }`}
            >
              <Zap className="w-3 h-3 text-nutri-green fill-nutri-green" /> High Protein (25g+)
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-3xl p-4 border border-nutri-border h-64 animate-pulse space-y-3">
              <div className="bg-nutri-bg h-36 rounded-2xl" />
              <div className="bg-nutri-bg h-4 rounded w-3/4" />
              <div className="bg-nutri-bg h-4 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-nutri-border p-8">
          <Filter className="w-12 h-12 text-nutri-muted mx-auto mb-3" />
          <h3 className="text-lg font-bold text-nutri-charcoal font-heading">No Products Found</h3>
          <p className="text-xs text-nutri-muted mt-1 max-w-sm mx-auto">
            We couldn&apos;t find any items matching your filters or search query. Try clearing your search or toggles.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => (
            <FoodCard
              key={product.id}
              product={product}
              onAddToCart={(prod) => addToCart(prod, 1)}
              onOpenDetails={(prod) => setSelectedProduct(prod)}
            />
          ))}
        </div>
      )}

      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={(prod, qty) => addToCart(prod, qty)}
        />
      )}
    </div>
  );
}
