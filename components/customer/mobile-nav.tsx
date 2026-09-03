"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Utensils, ShoppingBag, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  cartCount?: number;
  onOpenCart?: () => void;
}

export function MobileNav({ cartCount = 0, onOpenCart }: MobileNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/home", icon: Home },
    { label: "Menu", href: "/menu", icon: Utensils },
    { label: "ORDER", href: "/menu", icon: ShoppingBag, isCenterOrder: true },
    { label: "Orders", href: "/orders", icon: Clock },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-nutri-border px-4 py-2 shadow-float">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {navItems.map((item, idx) => {
          const isActive = pathname === item.href || (item.href === "/menu" && pathname.startsWith("/menu"));

          if (item.isCenterOrder) {
            return (
              <Link
                key={idx}
                href="/menu"
                className="relative -top-5 flex flex-col items-center group"
              >
                <div className="w-14 h-14 rounded-full bg-nutri-green text-white flex items-center justify-center shadow-lg shadow-nutri-green/30 border-4 border-nutri-bg transition-transform active:scale-95 group-hover:bg-nutri-green-hover">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-nutri-green tracking-wide mt-0.5">
                  ORDER
                </span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 right-0 bg-amber-500 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white animate-bounce">
                    {cartCount}
                  </span>
                )}
              </Link>
            );
          }

          const IconComponent = item.icon;

          return (
            <Link
              key={idx}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-1 px-2 rounded-xl transition-colors",
                isActive ? "text-nutri-green font-semibold" : "text-nutri-muted hover:text-nutri-charcoal"
              )}
            >
              <IconComponent className="w-5 h-5" />
              <span className="text-[10px] mt-1 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
