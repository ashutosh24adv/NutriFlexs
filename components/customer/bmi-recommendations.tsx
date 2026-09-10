"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, ArrowRight, Loader2, Scale, Ruler, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FoodCard } from "@/components/customer/food-card";
import { ProductModal } from "@/components/customer/product-modal";
import { useCart } from "@/components/customer/cart-context";

export function BmiRecommendations() {
  const { addToCart } = useCart();

  const [heightCm, setHeightCm] = useState<string>("");
  const [weightKg, setWeightKg] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    bmi: number;
    category: string;
    categoryLabel: string;
    products: any[];
  } | null>(null);

  const [selectedProductModal, setSelectedProductModal] = useState<any | null>(null);

  // Optional prefill from localStorage if user previously entered it
  useEffect(() => {
    try {
      const saved = localStorage.getItem("nutriflexs_bmi_inputs");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.heightCm) setHeightCm(String(parsed.heightCm));
        if (parsed.weightKg) setWeightKg(String(parsed.weightKg));
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleCalculate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const h = parseFloat(heightCm);
    const w = parseFloat(weightKg);

    if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0 || h < 80 || h > 260 || w < 20 || w > 350) {
      setError("Please enter a valid height and weight.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ heightCm: h, weightKg: w }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.error || "Please enter a valid height and weight.");
        return;
      }

      setResult({
        bmi: data.bmi,
        category: data.category,
        categoryLabel: data.categoryLabel,
        products: data.products || [],
      });

      try {
        localStorage.setItem(
          "nutriflexs_bmi_inputs",
          JSON.stringify({ heightCm: h, weightKg: w })
        );
      } catch (e) {
        // ignore
      }
    } catch (err: any) {
      setError(err.message || "Failed to calculate recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case "UNDERWEIGHT":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "NORMAL":
        return "bg-nutri-green-light text-nutri-green border-nutri-green-soft";
      case "OVERWEIGHT":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "OBESITY":
        return "bg-rose-50 text-rose-700 border-rose-200";
      default:
        return "bg-nutri-green-light text-nutri-green border-nutri-green-soft";
    }
  };

  return (
    <section className="bg-white rounded-3xl border border-nutri-border p-5 sm:p-7 shadow-sm space-y-6">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Badge variant="gold" className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-bold text-xs px-3 py-0.5">
            <Sparkles className="w-3.5 h-3.5 mr-1 fill-nutri-green" /> PERSONALIZED FUEL
          </Badge>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
          Find What&apos;s Right For You
        </h2>
        <p className="text-xs sm:text-sm text-nutri-muted">
          Enter your height and weight to get NutriFlexs recommendations.
        </p>
      </div>

      {/* Input Form */}
      <form onSubmit={handleCalculate} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Height Input */}
          <div className="space-y-1.5">
            <label htmlFor="bmi-height" className="block text-xs font-bold text-nutri-charcoal">
              Height (cm)
            </label>
            <div className="relative">
              <input
                id="bmi-height"
                type="number"
                step="any"
                min="80"
                max="260"
                value={heightCm}
                onChange={(e) => setHeightCm(e.target.value)}
                placeholder="175"
                className="w-full bg-nutri-bg border border-nutri-border focus:border-nutri-green focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold text-nutri-charcoal outline-hidden transition-all pl-10"
              />
              <Ruler className="w-4 h-4 text-nutri-muted absolute left-3.5 top-3.5" />
              <span className="absolute right-3.5 top-3.5 text-xs font-semibold text-nutri-muted">
                cm
              </span>
            </div>
          </div>

          {/* Weight Input */}
          <div className="space-y-1.5">
            <label htmlFor="bmi-weight" className="block text-xs font-bold text-nutri-charcoal">
              Weight (kg)
            </label>
            <div className="relative">
              <input
                id="bmi-weight"
                type="number"
                step="any"
                min="20"
                max="350"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                placeholder="68"
                className="w-full bg-nutri-bg border border-nutri-border focus:border-nutri-green focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold text-nutri-charcoal outline-hidden transition-all pl-10"
              />
              <Scale className="w-4 h-4 text-nutri-muted absolute left-3.5 top-3.5" />
              <span className="absolute right-3.5 top-3.5 text-xs font-semibold text-nutri-muted">
                kg
              </span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-semibold animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit button */}
        <div className="pt-1 flex justify-center sm:justify-start">
          <Button
            type="submit"
            disabled={loading}
            size="lg"
            variant="primary"
            className="w-full sm:w-auto font-bold text-sm px-6 rounded-full shadow-md shadow-nutri-green/15"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculating Recommendations...
              </>
            ) : (
              <>
                Get My Recommendations
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </form>

      {/* Results Section */}
      {result && (
        <div className="pt-6 border-t border-nutri-border space-y-6 animate-fade-in">
          {/* BMI Card */}
          <div className="bg-nutri-bg border border-nutri-border rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-semibold text-nutri-muted uppercase tracking-wider block">
                Your BMI
              </span>
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal">
                  {result.bmi}
                </span>
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getCategoryBadgeClass(
                    result.category
                  )}`}
                >
                  {result.categoryLabel}
                </span>
              </div>
            </div>

            <div className="text-xs text-nutri-muted sm:text-right max-w-xs leading-relaxed">
              Tailored suggestions from our live database for a{" "}
              <strong className="text-nutri-charcoal">{result.categoryLabel.toLowerCase()}</strong>{" "}
              nutritional profile.
            </div>
          </div>

          {/* Recommended Products */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold font-heading text-nutri-charcoal">
                Recommended For You
              </h3>
              <span className="text-xs font-semibold text-nutri-green">
                {result.products.length} options from menu
              </span>
            </div>

            {result.products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {result.products.map((product) => (
                  <FoodCard
                    key={product.id}
                    product={product}
                    onAddToCart={(p) => addToCart(p, 1)}
                    onOpenDetails={(p) => setSelectedProductModal(p)}
                    onQuickView={(p) => setSelectedProductModal(p)}
                  />
                ))}
              </div>
            ) : (
              <Card className="p-6 text-center text-xs text-nutri-muted">
                No matching products found. Check out the full menu!
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Modal for detailed nutrition and customization */}
      {selectedProductModal && (
        <ProductModal
          product={selectedProductModal}
          onClose={() => setSelectedProductModal(null)}
          onAddToCart={(p, qty) => addToCart(p, qty)}
        />
      )}
    </section>
  );
}
