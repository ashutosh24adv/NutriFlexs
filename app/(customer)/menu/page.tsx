"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Search, Leaf, Zap, RefreshCw } from "lucide-react";
import { FoodCard } from "@/components/customer/food-card";
import { ProductModal } from "@/components/customer/product-modal";
import { useCart } from "@/components/customer/cart-context";
import { useDietary } from "@/components/customer/dietary-context";

function MenuContent() {
  const { addToCart } = useCart();
  const { isVegetarian, toggleVegetarian } = useDietary();
  const searchParams = useSearchParams();
  const initialCategoryParam = searchParams.get("category");

  const [activeCategory, setActiveCategory] = useState(initialCategoryParam ? initialCategoryParam.toLowerCase() : "all");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterHighProtein, setFilterHighProtein] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Sync active category if query param changes
  useEffect(() => {
    if (initialCategoryParam) {
      setActiveCategory(initialCategoryParam.toLowerCase());
    }
  }, [initialCategoryParam]);

  useEffect(() => {
    async function loadMenuData() {
      setLoading(true);
      setError(null);
      try {
        const prodUrl = `/api/products${isVegetarian ? "?isVeg=true" : ""}`;
        const [resProds, resCats] = await Promise.all([
          fetch(prodUrl),
          fetch("/api/categories"),
        ]);

        const dataProds = await resProds.json();
        const dataCats = await resCats.json();

        if (dataProds.success && dataProds.products) {
          setProducts(dataProds.products);
        } else {
          setError(dataProds.error || "Failed to load products");
        }

        if (dataCats.success && dataCats.categories) {
          setCategories([
            { id: "all", slug: "all", name: "All Fuel" },
            ...dataCats.categories,
          ]);
        }
      } catch (e: any) {
        setError(e.message || "Network error loading menu from database");
      } finally {
        setLoading(false);
      }
    }
    loadMenuData();
  }, [isVegetarian]);

  const filteredProducts = products.filter((p) => {
    if (activeCategory !== "all") {
      const prodCatSlug = (p.categorySlug || p.category?.slug || "").toLowerCase();
      if (prodCatSlug !== activeCategory) {
        return false;
      }
    }
    if (isVegetarian && !p.isVeg) return false;
    if (filterHighProtein && p.protein < 25) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = p.name.toLowerCase().includes(q);
      const descMatch = p.description.toLowerCase().includes(q);
      const ingMatch = p.ingredients?.some((ingObj: any) =>
        (ingObj.ingredient?.name || ingObj).toLowerCase().includes(q)
      );
      if (!nameMatch && !descMatch && !ingMatch) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Menu Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-nutri-border pb-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            NutriFlexs Fuel Menu 🥗
          </h1>
          <p className="text-xs sm:text-sm text-nutri-secondary mt-0.5">
            Database-backed organic nutrition • Transparent macros • 5 min express pickup
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-nutri-secondary" />
          <input
            type="text"
            placeholder={isVegetarian ? "Search veg protein, juices..." : "Search protein, juices..."}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-nutri-border rounded-full pl-9 pr-4 py-2 text-xs font-medium placeholder:text-nutri-muted text-nutri-charcoal focus:outline-none focus:border-nutri-green transition-colors"
          />
        </div>
      </div>

      {/* Category Tabs & Quick Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Dynamic Database Categories */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categories.length === 0 ? (
            <div className="text-xs font-bold text-nutri-secondary">Loading Categories...</div>
          ) : (
            categories.map((cat) => {
              const catSlug = (cat.slug || cat.id).toLowerCase();
              const isSelected = activeCategory === catSlug;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(catSlug)}
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-all shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-nutri-green text-white shadow-xs"
                      : "bg-white text-nutri-secondary border border-nutri-border hover:border-nutri-green hover:text-nutri-charcoal"
                  }`}
                >
                  {cat.name}
                </button>
              );
            })
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => toggleVegetarian()}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
              isVegetarian
                ? "bg-nutri-green text-white border-nutri-green-deep shadow-xs"
                : "bg-white border-nutri-border text-nutri-secondary hover:text-nutri-charcoal"
            }`}
            title={isVegetarian ? "Click to disable Vegetarian Mode" : "Click to enable Vegetarian Mode"}
          >
            <Leaf className={`w-3.5 h-3.5 ${isVegetarian ? "fill-white text-white" : "text-nutri-green"}`} />
            <span>100% Veg {isVegetarian ? "ON" : "OFF"}</span>
          </button>

          <button
            onClick={() => setFilterHighProtein(!filterHighProtein)}
            className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer ${
              filterHighProtein
                ? "bg-nutri-green-light border-nutri-green text-nutri-green"
                : "bg-white border-nutri-border text-nutri-secondary hover:text-nutri-charcoal"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-nutri-green" /> High Protein (25g+)
          </button>
        </div>
      </div>

      {/* Main Products Grid */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <RefreshCw className="w-8 h-8 text-nutri-green animate-spin mx-auto" />
          <p className="text-xs font-bold text-nutri-secondary">Loading products from PostgreSQL...</p>
        </div>
      ) : error ? (
        <div className="p-8 bg-rose-50 border border-rose-200 rounded-2xl text-center space-y-2">
          <p className="text-sm font-bold text-rose-800">Database Connection Error</p>
          <p className="text-xs text-rose-600">{error}</p>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center bg-white border border-nutri-border rounded-2xl p-6">
          <p className="text-sm font-bold text-nutri-charcoal">No menu items match your criteria</p>
          <p className="text-xs text-nutri-secondary mt-1">Try clearing search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <FoodCard
              key={product.id}
              product={product}
              onAddToCart={(prod) => addToCart(prod, 1)}
              onQuickView={(prod) => setSelectedProduct(prod)}
            />
          ))}
        </div>
      )}

      {/* Product Detail Modal */}
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

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-xs font-bold text-nutri-green">Loading Menu...</div>}>
      <MenuContent />
    </Suspense>
  );
}
