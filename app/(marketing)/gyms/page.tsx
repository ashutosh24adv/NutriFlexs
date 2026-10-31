"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  MapPin,
  Navigation,
  Search,
  Check,
  Zap,
  Clock,
  Building2,
  Phone,
  AlertCircle,
  Loader2,
  ArrowRight,
  Sparkles,
  ChevronRight,
  Filter,
  RotateCcw,
} from "lucide-react";
import { useGym, GymInfo, OutletInfo } from "@/components/customer/gym-context";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export default function GymDiscoveryPage() {
  const {
    selectedGym,
    selectedOutlet,
    allGyms,
    nearbyGyms,
    availableCities,
    isLoading: isGlobalLoading,
    isLocating,
    locationError,
    userCoords,
    selectGymAndOutlet,
    detectLocationAndFindNearby,
    resetLocation,
    clearLocationError,
  } = useGym();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<string>("all");
  const [isSortedByDistance, setIsSortedByDistance] = useState(false);
  const [justSelectedOutletId, setJustSelectedOutletId] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<GymInfo[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [selectionError, setSelectionError] = useState<string | null>(null);

  // Debounced server search & city filter query
  useEffect(() => {
    // If no search and no city filter and no distance sort, default to allGyms
    if (!searchQuery.trim() && selectedCity === "all" && !isSortedByDistance) {
      setSearchResults(null);
      setIsSearching(false);
      return;
    }

    const controller = new AbortController();
    setIsSearching(true);

    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set("search", searchQuery.trim());
        if (selectedCity && selectedCity !== "all") params.set("city", selectedCity);
        if (isSortedByDistance && userCoords) {
          params.set("lat", String(userCoords.lat));
          params.set("lng", String(userCoords.lng));
        }

        const res = await fetch(`/api/gyms?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.gyms)) {
          setSearchResults(data.gyms);
        } else {
          setSearchResults([]);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          console.error("Failed to query gyms:", err);
        }
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, selectedCity, isSortedByDistance, userCoords]);

  // Handle location discovery
  const handleUseLocation = async () => {
    clearLocationError();
    const result = await detectLocationAndFindNearby();
    if (result && result.length > 0) {
      setIsSortedByDistance(true);
    }
  };

  // Reset distance sorting
  const handleResetDistanceSort = () => {
    setIsSortedByDistance(false);
    resetLocation();
  };

  // Display pool: searchResults if set, otherwise nearbyGyms if sorted by distance, otherwise allGyms
  const displayedGyms = useMemo(() => {
    if (searchResults !== null) {
      return searchResults;
    }
    if (isSortedByDistance && nearbyGyms.length > 0) {
      return nearbyGyms;
    }
    return allGyms;
  }, [searchResults, isSortedByDistance, nearbyGyms, allGyms]);

  // Handle kiosk selection with server validation
  const handleSelect = async (gymId: string, outletId: string) => {
    setSelectionError(null);
    try {
      await selectGymAndOutlet(gymId, outletId);
      setJustSelectedOutletId(outletId);
      setTimeout(() => {
        setJustSelectedOutletId(null);
      }, 5000);
    } catch (err: any) {
      setSelectionError(err.message || "Unable to select this kiosk. Please choose another location.");
    }
  };

  const isLoading = isGlobalLoading || isSearching;

  return (
    <div className="min-h-screen bg-nutri-bg py-8 sm:py-12 px-4 sm:px-6 lg:px-8 space-y-8 max-w-[1200px] mx-auto">
      {/* 1. BREADCRUMBS & HERO HEADER */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-nutri-secondary">
          <Link href="/" className="hover:text-nutri-green transition-colors">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5 text-nutri-muted" />
          <span className="text-nutri-charcoal font-bold">Partner Gyms &amp; Kiosks</span>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-nutri-border pb-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-nutri-green-light text-nutri-green border border-nutri-green/20">
              <Zap className="w-3.5 h-3.5 fill-nutri-green" />
              <span>50–100M FROM GYM FOOTFALLS • 5 MINUTE PICKUP</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
              Find Your Partner Gym &amp; Express Kiosk
            </h1>
            <p className="text-sm text-nutri-secondary leading-relaxed">
              Order cold-pressed organic juices and freshly prepared warm protein meals for pickup
              right outside your gym. Select your preferred kiosk below to customize your order.
            </p>
          </div>

          {/* Quick Action: Explore Menu link */}
          <Link href="/menu">
            <Button
              size="md"
              className="bg-nutri-green hover:bg-nutri-green-dark text-white font-extrabold text-xs px-5 py-2.5 rounded-full shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              BROWSE MENU <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 2. CURRENT ACTIVE LOCATION BANNER (IF SELECTED) */}
      {selectedGym && selectedOutlet && (
        <Card className="p-4 sm:p-5 bg-white border border-nutri-green/30 rounded-3xl shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 bottom-0 w-2 bg-nutri-green" />
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pl-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-nutri-green bg-nutri-green-light px-2.5 py-0.5 rounded-full border border-nutri-green/20">
                  ✓ Active Pickup Location
                </span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <h2 className="text-lg font-bold font-heading text-nutri-charcoal flex items-center gap-2">
                <MapPin className="w-4 h-4 text-nutri-green shrink-0" />
                <span>{selectedGym.name}</span>
                <span className="text-xs font-normal text-nutri-secondary">
                  ({selectedGym.city}{selectedGym.area ? ` • ${selectedGym.area}` : ""})
                </span>
              </h2>
              <p className="text-xs text-nutri-secondary font-medium">
                Kiosk: <strong className="text-nutri-charcoal">{selectedOutlet.name}</strong> •{" "}
                {selectedOutlet.address}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link href="/menu">
                <Button
                  size="sm"
                  className="bg-nutri-green-soft text-nutri-green hover:bg-nutri-green-light border border-nutri-green/20 font-bold text-xs rounded-xl"
                >
                  Order at This Kiosk →
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      )}

      {/* Selection Error Notice */}
      {selectionError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{selectionError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSelectionError(null)}
            className="text-xs font-bold underline cursor-pointer text-rose-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. DISCOVERY CONTROLS: GEOLOCATION + MANUAL SEARCH */}
      <Card className="p-5 sm:p-6 bg-white border border-nutri-border rounded-3xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Use My Location Trigger Button */}
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleUseLocation}
              disabled={isLocating}
              className={cn(
                "font-extrabold text-xs px-4 py-2.5 rounded-full flex items-center gap-2 cursor-pointer transition-all shadow-xs",
                isSortedByDistance
                  ? "bg-nutri-green text-white hover:bg-nutri-green-dark"
                  : "bg-nutri-green-light text-nutri-green hover:bg-nutri-green-soft border border-nutri-green/20"
              )}
            >
              {isLocating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-nutri-green" />
                  <span>Detecting Location...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-4 h-4 stroke-[2.2]" />
                  <span>Use My Location</span>
                </>
              )}
            </Button>

            {isSortedByDistance && (
              <button
                type="button"
                onClick={handleResetDistanceSort}
                className="text-xs font-bold text-nutri-secondary hover:text-nutri-charcoal underline cursor-pointer flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" /> Reset Distance Sort
              </button>
            )}
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search gym, city, area or kiosk..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-10 pr-8 py-2.5 bg-nutri-bg/60 rounded-full border border-nutri-border focus:outline-none focus:border-nutri-green focus:bg-white text-nutri-charcoal font-medium transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-nutri-secondary hover:text-nutri-charcoal text-xs font-bold cursor-pointer"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* City Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pt-2 border-t border-nutri-border-light pb-1">
          <span className="text-xs font-bold text-nutri-secondary flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" /> City:
          </span>
          {availableCities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => setSelectedCity(city)}
              className={cn(
                "text-xs px-3 py-1 rounded-full font-bold capitalize transition-colors shrink-0 cursor-pointer",
                selectedCity.toLowerCase() === city.toLowerCase()
                  ? "bg-nutri-green text-white shadow-2xs"
                  : "bg-nutri-bg text-nutri-secondary hover:text-nutri-charcoal border border-nutri-border"
              )}
            >
              {city === "all" ? "All Cities" : city}
            </button>
          ))}
        </div>

        {/* Geolocation Status / Error Banner */}
        {locationError && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start justify-between gap-3 animate-fade-in">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold">Location Permission or Detection Notice</p>
                <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                  {locationError}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={clearLocationError}
              className="text-xs font-bold text-amber-700 hover:text-amber-900 underline shrink-0 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Success feedback when distance sorting is enabled */}
        {isSortedByDistance && !locationError && (
          <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              Showing partner gyms sorted by distance calculated from your device coordinates using Haversine formula.
            </span>
          </div>
        )}

        {/* Confirmation banner when user selects a new kiosk */}
        {justSelectedOutletId && (
          <div className="p-3.5 rounded-2xl bg-nutri-green text-white text-xs font-bold flex items-center justify-between gap-2 shadow-sm animate-slide-down">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>
                Active pickup location updated to{" "}
                <strong>{selectedOutlet?.name || "selected kiosk"}</strong>!
              </span>
            </div>
            <Link
              href="/menu"
              className="underline hover:text-white/90 text-xs font-extrabold cursor-pointer"
            >
              Go to Fuel Menu →
            </Link>
          </div>
        )}
      </Card>

      {/* 4. GYMS & KIOSKS LISTING */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold font-heading text-nutri-charcoal">
            {isSortedByDistance
              ? "Nearby Partner Gyms"
              : selectedCity !== "all"
              ? `Partner Gyms in ${selectedCity.charAt(0).toUpperCase() + selectedCity.slice(1)}`
              : "All Partner Gym Locations"}
            <span className="text-xs font-semibold text-nutri-secondary ml-2">
              ({displayedGyms.length} available)
            </span>
          </h2>
          {isSearching && (
            <div className="flex items-center gap-1.5 text-xs text-nutri-secondary font-medium">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-nutri-green" />
              <span>Updating results...</span>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && displayedGyms.length === 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <Card
                key={n}
                className="p-6 bg-white border border-nutri-border rounded-3xl space-y-4 animate-pulse"
              >
                <div className="h-5 bg-nutri-border-light rounded-md w-2/3" />
                <div className="h-4 bg-nutri-border-light rounded-md w-1/2" />
                <div className="h-24 bg-nutri-bg rounded-2xl" />
                <div className="h-10 bg-nutri-border-light rounded-xl" />
              </Card>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isLoading && displayedGyms.length === 0 && (
          <Card className="p-10 text-center bg-white border border-nutri-border rounded-3xl space-y-4 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-nutri-green-light text-nutri-green flex items-center justify-center mx-auto">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold font-heading text-nutri-charcoal">
                No Partner Gyms Found
              </h3>
              <p className="text-xs text-nutri-secondary leading-relaxed">
                We couldn&apos;t find any partner gyms matching &quot;{searchQuery}&quot; in{" "}
                {selectedCity === "all" ? "the database" : selectedCity}. Try clearing your search
                or selecting all cities.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <Button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCity("all");
                  handleResetDistanceSort();
                }}
                className="bg-nutri-green text-white font-bold text-xs px-4 py-2 rounded-full cursor-pointer"
              >
                Show All Gyms
              </Button>
            </div>
          </Card>
        )}

        {/* Gym Cards Grid */}
        {displayedGyms.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedGyms.map((gym) => {
              const isCurrentGym = selectedGym?.id === gym.id;

              return (
                <Card
                  key={gym.id}
                  className={cn(
                    "p-5 sm:p-6 bg-white border rounded-3xl shadow-xs flex flex-col justify-between transition-all duration-150 space-y-4",
                    isCurrentGym
                      ? "border-nutri-green ring-2 ring-nutri-green/20"
                      : "border-nutri-border hover:border-nutri-green/40"
                  )}
                >
                  <div className="space-y-3">
                    {/* Gym Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-nutri-bg text-nutri-secondary border border-nutri-border">
                            {gym.city}{gym.area ? ` • ${gym.area}` : ""}
                          </span>
                          {gym.formattedDistance && (
                            <span className="text-[10px] font-extrabold text-nutri-green bg-nutri-green-light px-2 py-0.5 rounded-full border border-nutri-green/20 flex items-center gap-1">
                              <Navigation className="w-2.5 h-2.5 fill-nutri-green" />
                              {gym.formattedDistance}
                            </span>
                          )}
                        </div>
                        <h3 className="text-lg font-bold font-heading text-nutri-charcoal mt-1 leading-snug">
                          {gym.name}
                        </h3>
                      </div>

                      <div className="w-8 h-8 rounded-xl bg-nutri-green-light text-nutri-green flex items-center justify-center shrink-0">
                        <Building2 className="w-4 h-4" />
                      </div>
                    </div>

                    <p className="text-xs text-nutri-secondary leading-relaxed">
                      {gym.address}
                    </p>

                    {/* Operating Hours */}
                    <div className="flex items-center gap-1.5 text-[11px] text-nutri-secondary font-medium pt-1">
                      <Clock className="w-3.5 h-3.5 text-nutri-green shrink-0" />
                      <span>Hours: {gym.operatingHours || "6:00 AM – 10:00 PM"}</span>
                    </div>

                    {/* Associated Kiosk Outlets */}
                    <div className="space-y-2 pt-2 border-t border-nutri-border-light">
                      <p className="text-[10px] font-extrabold text-nutri-secondary uppercase tracking-wider">
                        NutriFlexs Kiosk Pickup Points:
                      </p>

                      {gym.outlets && gym.outlets.length > 0 ? (
                        gym.outlets.map((outlet) => {
                          const isOutletSelected = selectedOutlet?.id === outlet.id;

                          return (
                            <div
                              key={outlet.id}
                              className={cn(
                                "p-3 rounded-2xl border transition-colors space-y-2",
                                isOutletSelected
                                  ? "bg-nutri-green-soft border-nutri-green/40"
                                  : "bg-nutri-bg/50 border-nutri-border/70 hover:bg-nutri-bg"
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="space-y-0.5 min-w-0">
                                  <p className="font-bold text-xs text-nutri-charcoal truncate">
                                    {outlet.name}
                                  </p>
                                  <p className="text-[11px] text-nutri-secondary leading-tight truncate">
                                    {outlet.address}
                                  </p>
                                </div>

                                {outlet.isAvailable ? (
                                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full shrink-0 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live
                                  </span>
                                ) : (
                                  <span className="text-[9px] font-extrabold text-rose-700 bg-rose-50 border border-rose-200 px-1.5 py-0.5 rounded-full shrink-0">
                                    Closed
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center justify-between text-[10px] text-nutri-secondary">
                                <span className="flex items-center gap-1 font-medium">
                                  <Clock className="w-3 h-3 text-nutri-green" /> 5 Min Walkout Prep
                                </span>
                                {outlet.phone && (
                                  <span className="flex items-center gap-1 font-medium">
                                    <Phone className="w-3 h-3 text-nutri-secondary" /> {outlet.phone}
                                  </span>
                                )}
                              </div>

                              {/* Selection Button */}
                              <div className="pt-1">
                                {isOutletSelected ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="w-full py-2 px-3 rounded-xl bg-nutri-green text-white font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-default shadow-xs"
                                  >
                                    <Check className="w-3.5 h-3.5 stroke-[3]" /> Active Selection
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleSelect(gym.id, outlet.id)}
                                    disabled={!outlet.isAvailable}
                                    className={cn(
                                      "w-full py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-1 transition-colors cursor-pointer",
                                      outlet.isAvailable
                                        ? "bg-white hover:bg-nutri-green hover:text-white text-nutri-charcoal border border-nutri-border hover:border-nutri-green shadow-2xs"
                                        : "bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                                    )}
                                  >
                                    {outlet.isAvailable ? "Select This Kiosk →" : "Temporarily Closed"}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs text-nutri-secondary italic">
                          No express kiosks currently assigned to this gym.
                        </p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. EXPANSION / SUGGESTION FOOTER CTA */}
      <Card className="p-6 sm:p-8 bg-gradient-to-br from-nutri-charcoal to-slate-900 text-white rounded-3xl space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-white/10 text-white border border-white/20">
              EXPANDING PARTNERSHIP NETWORK
            </div>
            <h3 className="text-xl font-extrabold font-heading text-white">
              Don&apos;t see your fitness centre or gym listed?
            </h3>
            <p className="text-xs text-nutri-secondary leading-relaxed">
              We install fresh fuel kiosks 50m outside premium gyms with over 200+ daily footfalls.
              Gym managers and trainers can partner with us for priority kiosk placement.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <Link href="/trainer">
              <Button
                size="md"
                className="bg-white text-nutri-charcoal hover:bg-white/90 font-bold text-xs rounded-full px-5 py-2.5 cursor-pointer"
              >
                Trainer Partner Portal →
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
