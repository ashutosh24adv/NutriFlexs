"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { Lock, ChefHat, Dumbbell, Shield, ShoppingBag, LogOut, User } from "lucide-react";
import { useCart } from "@/components/customer/cart-context";
import { CartDrawer } from "@/components/customer/cart-drawer";
import { VegetarianToggle } from "@/components/customer/vegetarian-toggle";
import { openNutriFlexsApp } from "@/lib/mobile-app";
import { OpenAppModal } from "@/components/customer/app-modal";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const user = session?.user as any;
  const userRole = (user?.role as string) || (isAuthenticated ? "CUSTOMER" : "GUEST");
  const isCustomer = isAuthenticated && userRole === "CUSTOMER";
  const isPublicLanding = pathname === "/" || pathname === "";
  const showStaffPortalButton = !isCustomer && (!isAuthenticated ? isPublicLanding : userRole === "ADMIN");
  const userName = user?.name || "Customer";

  const [showStaffPortal, setShowStaffPortal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isOpenAppModalOpen, setIsOpenAppModalOpen] = useState(false);

  const {
    cartItems,
    isCartOpen,
    setIsCartOpen,
    updateQuantity,
    removeItem,
    clearCart,
    totalItemCount,
  } = useCart();

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    if (pathname === "/" || pathname === "") {
      e.preventDefault();
      const elem = document.getElementById(sectionId);
      if (elem) {
        elem.scrollIntoView({ behavior: "smooth" });
        window.history.pushState(null, "", `/#${sectionId}`);
      }
    }
  };

  const handleOpenAppClick = () => {
    if (isAuthenticated) {
      router.push("/home");
      return;
    }
    openNutriFlexsApp({
      onUnconfigured: () => {
        setIsOpenAppModalOpen(true);
      },
    });
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-nutri-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Left: Logo */}
          <div className="flex items-center gap-4">
            <NutriFlexsLogo size="md" showTagline={false} href={isAuthenticated ? "/home" : "/"} />
          </div>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-nutri-secondary">
            <Link
              href="/#find-fuel"
              onClick={(e) => handleNavClick(e, "find-fuel")}
              className="hover:text-nutri-green transition-colors cursor-pointer"
            >
              Find Your Fuel
            </Link>
            <Link
              href="/#why-nutriflexs"
              onClick={(e) => handleNavClick(e, "why-nutriflexs")}
              className="hover:text-nutri-green transition-colors cursor-pointer"
            >
              Why NutriFlexs
            </Link>
            <Link
              href="/#how-it-works"
              onClick={(e) => handleNavClick(e, "how-it-works")}
              className="hover:text-nutri-green transition-colors cursor-pointer"
            >
              How It Works
            </Link>
            <Link
              href="/menu"
              className={cn(
                "hover:text-nutri-green transition-colors cursor-pointer",
                pathname.startsWith("/menu")
                  ? "text-nutri-green font-bold border-b-2 border-nutri-green pb-0.5"
                  : ""
              )}
            >
              Menu
            </Link>
            <Link
              href="/pass"
              className={cn(
                "hover:text-nutri-green transition-colors cursor-pointer",
                pathname.startsWith("/pass")
                  ? "text-nutri-green font-bold border-b-2 border-nutri-green pb-0.5"
                  : ""
              )}
            >
              NutriFlexs Pass
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {/* Staff Portal Dropdown (visible on public landing page for guests, hidden for logged-in customers) */}
            {showStaffPortalButton && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowStaffPortal(!showStaffPortal)}
                  className="text-xs bg-nutri-green-soft hover:bg-nutri-green-light text-nutri-green font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-nutri-border cursor-pointer transition-colors"
                  title="Staff & Operator Portals"
                >
                  <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden sm:inline">Staff Portal</span>
                </button>

                {showStaffPortal && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowStaffPortal(false)} />
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl p-2.5 shadow-md border border-nutri-border z-50 animate-slide-up text-xs space-y-1">
                      <div className="px-3 py-1 font-bold text-nutri-secondary uppercase tracking-wider text-[10px] border-b border-nutri-border-light pb-1 mb-1">
                        Internal Staff Portals
                      </div>
                      <Link
                        href="/kitchen"
                        onClick={() => setShowStaffPortal(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-amber-50 text-amber-900 font-bold transition-colors"
                      >
                        <ChefHat className="w-4 h-4 text-amber-600" /> Kitchen Display Kiosk
                      </Link>
                      <Link
                        href="/trainer"
                        onClick={() => setShowStaffPortal(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-indigo-50 text-indigo-900 font-bold transition-colors"
                      >
                        <Dumbbell className="w-4 h-4 text-indigo-600" /> Trainer Partner Portal
                      </Link>
                      <Link
                        href="/admin"
                        onClick={() => setShowStaffPortal(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-rose-50 text-rose-900 font-bold transition-colors"
                      >
                        <Shield className="w-4 h-4 text-rose-600" /> Super Admin Operations
                      </Link>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Vegetarian Toggle (authenticated customer only, beside cart icon) */}
            {isAuthenticated && (
              <VegetarianToggle variant="header" />
            )}

            {/* Cart Icon Button */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 rounded-full bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft transition-colors cursor-pointer"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              {totalItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-nutri-green text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {totalItemCount}
                </span>
              )}
            </button>

            {/* Auth Section: Profile Avatar with Dropdown (authenticated) OR Sign In (guest) */}
            {status === "loading" ? (
              <div className="w-8 h-8 rounded-full bg-nutri-green/20 animate-pulse shrink-0" />
            ) : isAuthenticated ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-8 h-8 rounded-full bg-nutri-green text-white flex items-center justify-center font-extrabold text-xs shadow-xs hover:ring-2 hover:ring-nutri-green/40 hover:ring-offset-1 transition-all cursor-pointer focus:outline-none overflow-hidden shrink-0"
                  aria-label="User Account Menu"
                  title={userName}
                >
                  {user?.image || user?.avatar ? (
                    <Image
                      src={user.image || user.avatar}
                      alt={userName}
                      width={32}
                      height={32}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(userName?.charAt(0) || user?.email?.charAt(0) || "C").toUpperCase()}</span>
                  )}
                </button>

                {showProfileMenu && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowProfileMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-2xl p-2.5 shadow-xl border border-nutri-border z-50 animate-slide-up text-xs space-y-1">
                      <div className="px-3 py-2 border-b border-nutri-border-light pb-2 mb-1">
                        <p className="font-bold text-nutri-charcoal text-xs truncate">
                          {userName}
                        </p>
                        {user?.email && (
                          <p className="text-[11px] text-nutri-secondary truncate">
                            {user.email}
                          </p>
                        )}
                      </div>
                      <Link
                        href="/profile"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-nutri-bg text-nutri-charcoal font-semibold transition-colors"
                      >
                        <User className="w-4 h-4 text-nutri-green" /> Profile
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-nutri-bg text-nutri-charcoal font-semibold transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 text-nutri-green" /> Orders
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          setShowProfileMenu(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-xl hover:bg-rose-50 text-rose-600 font-semibold transition-colors cursor-pointer text-left"
                      >
                        <LogOut className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className={`hidden sm:inline-block text-xs font-bold text-nutri-charcoal hover:text-nutri-green px-2 py-1 transition-colors ${
                  pathname === "/login" ? "text-nutri-green" : ""
                }`}
              >
                Sign In
              </Link>
            )}

            {/* Open App button */}
            <Button
              size="sm"
              onClick={handleOpenAppClick}
              className="bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs px-4 py-2 rounded-full cursor-pointer shadow-xs"
            >
              OPEN APP →
            </Button>
          </div>
        </div>
      </header>

      {/* Shared Cart Drawer & Mobile App Launcher Modal */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={cartItems}
        onUpdateQuantity={updateQuantity}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
      />

      <OpenAppModal
        isOpen={isOpenAppModalOpen}
        onClose={() => setIsOpenAppModalOpen(false)}
      />
    </>
  );
}
