"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  ChevronDown,
  Check,
  Zap,
  Navigation,
  Search,
  AlertCircle,
  Loader2,
  X,
  Building2,
  RefreshCw,
} from "lucide-react";
import { useGym, GymInfo, OutletInfo } from "@/components/customer/gym-context";

interface GymSelectorProps {
  currentOutletName?: string;
  onSelectOutlet?: (outletId: string, outletName: string) => void;
  showModalDirectly?: boolean;
}

type ModalView = "initial" | "loading" | "nearby" | "manual" | "error";

export function GymSelector({
  currentOutletName,
  onSelectOutlet,
  showModalDirectly = false,
}: GymSelectorProps) {
  const {
    selectedGym,
    selectedOutlet,
    allGyms,
    nearbyGyms,
    isLocating,
    locationError,
    isModalOpen,
    setIsModalOpen,
    openGymModal,
    closeGymModal,
    selectGymAndOutlet,
    detectLocationAndFindNearby,
    fetchAllGyms,
    clearLocationError,
  } = useGym();

  const [modalView, setModalView] = useState<ModalView>("initial");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredGyms, setFilteredGyms] = useState<GymInfo[]>([]);

  // Keep local search results updated
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredGyms(allGyms);
    } else {
      const q = searchQuery.toLowerCase();
      const filtered = allGyms.filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.city.toLowerCase().includes(q) ||
          g.address.toLowerCase().includes(q) ||
          g.outlets?.some((o) => o.name.toLowerCase().includes(q))
      );
      setFilteredGyms(filtered);
    }
  }, [searchQuery, allGyms]);

  // Sync modal view when location state changes
  useEffect(() => {
    if (isLocating) {
      setModalView("loading");
    } else if (locationError) {
      setModalView("error");
    } else if (nearbyGyms.length > 0 && isModalOpen && modalView !== "manual") {
      setModalView("nearby");
    }
  }, [isLocating, locationError, nearbyGyms, isModalOpen]);

  // Handle opening modal
  const handleOpen = () => {
    clearLocationError();
    if (nearbyGyms.length > 0) {
      setModalView("nearby");
    } else {
      setModalView("initial");
    }
    openGymModal();
  };

  const handleStartDetect = async () => {
    setModalView("loading");
    const results = await detectLocationAndFindNearby();
    if (results && results.length > 0) {
      setModalView("nearby");
    }
  };

  const handleSelectGymOutlet = async (gym: GymInfo, outlet: OutletInfo) => {
    await selectGymAndOutlet(gym.id, outlet.id);
    if (onSelectOutlet) {
      onSelectOutlet(outlet.id, outlet.name);
    }
    closeGymModal();
  };

  const displayName =
    selectedOutlet?.name ||
    currentOutletName ||
    (allGyms.length > 0 && allGyms[0].outlets?.[0]?.name) ||
    "Select Express Kiosk";

  return (
    <div className="relative">
      {/* Trigger Button Pill */}
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 bg-nutri-green-light hover:bg-nutri-green-soft px-3.5 py-1.5 rounded-full border border-nutri-border text-xs text-nutri-green font-bold transition-all duration-200 cursor-pointer shadow-2xs hover:shadow-xs group"
        title="Change pickup gym kiosk location"
      >
        <Zap className="w-3.5 h-3.5 fill-nutri-green text-nutri-green shrink-0 group-hover:scale-110 transition-transform" />
        <span className="truncate max-w-[150px] sm:max-w-[220px]">
          {displayName}
        </span>
        <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0 group-hover:translate-y-0.5 transition-transform" />
      </button>

      {/* Interactive Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-fade-in">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={closeGymModal}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-lg bg-white rounded-3xl p-5 sm:p-6 shadow-2xl border border-nutri-border z-10 max-h-[90vh] flex flex-col overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-nutri-border-light">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-nutri-green-light flex items-center justify-center text-nutri-green">
                  <MapPin className="w-4 h-4 text-nutri-green" />
                </div>
                <div>
                  <h3 className="font-extrabold text-nutri-charcoal text-base font-heading">
                    Find Your Gym
                  </h3>
                  <p className="text-[11px] text-nutri-secondary">
                    Select your 5-minute pickup express kiosk
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeGymModal}
                className="p-1.5 rounded-full text-nutri-secondary hover:text-nutri-charcoal hover:bg-nutri-border-light transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Selected Kiosk Badge */}
            {selectedOutlet && (
              <div className="mt-3.5 p-3 rounded-2xl bg-nutri-green-soft/60 border border-nutri-border flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <div className="p-1.5 rounded-xl bg-white shadow-2xs text-nutri-green shrink-0">
                    <Zap className="w-3.5 h-3.5 fill-nutri-green" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase font-extrabold tracking-wider text-nutri-green">
                      Current Pickup Kiosk
                    </p>
                    <p className="text-xs font-bold text-nutri-charcoal truncate">
                      {selectedOutlet.name}
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-nutri-green text-white shrink-0">
                  Active
                </span>
              </div>
            )}

            {/* Content Body based on modalView */}
            <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-4">
              {/* VIEW: INITIAL */}
              {modalView === "initial" && (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-nutri-green-light/80 to-emerald-50/50 border border-nutri-green/20 text-center space-y-3">
                    <div className="w-12 h-12 mx-auto rounded-2xl bg-white shadow-xs flex items-center justify-center text-nutri-green">
                      <Navigation className="w-6 h-6 text-nutri-green fill-nutri-green/20" />
                    </div>
                    <div>
                      <h4 className="font-bold text-nutri-charcoal text-sm">
                        Find Kiosks Near You
                      </h4>
                      <p className="text-xs text-nutri-secondary mt-1 max-w-xs mx-auto">
                        Allow GPS location to find the nearest NutriFlexs express kiosks with live distance.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleStartDetect}
                      className="w-full py-2.5 px-4 bg-nutri-green hover:bg-nutri-green-dark text-white text-xs font-bold rounded-full shadow-md shadow-nutri-green/20 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer hover:scale-[1.01]"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Detect Nearby Gyms
                    </button>
                  </div>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-nutri-border-light"></div>
                    <span className="shrink mx-3 text-[11px] font-semibold text-nutri-secondary">
                      OR SELECT MANUALLY
                    </span>
                    <div className="flex-grow border-t border-nutri-border-light"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalView("manual")}
                    className="w-full py-2.5 px-4 bg-white hover:bg-nutri-green-light/40 border border-nutri-border text-nutri-charcoal text-xs font-bold rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Search className="w-3.5 h-3.5 text-nutri-secondary" />
                    Browse All Partner Gyms ({allGyms.length})
                  </button>
                </div>
              )}

              {/* VIEW: LOADING */}
              {modalView === "loading" && (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full bg-nutri-green-light flex items-center justify-center text-nutri-green animate-pulse">
                      <Navigation className="w-6 h-6 animate-bounce" />
                    </div>
                    <Loader2 className="w-14 h-14 text-nutri-green animate-spin absolute inset-0 opacity-40" />
                  </div>
                  <div>
                    <h4 className="font-bold text-nutri-charcoal text-sm">
                      Finding gyms near you...
                    </h4>
                    <p className="text-xs text-nutri-secondary mt-1">
                      Calculating accurate distances to NutriFlexs kiosks
                    </p>
                  </div>
                </div>
              )}

              {/* VIEW: ERROR */}
              {modalView === "error" && (
                <div className="space-y-4 py-2">
                  <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-950 space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                      <h4 className="font-bold text-xs">Location Request Failed</h4>
                    </div>
                    <p className="text-xs text-red-800 leading-relaxed">
                      {locationError || "Could not retrieve your location."}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleStartDetect}
                      className="flex-1 py-2.5 px-3 bg-nutri-green-light hover:bg-nutri-green-soft text-nutri-green text-xs font-bold rounded-full border border-nutri-border flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalView("manual")}
                      className="flex-1 py-2.5 px-3 bg-nutri-green hover:bg-nutri-green-dark text-white text-xs font-bold rounded-full shadow-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      Choose Manually
                    </button>
                  </div>
                </div>
              )}

              {/* VIEW: NEARBY RESULTS */}
              {modalView === "nearby" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-nutri-charcoal">
                      <Navigation className="w-3.5 h-3.5 text-nutri-green fill-nutri-green/20" />
                      <span>Nearest Gyms ({nearbyGyms.length})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setModalView("manual")}
                      className="text-xs text-nutri-green font-semibold hover:underline cursor-pointer"
                    >
                      View All Gyms
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {nearbyGyms.map((gym) => {
                      const isGymSelected = selectedGym?.id === gym.id;

                      return (
                        <div
                          key={gym.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isGymSelected
                              ? "bg-nutri-green-soft/40 border-nutri-green/50 shadow-xs"
                              : "bg-white border-nutri-border hover:border-nutri-green/40 hover:bg-nutri-green-soft/20"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="font-bold text-xs text-nutri-charcoal font-heading">
                                  {gym.name}
                                </h5>
                                {gym.formattedDistance && (
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                                    📍 {gym.formattedDistance}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-nutri-secondary mt-0.5">
                                {gym.address} · {gym.city}
                              </p>
                            </div>
                          </div>

                          {/* Outlets in this gym */}
                          {gym.outlets && gym.outlets.length > 0 && (
                            <div className="mt-3 space-y-1.5 pt-2 border-t border-nutri-border-light">
                              {gym.outlets.map((outlet) => {
                                const isOutletSelected = selectedOutlet?.id === outlet.id;

                                return (
                                  <button
                                    key={outlet.id}
                                    type="button"
                                    onClick={() => handleSelectGymOutlet(gym, outlet)}
                                    className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                      isOutletSelected
                                        ? "bg-nutri-green text-white font-bold shadow-xs"
                                        : "bg-nutri-bg hover:bg-nutri-green-light/60 text-nutri-charcoal"
                                    }`}
                                  >
                                    <div className="flex items-center gap-2 truncate">
                                      <Zap
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          isOutletSelected ? "fill-white text-white" : "text-nutri-green fill-nutri-green"
                                        }`}
                                      />
                                      <span className="truncate">{outlet.name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                      {outlet.formattedDistance && !isOutletSelected && (
                                        <span className="text-[10px] text-nutri-secondary font-medium">
                                          {outlet.formattedDistance}
                                        </span>
                                      )}
                                      {isOutletSelected ? (
                                        <Check className="w-4 h-4 text-white stroke-[3]" />
                                      ) : (
                                        <span className="text-[10px] font-bold text-nutri-green bg-white px-2 py-0.5 rounded-full border border-nutri-border">
                                          Select
                                        </span>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW: MANUAL SEARCH */}
              {modalView === "manual" && (
                <div className="space-y-3">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-nutri-secondary absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search gym, city, or kiosk..."
                      className="w-full bg-nutri-bg pl-9 pr-8 py-2 rounded-xl border border-nutri-border text-xs text-nutri-charcoal placeholder:text-nutri-secondary focus:outline-none focus:border-nutri-green"
                      autoFocus
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-nutri-secondary hover:text-nutri-charcoal"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[11px] text-nutri-secondary">
                      Showing {filteredGyms.length} partner gyms
                    </span>
                    <button
                      type="button"
                      onClick={handleStartDetect}
                      className="text-xs font-bold text-nutri-green flex items-center gap-1 hover:underline cursor-pointer"
                    >
                      <Navigation className="w-3 h-3" /> Detect Location
                    </button>
                  </div>

                  {/* List of Gyms */}
                  <div className="space-y-2.5 max-h-72 overflow-y-auto">
                    {filteredGyms.length === 0 ? (
                      <div className="py-8 text-center text-xs text-nutri-secondary">
                        No gyms found matching &quot;{searchQuery}&quot;.
                      </div>
                    ) : (
                      filteredGyms.map((gym) => {
                        const isGymSelected = selectedGym?.id === gym.id;

                        return (
                          <div
                            key={gym.id}
                            className={`p-3 rounded-2xl border transition-all ${
                              isGymSelected
                                ? "bg-nutri-green-soft/40 border-nutri-green/50"
                                : "bg-white border-nutri-border hover:border-nutri-green/40 hover:bg-nutri-green-soft/10"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-xs text-nutri-charcoal font-heading flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-nutri-green shrink-0" />
                                  {gym.name}
                                </h5>
                                <p className="text-[11px] text-nutri-secondary mt-0.5">
                                  {gym.address} · {gym.city}
                                </p>
                              </div>
                            </div>

                            {/* Outlets */}
                            {gym.outlets && gym.outlets.length > 0 && (
                              <div className="mt-2.5 space-y-1 pt-2 border-t border-nutri-border-light">
                                {gym.outlets.map((outlet) => {
                                  const isOutletSelected = selectedOutlet?.id === outlet.id;

                                  return (
                                    <button
                                      key={outlet.id}
                                      type="button"
                                      onClick={() => handleSelectGymOutlet(gym, outlet)}
                                      className={`w-full text-left p-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                        isOutletSelected
                                          ? "bg-nutri-green text-white font-bold shadow-xs"
                                          : "bg-nutri-bg hover:bg-nutri-green-light/60 text-nutri-charcoal"
                                      }`}
                                    >
                                      <div className="flex items-center gap-2 truncate">
                                        <Zap
                                          className={`w-3.5 h-3.5 shrink-0 ${
                                            isOutletSelected
                                              ? "fill-white text-white"
                                              : "text-nutri-green fill-nutri-green"
                                          }`}
                                        />
                                        <span className="truncate">{outlet.name}</span>
                                      </div>
                                      {isOutletSelected ? (
                                        <Check className="w-4 h-4 text-white stroke-[3] shrink-0" />
                                      ) : (
                                        <span className="text-[10px] font-bold text-nutri-green bg-white px-2 py-0.5 rounded-full border border-nutri-border shrink-0">
                                          Select
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 mt-3 border-t border-nutri-border-light flex items-center justify-between text-[11px] text-nutri-secondary">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-nutri-green" /> 5-min pickup ready
              </span>
              <button
                type="button"
                onClick={closeGymModal}
                className="font-bold text-nutri-charcoal hover:text-nutri-green cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
