"use client";

import React from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice, formatMacro } from "@/lib/utils";
import { Clock, Plus, Zap, Leaf } from "lucide-react";

interface FoodCardProps {
  product: {
    id: string;
    name: string;
    description: string;
    price: number;
    calories: number;
    protein: number;
    carbs?: number;
    fats?: number;
    preparationTimeMinutes: number;
    imageUrl: string;
    isVeg: boolean;
    isPopular?: boolean;
  };
  onAddToCart?: (product: any) => void;
  onOpenDetails?: (product: any) => void;
  onQuickView?: (product: any) => void;
}

export function FoodCard({ product, onAddToCart, onOpenDetails, onQuickView }: FoodCardProps) {
  const handleOpen = () => {
    if (onQuickView) onQuickView(product);
    else if (onOpenDetails) onOpenDetails(product);
  };
  return (
    <div
      onClick={handleOpen}
      className="group bg-white rounded-3xl p-4 border border-nutri-border shadow-card hover:shadow-float hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between cursor-pointer relative"
    >
      <div>
        {/* Product Image & Badges */}
        <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-3 bg-nutri-bg">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            loading="lazy"
            quality={75}
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />

          {/* Top Left Badges */}
          <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5 z-10">
            {product.isVeg ? (
              <Badge variant="veg" className="bg-emerald-900/80 backdrop-blur-md text-emerald-100 border-none text-[10px]">
                <Leaf className="w-2.5 h-2.5 fill-current" /> VEG
              </Badge>
            ) : (
              <Badge variant="nonveg" className="bg-rose-900/80 backdrop-blur-md text-rose-100 border-none text-[10px]">
                NON-VEG
              </Badge>
            )}
            {product.isPopular && (
              <Badge variant="gold" className="bg-amber-500 text-white border-none text-[10px] font-bold">
                POPULAR
              </Badge>
            )}
          </div>

          {/* Prep Time Badge */}
          <div className="absolute bottom-2.5 right-2.5 bg-black/65 backdrop-blur-md text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3 text-nutri-accent" />
            <span>~{product.preparationTimeMinutes} min</span>
          </div>
        </div>

        {/* Title & Description */}
        <h3 className="font-bold font-heading text-nutri-charcoal text-base leading-snug group-hover:text-nutri-green transition-colors line-clamp-1">
          {product.name}
        </h3>
        <p className="text-xs text-nutri-muted mt-1 line-clamp-2 leading-relaxed">
          {product.description}
        </p>

        {/* Macro Pill Highlights */}
        <div className="flex items-center gap-2 mt-3 mb-4">
          <Badge variant="protein" className="text-xs font-bold px-3 py-1">
            <Zap className="w-3 h-3 text-nutri-green fill-nutri-green" />
            {formatMacro(product.protein)} Protein
          </Badge>
          <Badge variant="calories" className="text-xs">
            {product.calories} kcal
          </Badge>
        </div>
      </div>

      {/* Footer Price & Add CTA */}
      <div className="flex items-center justify-between pt-2 border-t border-nutri-border-light mt-auto" onClick={(e) => e.stopPropagation()}>
        <div>
          <span className="text-xs text-nutri-muted font-medium block">Price</span>
          <span className="text-lg font-bold text-nutri-charcoal font-heading">
            {formatPrice(product.price)}
          </span>
        </div>

        <Button
          size="sm"
          variant="primary"
          onClick={() => onAddToCart && onAddToCart(product)}
          className="rounded-full shadow-sm hover:scale-105 text-xs font-semibold px-4"
        >
          <Plus className="w-4 h-4 mr-1" /> Add
        </Button>
      </div>
    </div>
  );
}
