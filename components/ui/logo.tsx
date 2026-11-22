"use client";

import React from "react";
import Link from "next/link";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showTagline?: boolean;
  showIcon?: boolean;
  className?: string;
  href?: string;
}

export function NutriFlexsLogo({ size = "md", showTagline = false, showIcon = true, className = "", href }: LogoProps) {
  const targetHref = href ?? "/";

  const iconClasses = {
    sm: "w-8 h-8 sm:w-9 sm:h-9 p-1.5 rounded-xl",
    md: "w-[40px] h-[40px] sm:w-[44px] sm:h-[44px] lg:w-[46px] lg:h-[46px] xl:w-[48px] xl:h-[48px] p-2 sm:p-2.5 rounded-xl sm:rounded-2xl",
    lg: "w-14 h-14 lg:w-16 lg:h-16 p-3 rounded-2xl",
  }[size];

  const brandClasses = {
    sm: "text-[15px] sm:text-base",
    md: "text-[19px] sm:text-[21px] lg:text-[23px] xl:text-[24px]",
    lg: "text-2xl sm:text-3xl lg:text-4xl",
  }[size];

  const taglineClasses = {
    sm: "text-[8.5px] sm:text-[9px] mt-0.5",
    md: "text-[9.5px] sm:text-[10px] lg:text-[10.5px] xl:text-[11px] mt-1",
    lg: "text-xs sm:text-sm mt-1.5",
  }[size];

  const gapClasses = {
    sm: "gap-2 sm:gap-2.5",
    md: "gap-2.5 sm:gap-3",
    lg: "gap-3.5 sm:gap-4",
  }[size];

  return (
    <Link
      href={targetHref}
      aria-label="NutriFlexs - Eat Smart. Track Better."
      className={`inline-flex items-center ${gapClasses} group cursor-pointer select-none shrink-0 transition-all duration-200 hover:opacity-90 active:scale-[0.98] ${className}`}
    >
      {showIcon && (
        <div
          className={`relative ${iconClasses} bg-nutri-green text-white flex items-center justify-center shadow-2xs group-hover:bg-nutri-green-hover group-hover:shadow-xs group-hover:scale-[1.03] transition-all duration-200 shrink-0 overflow-hidden`}
        >
          <svg
            viewBox="0 0 36 36"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full block"
          >
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

      <div className="flex flex-col justify-center items-start text-left min-w-0 shrink-0 group-hover:brightness-95 transition-all duration-200">
        <span className={`font-extrabold tracking-tight text-nutri-green ${brandClasses} leading-none font-heading uppercase whitespace-nowrap`}>
          <span>NUTRI</span><span className="text-nutri-green-dark">FLEXS</span>
        </span>
        {showTagline && (
          <span className={`font-medium tracking-wide text-nutri-green/90 ${taglineClasses} leading-tight whitespace-nowrap`}>
            Eat Smart. Track Better.
          </span>
        )}
      </div>
    </Link>
  );
}
