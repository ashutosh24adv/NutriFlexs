"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Leaf, ShoppingBag, Clock, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  cartCount?: number;
  onOpenCart?: () => void;
}

export function MobileNav({ cartCount = 0, onOpenCart }: MobileNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: "Home", href: "/home", icon: Home },
    { label: "Menu", href: "/menu", icon: Leaf },
    { label: "Cart", href: "/cart", icon: ShoppingBag, isCenterOrder: true },
    { label: "Orders", href: "/orders", icon: Clock },
    { label: "Profile", href: "/profile", icon: User },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-nutri-border-light px-3 py-1.5 shadow-lg">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {navItems.map((item, idx) => {
          let isActive = false;
          if (item.href === "/home") {
            isActive = pathname === "/home" || pathname === "/";
          } else if (item.href === "/menu") {
            isActive = pathname.startsWith("/menu");
          } else if (item.href === "/orders") {
            isActive = pathname.startsWith("/orders");
          } else if (item.href === "/profile") {
            isActive = pathname.startsWith("/profile");
          } else if (item.href === "/cart") {
            isActive = pathname.startsWith("/cart") || pathname.startsWith("/checkout");
          }

          if (item.isCenterOrder) {
            return (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (onOpenCart) onOpenCart();
                }}
                className="relative -top-5 flex flex-col items-center group shrink-0 cursor-pointer"
                aria-label="View Cart"
              >
                <div className="w-13 h-13 rounded-full bg-nutri-green text-white flex items-center justify-center shadow-lg border-3 border-white transition-transform active:scale-95 group-hover:bg-nutri-green-dark p-3">
                  <ShoppingBag className="w-6 h-6 stroke-[2]" />
                </div>
                <span className="text-[11px] font-bold text-nutri-green tracking-tight mt-0.5">
                  {cartCount > 0 ? `Cart (${cartCount})` : "Cart"}
                </span>
                {cartCount > 0 && (
                  <span className="absolute -top-1 right-0 bg-amber-500 text-white text-[10px] font-extrabold rounded-full w-5 h-5 flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </button>
            );
          }

          const IconComponent = item.icon;

          return (
            <Link
              key={idx}
              href={item.href}
              className={cn(
                "flex flex-col items-center py-1 px-2.5 rounded-xl transition-colors min-w-[54px]",
                isActive ? "text-nutri-green font-bold" : "text-nutri-muted hover:text-nutri-charcoal"
              )}
            >
              <IconComponent className={cn("w-5 h-5 stroke-[2]", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
              {isActive && (
                <span className="w-4 h-0.5 bg-nutri-green rounded-full mt-0.5" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
