"use client";

import React, { useState } from "react";
import Image from "next/image";
import { X, Clock, Zap, Flame, Wheat, Droplets, CheckCircle2, Plus, Minus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, formatMacro } from "@/lib/utils";

interface ProductModalProps {
  product: any | null;
  onClose: () => void;
  onAddToCart: (product: any, quantity: number) => void;
}

export function ProductModal({ product, onClose, onAddToCart }: ProductModalProps) {
  const [quantity, setQuantity] = useState(1);

  if (!product) return null;

  const handleAdd = () => {
    onAddToCart(product, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-slide-up">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md text-nutri-charcoal flex items-center justify-center hover:bg-white shadow-md transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Hero Product Image */}
        <div className="relative w-full h-56 sm:h-64 bg-nutri-bg shrink-0">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={product.isVeg ? "veg" : "nonveg"} className="text-white border-white/40">
                {product.isVeg ? "100% VEGETARIAN" : "HIGH PROTEIN NON-VEG"}
              </Badge>
              <span className="text-xs bg-black/50 backdrop-blur-md px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium">
                <Clock className="w-3 h-3 text-nutri-accent" /> ~{product.preparationTimeMinutes} min preparation
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold font-heading text-white">{product.name}</h2>
          </div>
        </div>

        {/* Details Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          <p className="text-sm text-nutri-muted leading-relaxed">{product.description}</p>

          {/* Prominent Macro Dashboard */}
          <div>
            <h4 className="text-xs font-bold text-nutri-muted uppercase tracking-wider mb-2.5">
              Nutrition & Macro Breakdown
            </h4>
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-nutri-green-light p-3 rounded-2xl text-center border border-nutri-green-soft">
                <Zap className="w-4 h-4 text-nutri-green mx-auto mb-1 fill-nutri-green" />
                <span className="block text-base font-bold text-nutri-green font-heading">
                  {formatMacro(product.protein)}
                </span>
                <span className="text-[10px] font-semibold text-nutri-green/80 uppercase">Protein</span>
              </div>

              <div className="bg-orange-50 p-3 rounded-2xl text-center border border-orange-200">
                <Flame className="w-4 h-4 text-orange-600 mx-auto mb-1 fill-orange-600" />
                <span className="block text-base font-bold text-orange-800 font-heading">
                  {product.calories}
                </span>
                <span className="text-[10px] font-semibold text-orange-700/80 uppercase">Calories</span>
              </div>

              <div className="bg-blue-50 p-3 rounded-2xl text-center border border-blue-200">
                <Wheat className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                <span className="block text-base font-bold text-blue-800 font-heading">
                  {formatMacro(product.carbs || 0)}
                </span>
                <span className="text-[10px] font-semibold text-blue-700/80 uppercase">Carbs</span>
              </div>

              <div className="bg-amber-50 p-3 rounded-2xl text-center border border-amber-200">
                <Droplets className="w-4 h-4 text-amber-600 mx-auto mb-1" />
                <span className="block text-base font-bold text-amber-800 font-heading">
                  {formatMacro(product.fats || 0)}
                </span>
                <span className="text-[10px] font-semibold text-amber-700/80 uppercase">Fats</span>
              </div>
            </div>
          </div>

          {/* Clean Ingredients Chips */}
          <div>
            <h4 className="text-xs font-bold text-nutri-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-nutri-green" /> 100% Clean Ingredients
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {(product.ingredients && product.ingredients.length > 0
                ? product.ingredients.map((i: any) => i.ingredient?.name || i.name)
                : ["Organic Farm Produce", "Zero Preservatives", "Himalayan Pink Salt", "Olive Oil Spray"]
              ).map((ing: string, idx: number) => (
                <span
                  key={idx}
                  className="text-xs bg-nutri-bg text-nutri-charcoal font-medium px-3 py-1 rounded-full border border-nutri-border"
                >
                  {ing}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Footer Quantity Selector & Add CTA */}
        <div className="p-4 bg-nutri-bg border-t border-nutri-border flex items-center justify-between gap-4 mt-auto">
          {/* Quantity Controls */}
          <div className="flex items-center gap-3 bg-white p-1.5 rounded-full border border-nutri-border">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-8 h-8 rounded-full bg-nutri-bg text-nutri-charcoal flex items-center justify-center hover:bg-nutri-border font-bold text-sm"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="text-sm font-bold text-nutri-charcoal w-4 text-center">
              {quantity}
            </span>
            <button
              onClick={() => setQuantity(quantity + 1)}
              className="w-8 h-8 rounded-full bg-nutri-green-light text-nutri-green flex items-center justify-center hover:bg-nutri-green-soft font-bold text-sm"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Add CTA */}
          <Button
            onClick={handleAdd}
            size="lg"
            variant="primary"
            className="flex-1 font-bold shadow-lg shadow-nutri-green/20"
          >
            ADD TO ORDER · {formatPrice(product.price * quantity)}
          </Button>
        </div>
      </div>
    </div>
  );
}
