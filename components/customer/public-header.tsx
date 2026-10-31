"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { NutriFlexsLogo } from "@/components/ui/logo";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import {
  Lock,
  ShoppingBag,
  LogOut,
  User,
  Menu as MenuIcon,
  X,
  MapPin,
  Clock,
  Utensils,
  ArrowUpRight,
  Apple,
  ChevronDown,
  Loader2,
} from "lucide-react";
import { useGym } from "@/components/customer/gym-context";
import { useCart } from "@/components/customer/cart-context";
import { CartDrawer } from "@/components/customer/cart-drawer";
import { VegetarianToggle } from "@/components/customer/vegetarian-toggle";
import { openNutriFlexsApp } from "@/lib/mobile-app";
import { OpenAppModal } from "@/components/customer/app-modal";
import { GymSelector } from "@/components/customer/gym-selector";
import {
  StaffPortalDropdown,
  STAFF_PORTALS,
} from "@/components/customer/staff-portal-dropdown";
import { cn } from "@/lib/utils";

export function PublicHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const user = session?.user as any;
  const userRole = (user?.role as string) || (isAuthenticated ? "CUSTOMER" : "GUEST");
  const isCustomer = isAuthenticated && userRole === "CUSTOMER";
  // Staff Portal visibility rule:
  // Visible to guests (!isAuthenticated) and staff operators, but strictly hidden for logged-in customers.
  const showStaffPortalButton = !isCustomer;
  const userName = user?.name || "Customer";

  const [showStaffPortal, setShowStaffPortal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const { allGyms, selectedGym, selectGymAndOutlet, isLoading: isGymsLoading } = useGym();
  const [isGymsDropdownOpen, setIsGymsDropdownOpen] = useState(false);
  const gymsDropdownTimer = useRef<NodeJS.Timeout | null>(null);

  const handleGymMouseEnter = () => {
    if (gymsDropdownTimer.current) clearTimeout(gymsDropdownTimer.current);
    setIsGymsDropdownOpen(true);
  };

  const handleGymMouseLeave = () => {
    gymsDropdownTimer.current = setTimeout(() => {
      setIsGymsDropdownOpen(false);
    }, 200);
  };

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
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-nutri-border w-full">
        <div className="w-full max-w-none px-4 sm:px-6 lg:px-7 h-16 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 sm:gap-4">
          {/* 1. LEFT — Brand: NutriFlexs logo and wordmark anchored to the extreme left */}
          <div className="flex items-center shrink-0 justify-self-start">
            <NutriFlexsLogo size="md" showTagline={false} href={isAuthenticated ? "/home" : "/"} />
          </div>

          {/* 2. CENTER — Navigation: Find Your Fuel, Why NutriFlexs, How It Works, Nearby Gyms, Menu, and NutriFlexs Pass */}
          <nav className="hidden lg:flex items-center justify-center min-w-0 px-2 xl:px-4">
            <div className="flex items-center justify-center gap-3 min-[1140px]:gap-4 xl:gap-6 text-xs min-[1140px]:text-[13px] xl:text-sm font-semibold text-nutri-secondary whitespace-nowrap">
              <Link
                href="/#find-fuel"
                onClick={(e) => handleNavClick(e, "find-fuel")}
                className="hover:text-nutri-green transition-colors cursor-pointer py-1 border-b-2 border-transparent whitespace-nowrap"
              >
                Find Your Fuel
              </Link>
              <Link
                href="/#why-nutriflexs"
                onClick={(e) => handleNavClick(e, "why-nutriflexs")}
                className="hover:text-nutri-green transition-colors cursor-pointer py-1 border-b-2 border-transparent whitespace-nowrap"
              >
                Why NutriFlexs
              </Link>
              <Link
                href="/#how-it-works"
                onClick={(e) => handleNavClick(e, "how-it-works")}
                className="hover:text-nutri-green transition-colors cursor-pointer py-1 border-b-2 border-transparent whitespace-nowrap"
              >
                How It Works
              </Link>
              {/* Nearby Gyms with Interactive Database-Driven Dropdown */}
              <div
                className="relative"
                onMouseEnter={handleGymMouseEnter}
                onMouseLeave={handleGymMouseLeave}
              >
                <Link
                  href="/gyms"
                  onClick={() => setIsGymsDropdownOpen(false)}
                  className={cn(
                    "hover:text-nutri-green transition-colors cursor-pointer py-1 border-b-2 whitespace-nowrap flex items-center gap-1",
                    pathname.startsWith("/gyms")
                      ? "text-nutri-green font-bold border-nutri-green"
                      : "border-transparent"
                  )}
                >
                  <span>Nearby Gyms</span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform text-nutri-secondary",
                      isGymsDropdownOpen && "rotate-180 text-nutri-green"
                    )}
                  />
                </Link>

                {/* Dropdown Menu on Desktop */}
                {isGymsDropdownOpen && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white rounded-2xl p-2.5 shadow-xl border border-nutri-border z-50 animate-slide-up text-xs space-y-1.5"
                    onMouseEnter={handleGymMouseEnter}
                    onMouseLeave={handleGymMouseLeave}
                  >
                    <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-nutri-border-light">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-nutri-secondary">
                        Partner Gyms &amp; Kiosks
                      </span>
                      <span className="text-[10px] font-bold text-nutri-green">
                        {allGyms.length} Locations
                      </span>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1 divide-y divide-nutri-border-light">
                      {isGymsLoading && allGyms.length === 0 ? (
                        <div className="py-6 flex items-center justify-center text-nutri-secondary gap-2">
                          <Loader2 className="w-4 h-4 animate-spin text-nutri-green" />
                          <span>Loading partner gyms...</span>
                        </div>
                      ) : allGyms.length === 0 ? (
                        <div className="py-4 text-center text-nutri-secondary text-xs">
                          No active gyms found.
                        </div>
                      ) : (
                        allGyms.map((gym) => {
                          const isSelected = selectedGym?.id === gym.id;
                          const primaryOutlet = gym.outlets?.[0];

                          return (
                            <div
                              key={gym.id}
                              onClick={async () => {
                                if (primaryOutlet) {
                                  await selectGymAndOutlet(gym.id, primaryOutlet.id);
                                }
                                setIsGymsDropdownOpen(false);
                              }}
                              className={cn(
                                "p-2 rounded-xl transition-colors cursor-pointer flex items-start justify-between gap-2 pt-2",
                                isSelected ? "bg-nutri-green-light" : "hover:bg-nutri-bg"
                              )}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-nutri-charcoal truncate">
                                    {gym.name}
                                  </span>
                                  {isSelected && (
                                    <span className="text-[9px] font-extrabold bg-nutri-green text-white px-1.5 py-0.2 rounded-full shrink-0">
                                      Active
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-nutri-secondary truncate">
                                  {gym.city}{gym.area ? ` • ${gym.area}` : ""}
                                </p>
                                {primaryOutlet && (
                                  <p className="text-[10px] text-nutri-green font-medium truncate mt-0.5">
                                    Kiosk: {primaryOutlet.name}
                                  </p>
                                )}
                              </div>

                              <div className="text-right shrink-0">
                                {gym.formattedDistance ? (
                                  <span className="text-[10px] font-bold text-nutri-green block">
                                    {gym.formattedDistance}
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full block">
                                    Live
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <div className="pt-1.5 border-t border-nutri-border-light">
                      <Link
                        href="/gyms"
                        onClick={() => setIsGymsDropdownOpen(false)}
                        className="block w-full py-1.5 text-center text-xs font-bold text-nutri-green hover:underline cursor-pointer"
                      >
                        View All Partner Gyms →
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <Link
                href="/menu"
                className={cn(
                  "hover:text-nutri-green transition-colors cursor-pointer py-1 border-b-2 whitespace-nowrap",
                  pathname.startsWith("/menu")
                    ? "text-nutri-green font-bold border-nutri-green"
                    : "border-transparent"
                )}
              >
                Menu
              </Link>
              <Link
                href="/pass"
                className={cn(
                  "hover:text-nutri-green transition-colors cursor-pointer py-1 border-b-2 whitespace-nowrap",
                  pathname.startsWith("/pass")
                    ? "text-nutri-green font-bold border-nutri-green"
                    : "border-transparent"
                )}
              >
                NutriFlexs Pass
              </Link>
            </div>
          </nav>

          {/* 3. RIGHT — User actions: Hamburger (< lg), Staff Portal, Cart, Sign In/Profile, OPEN APP */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0 justify-self-end col-start-3">
            {/* Hamburger button for mobile & intermediate widths when center nav is collapsed */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-1.5 sm:p-2 text-nutri-charcoal hover:text-nutri-green hover:bg-nutri-green-light rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <MenuIcon className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Staff Portal Dropdown (visible to guests, hidden for logged-in customers) */}
            {showStaffPortalButton && (
              <div className="relative shrink-0 hidden sm:block">
                <button
                  id="staff-portal-btn"
                  type="button"
                  aria-expanded={showStaffPortal}
                  aria-haspopup="true"
                  onClick={() => setShowStaffPortal(!showStaffPortal)}
                  className="text-xs bg-nutri-green-soft hover:bg-nutri-green-light text-nutri-green font-bold px-2 sm:px-2.5 lg:px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-nutri-border cursor-pointer transition-colors whitespace-nowrap shrink-0"
                  title="Staff & Operator Portals"
                >
                  <Lock className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span className="hidden min-[1140px]:inline whitespace-nowrap">Staff Portal</span>
                </button>

                <StaffPortalDropdown
                  isOpen={showStaffPortal}
                  onClose={() => setShowStaffPortal(false)}
                  align="right"
                />
              </div>
            )}

            {/* Vegetarian Toggle (authenticated customer only, beside cart icon) */}
            {isAuthenticated && (
              <div className="shrink-0 hidden md:block">
                <VegetarianToggle variant="header" />
              </div>
            )}

            {/* Cart Icon Button with live badge */}
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="relative p-1.5 sm:p-2 rounded-full bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft transition-colors cursor-pointer shrink-0"
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
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-nutri-green/20 animate-pulse shrink-0" />
            ) : isAuthenticated ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-nutri-green text-white flex items-center justify-center font-extrabold text-xs shadow-xs hover:ring-2 hover:ring-nutri-green/40 hover:ring-offset-1 transition-all cursor-pointer focus:outline-none overflow-hidden shrink-0"
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
                        href="/nutrition"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-nutri-bg text-nutri-charcoal font-semibold transition-colors"
                      >
                        <Apple className="w-4 h-4 text-nutri-green" /> My Nutrition
                      </Link>
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
                className={`hidden sm:inline-block text-xs font-bold text-nutri-charcoal hover:text-nutri-green px-2 py-1 transition-colors whitespace-nowrap shrink-0 ${
                  pathname === "/login" ? "text-nutri-green" : ""
                }`}
              >
                Sign In
              </Link>
            )}

            {/* OPEN APP button: Must be the last element and aligned to the extreme RIGHT */}
            <Button
              size="sm"
              onClick={handleOpenAppClick}
              className="bg-nutri-green text-white hover:bg-nutri-green-dark font-extrabold text-xs px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-full cursor-pointer shadow-xs whitespace-nowrap shrink-0"
            >
              OPEN APP →
            </Button>
          </div>
        </div>
      </header>

      {/* Slide-out Mobile Navigation Drawer */}
      <div className={cn("fixed inset-0 z-50 lg:hidden", isMobileMenuOpen ? "flex" : "hidden")}>
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        />

        {/* Drawer Panel */}
        <div className="relative w-4/5 max-w-xs bg-white h-full shadow-2xl p-6 flex flex-col justify-between z-10 animate-slide-left overflow-y-auto">
          <div>
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-nutri-border mb-4">
              <NutriFlexsLogo size="sm" showTagline={false} href={isAuthenticated ? "/home" : "/"} />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-full text-nutri-secondary hover:bg-nutri-border-light cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Compact Gym Selector inside Mobile Drawer */}
            <div className="mb-4 pb-3 border-b border-nutri-border-light">
              <p className="text-[10px] font-bold text-nutri-secondary uppercase tracking-wider mb-2">
                Pickup Gym Kiosk
              </p>
              <GymSelector className="w-full max-w-none" />
            </div>

            {/* Vegetarian Toggle in Drawer (authenticated) */}
            {isAuthenticated && (
              <div className="mb-4 pb-3 border-b border-nutri-border-light">
                <VegetarianToggle variant="drawer" />
              </div>
            )}

            {/* Main Links */}
            <nav className="space-y-1">
              <Link
                href="/#find-fuel"
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  handleNavClick(e, "find-fuel");
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green transition-colors"
              >
                <Utensils className="w-4 h-4 text-nutri-green" /> Find Your Fuel
              </Link>
              <Link
                href="/#why-nutriflexs"
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  handleNavClick(e, "why-nutriflexs");
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green transition-colors"
              >
                <Utensils className="w-4 h-4 text-nutri-green" /> Why NutriFlexs
              </Link>
              <Link
                href="/#how-it-works"
                onClick={(e) => {
                  setIsMobileMenuOpen(false);
                  handleNavClick(e, "how-it-works");
                }}
                className="flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green transition-colors"
              >
                <Utensils className="w-4 h-4 text-nutri-green" /> How It Works
              </Link>
              <Link
                href="/gyms"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors",
                  pathname.startsWith("/gyms")
                    ? "bg-nutri-green-light text-nutri-green"
                    : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                )}
              >
                <MapPin className="w-4 h-4 text-nutri-green" /> Nearby Gyms
              </Link>
              <Link
                href="/menu"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors",
                  pathname.startsWith("/menu")
                    ? "bg-nutri-green-light text-nutri-green"
                    : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                )}
              >
                <Utensils className="w-4 h-4 text-nutri-green" /> Menu
              </Link>
              <Link
                href="/pass"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors",
                  pathname.startsWith("/pass")
                    ? "bg-nutri-green-light text-nutri-green"
                    : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                )}
              >
                <Clock className="w-4 h-4 text-nutri-green" /> NutriFlexs Pass
              </Link>

              {/* Customer Account Links (if authenticated) */}
              {isAuthenticated && (
                <div className="pt-2 mt-2 border-t border-nutri-border-light">
                  <p className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-nutri-secondary">
                    Account
                  </p>
                  <Link
                    href="/nutrition"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors",
                      pathname.startsWith("/nutrition")
                        ? "bg-nutri-green-light text-nutri-green"
                        : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                    )}
                  >
                    <Apple className="w-4 h-4 text-nutri-green" /> My Nutrition
                  </Link>
                  <Link
                    href="/orders"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors",
                      pathname.startsWith("/orders")
                        ? "bg-nutri-green-light text-nutri-green"
                        : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                    )}
                  >
                    <ShoppingBag className="w-4 h-4 text-nutri-green" /> Orders
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors",
                      pathname.startsWith("/profile")
                        ? "bg-nutri-green-light text-nutri-green"
                        : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                    )}
                  >
                    <User className="w-4 h-4 text-nutri-green" /> Profile ({userName})
                  </Link>
                </div>
              )}
            </nav>

            {/* Staff Portals Section for Guests */}
            {showStaffPortalButton && (
              <div className="pt-4 border-t border-nutri-border space-y-2 mt-3">
                <div className="flex items-center justify-between px-1">
                  <p className="text-[10px] font-extrabold text-nutri-secondary uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-nutri-green" /> Staff Portals
                  </p>
                </div>
                <div className="space-y-1.5">
                  {STAFF_PORTALS.map((portal) => (
                    <div
                      key={portal.id}
                      className={cn(
                        "p-2 rounded-xl border flex items-center justify-between text-xs",
                        portal.bgTint,
                        portal.borderColor
                      )}
                    >
                      <span className={cn("font-bold truncate text-[11px]", portal.textColor)}>
                        {portal.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <Link
                          href={portal.loginHref}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "px-2 py-0.5 rounded-md font-bold text-[10px]",
                            portal.loginBtnClass
                          )}
                        >
                          Login
                        </Link>
                        <Link
                          href={portal.signupHref}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className={cn(
                            "px-2 py-0.5 rounded-md font-bold text-[10px] flex items-center gap-0.5",
                            portal.signupBtnClass
                          )}
                        >
                          Sign Up <ArrowUpRight className="w-2.5 h-2.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Actions */}
          <div className="pt-4 border-t border-nutri-border">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="w-full flex items-center gap-2 p-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out ({userName})
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-full flex items-center justify-center p-2.5 rounded-xl bg-nutri-green text-white font-bold text-xs shadow-xs"
              >
                Sign In / Create Account
              </Link>
            )}
          </div>
        </div>
      </div>

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
