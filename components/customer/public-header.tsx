"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Heart,
  Flame,
  BookOpen,
  Info,
  HelpCircle,
  Mail,
  HeartPulse,
} from "lucide-react";
import { useGym } from "@/components/customer/gym-context";
import { useCart } from "@/components/customer/cart-context";
import { CartDrawer } from "@/components/customer/cart-drawer";
import { VegetarianToggle } from "@/components/customer/vegetarian-toggle";
import { CustomerModeSwitcher } from "@/components/customer/customer-mode-switcher";
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

  // About Dropdown State & Handlers
  const isAboutActive =
    pathname.startsWith("/about") ||
    pathname.startsWith("/faq") ||
    pathname.startsWith("/contact");

  const [isAboutDropdownOpen, setIsAboutDropdownOpen] = useState(false);
  const [isMobileAboutExpanded, setIsMobileAboutExpanded] = useState(isAboutActive);
  const aboutDropdownTimer = useRef<NodeJS.Timeout | null>(null);
  const aboutDropdownRef = useRef<HTMLDivElement | null>(null);

  const handleAboutMouseEnter = () => {
    if (aboutDropdownTimer.current) clearTimeout(aboutDropdownTimer.current);
    setIsAboutDropdownOpen(true);
  };

  const handleAboutMouseLeave = () => {
    aboutDropdownTimer.current = setTimeout(() => {
      setIsAboutDropdownOpen(false);
    }, 200);
  };

  // Close About dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (aboutDropdownRef.current && !aboutDropdownRef.current.contains(event.target as Node)) {
        setIsAboutDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close menus on route navigation
  useEffect(() => {
    setIsAboutDropdownOpen(false);
    setIsMobileMenuOpen(false);
    setIsGymsDropdownOpen(false);
  }, [pathname]);

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
      <header className="sticky top-0 z-40 bg-[#F3F7EE]/95 backdrop-blur-md border-b border-[#E5E7E2] w-full transition-colors shadow-2xs">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* 1. LEFT — Brand: NutriFlexs logo and wordmark anchored to the left */}
          <div className="flex items-center shrink-0">
            <NutriFlexsLogo size="md" showTagline={true} href="/" />
          </div>

          {/* 2. CENTER — Navigation: Order Food, NutriFlexs Pass, Nearby Gyms, Blog, and About */}
          <nav className="hidden lg:flex items-center justify-center min-w-0 flex-1 px-2">
            <div className="flex items-center justify-center gap-1.5 xl:gap-2.5 text-xs xl:text-[13px] font-semibold text-nutri-secondary whitespace-nowrap">
              <Link
                href="/menu"
                className={cn(
                  "px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap",
                  pathname.startsWith("/menu")
                    ? "text-[#2F7D16] font-bold bg-[#EAF4E3]"
                    : "text-nutri-secondary hover:text-[#2F7D16] hover:bg-[#EAF4E3]/60"
                )}
              >
                Order Food
              </Link>
              <Link
                href="/dietitians"
                className={cn(
                  "px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap",
                  pathname.startsWith("/dietitians")
                    ? "text-[#2F7D16] font-bold bg-[#EAF4E3]"
                    : "text-nutri-secondary hover:text-[#2F7D16] hover:bg-[#EAF4E3]/60"
                )}
              >
                Health Coaches
              </Link>
              <Link
                href="/pass"
                className={cn(
                  "px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap",
                  pathname.startsWith("/pass")
                    ? "text-[#2F7D16] font-bold bg-[#EAF4E3]"
                    : "text-nutri-secondary hover:text-[#2F7D16] hover:bg-[#EAF4E3]/60"
                )}
              >
                NutriFlexs Pass
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
                    "px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                    pathname.startsWith("/gyms")
                      ? "text-[#2F7D16] font-bold bg-[#EAF4E3]"
                      : "text-nutri-secondary hover:text-[#2F7D16] hover:bg-[#EAF4E3]/60"
                  )}
                >
                  <span>Nearby Gyms</span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform text-nutri-secondary",
                      isGymsDropdownOpen && "rotate-180 text-[#2F7D16]"
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
                                  <span className="text-[9px] font-bold text-nutri-green bg-nutri-green-light px-1.5 py-0.5 rounded-full block border border-nutri-border-light">
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
                href="/blog"
                className={cn(
                  "px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap",
                  pathname.startsWith("/blog")
                    ? "text-[#2F7D16] font-bold bg-[#EAF4E3]"
                    : "text-nutri-secondary hover:text-[#2F7D16] hover:bg-[#EAF4E3]/60"
                )}
              >
                Blog
              </Link>
              {/* About Dropdown with About Us, FAQs, and Contact Us */}
              <div
                ref={aboutDropdownRef}
                className="relative"
                onMouseEnter={handleAboutMouseEnter}
                onMouseLeave={handleAboutMouseLeave}
              >
                <button
                  type="button"
                  onClick={() => setIsAboutDropdownOpen((prev) => !prev)}
                  className={cn(
                    "px-3.5 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap flex items-center gap-1",
                    isAboutActive
                      ? "text-[#2F7D16] font-bold bg-[#EAF4E3]"
                      : "text-nutri-secondary hover:text-[#2F7D16] hover:bg-[#EAF4E3]/60"
                  )}
                  aria-expanded={isAboutDropdownOpen}
                  aria-haspopup="true"
                >
                  <span>About</span>
                  <ChevronDown
                    className={cn(
                      "w-3.5 h-3.5 transition-transform text-nutri-secondary",
                      isAboutDropdownOpen && "rotate-180 text-[#2F7D16]"
                    )}
                  />
                </button>

                {/* Dropdown Menu on Desktop */}
                {isAboutDropdownOpen && (
                  <div
                    className="absolute top-full right-0 mt-2 w-64 bg-white rounded-2xl p-2 shadow-xl border border-nutri-border z-50 animate-slide-up text-xs space-y-1"
                    onMouseEnter={handleAboutMouseEnter}
                    onMouseLeave={handleAboutMouseLeave}
                  >
                    <Link
                      href="/about"
                      onClick={() => setIsAboutDropdownOpen(false)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-3",
                        pathname === "/about"
                          ? "bg-nutri-green-light text-nutri-green font-bold"
                          : "hover:bg-nutri-green-soft text-nutri-charcoal"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-nutri-bg flex items-center justify-center text-nutri-green shrink-0 border border-nutri-border-light">
                        <Info className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs">About Us</p>
                        <p className="text-[10px] text-nutri-secondary truncate">
                          Our mission, purpose &amp; team
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/faq"
                      onClick={() => setIsAboutDropdownOpen(false)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-3",
                        pathname === "/faq"
                          ? "bg-nutri-green-light text-nutri-green font-bold"
                          : "hover:bg-nutri-green-soft text-nutri-charcoal"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-nutri-bg flex items-center justify-center text-nutri-green shrink-0 border border-nutri-border-light">
                        <HelpCircle className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs">FAQs</p>
                        <p className="text-[10px] text-nutri-secondary truncate">
                          Answers to common questions
                        </p>
                      </div>
                    </Link>

                    <Link
                      href="/contact"
                      onClick={() => setIsAboutDropdownOpen(false)}
                      className={cn(
                        "p-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-3",
                        pathname === "/contact"
                          ? "bg-nutri-green-light text-nutri-green font-bold"
                          : "hover:bg-nutri-green-soft text-nutri-charcoal"
                      )}
                    >
                      <div className="w-8 h-8 rounded-lg bg-nutri-bg flex items-center justify-center text-nutri-green shrink-0 border border-nutri-border-light">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-xs">Contact Us</p>
                        <p className="text-[10px] text-nutri-secondary truncate">
                          Support, gym &amp; trainer queries
                        </p>
                      </div>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </nav>

          {/* 3. RIGHT — User actions: Hamburger (< lg), Customer Mode Switcher, Staff Portal, Cart, Sign In/Profile, Get Started */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 lg:gap-3 shrink-0 justify-self-end col-start-3">
            {/* Hamburger button for mobile & intermediate widths when center nav is collapsed */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 min-w-[40px] min-h-[40px] flex items-center justify-center text-[#111111] hover:text-[#2F7D16] hover:bg-[#EAF4E3] rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <MenuIcon className="w-5 h-5 stroke-[2.2]" />
            </button>

            {/* Customer Two-Mode Switcher for Logged-In Customers */}
            {isCustomer && (
              <div className="shrink-0 hidden md:block">
                <CustomerModeSwitcher variant="header" />
              </div>
            )}

            {/* Staff Portal Dropdown (visible to guests, hidden for logged-in customers) */}
            {showStaffPortalButton && (
              <div className="relative shrink-0 hidden sm:block">
                <button
                  id="staff-portal-btn"
                  type="button"
                  aria-expanded={showStaffPortal}
                  aria-haspopup="true"
                  onClick={() => setShowStaffPortal(!showStaffPortal)}
                  className="text-xs bg-[#F3F7EE] hover:bg-[#EAF4E3] text-[#2F7D16] font-bold px-2.5 sm:px-3 py-1.5 rounded-full flex items-center gap-1.5 border border-[#E5E7E2] cursor-pointer transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
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
              className="relative p-2 sm:p-2.5 rounded-full bg-[#EAF4E3] text-[#2F7D16] hover:bg-[#F3F7EE] transition-colors cursor-pointer shrink-0 border border-[#E5E7E2] min-w-[40px] min-h-[40px] flex items-center justify-center"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              {totalItemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-[#2F7D16] text-white font-extrabold text-[10px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                  {totalItemCount}
                </span>
              )}
            </button>

            {/* Auth Section: Profile Avatar with Dropdown (authenticated) OR Sign In / Get Started (guest) */}
            {status === "loading" ? (
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#2F7D16]/20 animate-pulse shrink-0" />
            ) : isAuthenticated ? (
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#2F7D16] text-white flex items-center justify-center font-extrabold text-xs shadow-xs hover:ring-2 hover:ring-[#2F7D16]/40 hover:ring-offset-1 transition-all cursor-pointer focus:outline-none overflow-hidden shrink-0"
                  aria-label="User Account Menu"
                  title={userName}
                >
                  {user?.image || user?.avatar ? (
                    <Image
                      src={user.image || user.avatar}
                      alt={userName}
                      width={36}
                      height={36}
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
                        href="/consultations"
                        onClick={() => setShowProfileMenu(false)}
                        className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-nutri-bg text-nutri-charcoal font-semibold transition-colors"
                      >
                        <HeartPulse className="w-4 h-4 text-nutri-green" /> My Consultations
                      </Link>
                      {userRole === "DIETITIAN" && (
                        <Link
                          href="/dietitian"
                          onClick={() => setShowProfileMenu(false)}
                          className="flex items-center gap-2.5 p-2 rounded-xl bg-emerald-50 text-emerald-800 font-bold hover:bg-emerald-100 transition-colors"
                        >
                          <HeartPulse className="w-4 h-4 text-emerald-600" /> Health Coach Portal
                        </Link>
                      )}
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
              <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                <Link
                  href="/login"
                  className={cn(
                    "hidden sm:inline-flex items-center justify-center h-[38px] px-3.5 sm:px-4 text-xs font-bold rounded-full bg-white text-[#2F7D16] border border-[#2F7D16]/30 hover:bg-[#EAF4E3] hover:border-[#2F7D16]/50 hover:text-[#24630F] transition-all duration-200 shadow-2xs whitespace-nowrap shrink-0 cursor-pointer",
                    pathname === "/login" && "bg-[#EAF4E3] border-[#2F7D16]/50 text-[#24630F]"
                  )}
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center h-[38px] px-3.5 sm:px-4 text-xs font-bold rounded-full bg-[#2F7D16] hover:bg-[#24630F] text-white border border-transparent transition-all duration-200 shadow-xs hover:shadow-sm whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <span>Get Started</span>
                  <span className="ml-1 font-semibold">→</span>
                </Link>
              </div>
            )}
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
              <NutriFlexsLogo size="sm" showTagline={false} href="/" />
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-full text-nutri-secondary hover:bg-nutri-border-light cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Customer Two-Mode Switcher inside Mobile Drawer */}
            {isCustomer && (
              <div className="mb-4 pb-3 border-b border-nutri-border-light">
                <p className="text-[10px] font-bold text-nutri-secondary uppercase tracking-wider mb-2">
                  Active Mode
                </p>
                <CustomerModeSwitcher variant="drawer" />
              </div>
            )}

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

            {/* Main Links: Order Food, Track Nutrition, NutriFlexs Pass, Nearby Gyms, Blog, About Us */}
            <nav className="space-y-1">
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
                <Utensils className="w-4 h-4 text-nutri-green" /> Order Food
              </Link>
              <Link
                href="/dietitians"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors",
                  pathname.startsWith("/dietitians")
                    ? "bg-nutri-green-light text-nutri-green"
                    : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                )}
              >
                <HeartPulse className="w-4 h-4 text-nutri-green" /> Health Coaches
              </Link>
              {isAuthenticated && (
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
                  <Flame className="w-4 h-4 text-nutri-green" /> Track Nutrition
                </Link>
              )}
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
                href="/blog"
                onClick={() => setIsMobileMenuOpen(false)}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl text-sm font-bold transition-colors",
                  pathname.startsWith("/blog")
                    ? "bg-nutri-green-light text-nutri-green"
                    : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                )}
              >
                <BookOpen className="w-4 h-4 text-nutri-green" /> Blog
              </Link>
              {/* Mobile About Accordion */}
              <div className="rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsMobileAboutExpanded((prev) => !prev)}
                  className={cn(
                    "w-full flex items-center justify-between p-2.5 rounded-xl text-sm font-bold transition-colors",
                    isAboutActive
                      ? "bg-nutri-green-light text-nutri-green"
                      : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                  )}
                  aria-expanded={isMobileAboutExpanded}
                >
                  <span className="flex items-center gap-3">
                    <Info className="w-4 h-4 text-nutri-green" /> About
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 text-nutri-secondary transition-transform duration-200",
                      isMobileAboutExpanded && "rotate-180 text-nutri-green"
                    )}
                  />
                </button>

                {isMobileAboutExpanded && (
                  <div className="ml-4 pl-3 mt-1 space-y-1 border-l-2 border-nutri-border-light">
                    <Link
                      href="/about"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
                        pathname === "/about"
                          ? "bg-nutri-green-light text-nutri-green font-bold"
                          : "text-nutri-secondary hover:text-nutri-green hover:bg-nutri-green-soft"
                      )}
                    >
                      <Info className="w-3.5 h-3.5 text-nutri-green shrink-0" />
                      <div>
                        <div className="leading-tight font-bold text-nutri-charcoal">About Us</div>
                        <div className="text-[10px] text-nutri-secondary font-normal">Our mission &amp; team</div>
                      </div>
                    </Link>
                    <Link
                      href="/faq"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
                        pathname === "/faq"
                          ? "bg-nutri-green-light text-nutri-green font-bold"
                          : "text-nutri-secondary hover:text-nutri-green hover:bg-nutri-green-soft"
                      )}
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-nutri-green shrink-0" />
                      <div>
                        <div className="leading-tight font-bold text-nutri-charcoal">FAQs</div>
                        <div className="text-[10px] text-nutri-secondary font-normal">Questions &amp; answers</div>
                      </div>
                    </Link>
                    <Link
                      href="/contact"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors",
                        pathname === "/contact"
                          ? "bg-nutri-green-light text-nutri-green font-bold"
                          : "text-nutri-secondary hover:text-nutri-green hover:bg-nutri-green-soft"
                      )}
                    >
                      <Mail className="w-3.5 h-3.5 text-nutri-green shrink-0" />
                      <div>
                        <div className="leading-tight font-bold text-nutri-charcoal">Contact Us</div>
                        <div className="text-[10px] text-nutri-secondary font-normal">Get in touch with us</div>
                      </div>
                    </Link>
                  </div>
                )}
              </div>

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
          <div className="pt-4 border-t border-nutri-border space-y-2">
            {isAuthenticated ? (
              <button
                type="button"
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  signOut({ callbackUrl: "/" });
                }}
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl hover:bg-rose-50 text-rose-600 font-bold text-xs transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" /> Sign Out ({userName})
              </button>
            ) : (
              <div className="space-y-2.5">
                <Link
                  href="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full flex items-center justify-center h-[42px] px-4 rounded-full bg-[#2F7D16] hover:bg-[#24630F] text-white font-bold text-xs shadow-xs transition-all duration-200 cursor-pointer"
                >
                  <span>Get Started</span>
                  <span className="ml-1 font-semibold">→</span>
                </Link>
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "w-full flex items-center justify-center h-[42px] px-4 rounded-full bg-white hover:bg-[#EAF4E3] text-[#2F7D16] hover:text-[#24630F] border border-[#2F7D16]/30 hover:border-[#2F7D16]/50 font-bold text-xs shadow-2xs transition-all duration-200 cursor-pointer",
                    pathname === "/login" && "bg-[#EAF4E3] border-[#2F7D16]/50 text-[#24630F]"
                  )}
                >
                  Sign In
                </Link>
              </div>
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
