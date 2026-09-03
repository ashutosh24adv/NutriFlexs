import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  className?: string;
}

export function NutriFlexsLogo({ size = "md", showTagline = false, className = "" }: LogoProps) {
  const iconDimensions = {
    sm: "w-7 h-7",
    md: "w-9 h-9",
    lg: "w-12 h-12",
  }[size];

  const textSizes = {
    sm: "text-lg",
    md: "text-xl",
    lg: "text-2xl",
  }[size];

  return (
    <Link href="/" className={`inline-flex items-center gap-2.5 group cursor-pointer ${className}`}>
      {/* Heart + Fork + Leaf Custom SVG Brand Icon */}
      <div className={`relative ${iconDimensions} bg-nutri-green text-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-nutri-green-hover transition-colors p-1.5`}>
        <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          {/* Heart Outer Outline & Body */}
          <path
            d="M18 31.5C18 31.5 5 23 5 13.5C5 9.35786 8.35786 6 12.5 6C15.0252 6 17.2514 7.24765 18 9.16781C18.7486 7.24765 20.9748 6 23.5 6C27.6421 6 31 9.35786 31 13.5C31 23 18 31.5 18 31.5Z"
            fill="currentColor"
            fillOpacity="0.15"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Fork Prongs integrated inside Heart */}
          <path d="M15 13V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 11V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M21 13V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M15 18C15 19.6569 16.3431 21 18 21C19.6569 21 21 19.6569 21 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M18 21V26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />

          {/* Leaf Accent growing from top right of heart */}
          <path
            d="M23 4C23 4 28 5 29 10C24 10 23 4 23 4Z"
            fill="#34A853"
            stroke="#FAFBF8"
            strokeWidth="1"
          />
        </svg>
      </div>

      <div className="flex flex-col">
        <span className={`font-bold tracking-tight text-nutri-charcoal ${textSizes} leading-none font-heading`}>
          NUTRI<span className="text-nutri-green">FLEXS</span>
        </span>
        {showTagline && (
          <span className="text-[10px] font-semibold tracking-widest text-nutri-muted uppercase mt-0.5">
            REAL FOOD. REAL FUEL.
          </span>
        )}
      </div>
    </Link>
  );
}
