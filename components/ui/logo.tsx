import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  showIcon?: boolean;
  className?: string;
}

export function NutriFlexsLogo({ size = "md", showTagline = false, showIcon = true, className = "" }: LogoProps) {
  const iconDimensions = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  }[size];

  const textSizes = {
    sm: "text-base sm:text-lg",
    md: "text-lg sm:text-xl",
    lg: "text-2xl sm:text-3xl",
  }[size];

  return (
    <Link href="/home" className={`inline-flex items-center gap-2 group cursor-pointer ${className}`}>
      {showIcon && (
        <div className={`relative ${iconDimensions} bg-nutri-green text-white rounded-xl flex items-center justify-center shadow-sm group-hover:bg-nutri-green-hover transition-colors p-1.5 shrink-0`}>
          <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
            <path
              d="M18 31.5C18 31.5 5 23 5 13.5C5 9.35786 8.35786 6 12.5 6C15.0252 6 17.2514 7.24765 18 9.16781C18.7486 7.24765 20.9748 6 23.5 6C27.6421 6 31 9.35786 31 13.5C31 23 18 31.5 18 31.5Z"
              fill="currentColor"
              fillOpacity="0.15"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <path d="M15 13V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M18 11V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M21 13V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M15 18C15 19.6569 16.3431 21 18 21C19.6569 21 21 19.6569 21 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M18 21V26" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path
              d="M23 4C23 4 28 5 29 10C24 10 23 4 23 4Z"
              fill="#4E9F2F"
              stroke="#FFFFFF"
              strokeWidth="1"
            />
          </svg>
        </div>
      )}

      <div className="flex flex-col items-center text-center">
        <span className={`font-extrabold tracking-tight text-nutri-green ${textSizes} leading-none font-heading uppercase`}>
          NUTRI<span className="text-nutri-green-dark">FLEXS</span>
        </span>
        {showTagline && (
          <span className="text-[9px] sm:text-[10px] font-bold tracking-[0.18em] text-nutri-green uppercase mt-0.5">
            REAL FOOD. REAL FUEL.
          </span>
        )}
      </div>
    </Link>
  );
}
