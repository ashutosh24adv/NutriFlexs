"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export interface OutletInfo {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  operatingHours?: string | null;
  isAvailable: boolean;
  isActive?: boolean;
  distanceKm?: number;
  formattedDistance?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface GymInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  area?: string | null;
  phone?: string | null;
  imageUrl?: string | null;
  operatingHours?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
  outlets?: OutletInfo[];
  distanceKm?: number;
  formattedDistance?: string;
  nearestOutlet?: OutletInfo;
}

interface GymContextType {
  selectedGym: GymInfo | null;
  selectedOutlet: OutletInfo | null;
  allGyms: GymInfo[];
  nearbyGyms: GymInfo[];
  availableCities: string[];
  isLoading: boolean;
  isLocating: boolean;
  locationError: string | null;
  userCoords: { lat: number; lng: number } | null;
  isModalOpen: boolean;
  activeModalId: string | null;
  setIsModalOpen: (open: boolean) => void;
  openGymModal: (id?: string) => void;
  closeGymModal: () => void;
  selectGymAndOutlet: (gymId: string, outletId: string) => Promise<void>;
  detectLocationAndFindNearby: () => Promise<GymInfo[] | null>;
  resetLocation: () => void;
  fetchAllGyms: (search?: string, city?: string) => Promise<GymInfo[]>;
  clearLocationError: () => void;
}

const STORAGE_GYM_KEY = "nutriflexs_selected_gym_id";
const STORAGE_OUTLET_KEY = "nutriflexs_selected_outlet_id";

const GymContext = createContext<GymContextType | undefined>(undefined);

export function GymProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const [selectedGym, setSelectedGym] = useState<GymInfo | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<OutletInfo | null>(null);
  const [allGyms, setAllGyms] = useState<GymInfo[]>([]);
  const [nearbyGyms, setNearbyGyms] = useState<GymInfo[]>([]);
  const [availableCities, setAvailableCities] = useState<string[]>(["all", "Bengaluru", "Mumbai"]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [activeModalId, setActiveModalId] = useState<string | null>(null);

  const clearLocationError = useCallback(() => {
    setLocationError(null);
  }, []);

  const resetLocation = useCallback(() => {
    setUserCoords(null);
    setNearbyGyms([]);
    setLocationError(null);
  }, []);

  const openGymModal = useCallback((id?: string) => {
    setLocationError(null);
    setActiveModalId(id || "default");
    setIsModalOpen(true);
  }, []);

  const closeGymModal = useCallback(() => {
    setActiveModalId(null);
    setIsModalOpen(false);
  }, []);

  // Fetch all active gyms from API with optional search or city filter
  const fetchAllGyms = useCallback(
    async (search?: string, city?: string): Promise<GymInfo[]> => {
      try {
        const params = new URLSearchParams();
        if (search?.trim()) params.set("search", search.trim());
        if (city && city !== "all") params.set("city", city);
        if (userCoords) {
          params.set("lat", String(userCoords.lat));
          params.set("lng", String(userCoords.lng));
        }

        const res = await fetch(`/api/gyms?${params.toString()}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.gyms)) {
          if (!search && (!city || city === "all")) {
            setAllGyms(data.gyms);
            if (Array.isArray(data.cities) && data.cities.length > 0) {
              setAvailableCities(data.cities);
            }
          }
          return data.gyms;
        }
        return [];
      } catch (err) {
        console.error("Failed to fetch active gyms:", err);
        return [];
      }
    },
    [userCoords]
  );

  // Initial load: Fetch gyms and reconcile user selection
  useEffect(() => {
    let isMounted = true;

    async function initGymState() {
      setIsLoading(true);
      try {
        const gymsRes = await fetch("/api/gyms");
        const gymsData = await gymsRes.json();
        const gymsList: GymInfo[] =
          gymsData.success && Array.isArray(gymsData.gyms) ? gymsData.gyms : [];

        if (isMounted) {
          setAllGyms(gymsList);
          if (Array.isArray(gymsData.cities) && gymsData.cities.length > 0) {
            setAvailableCities(gymsData.cities);
          }
        }

        let chosenGymId: string | null = null;
        let chosenOutletId: string | null = null;
        let guestSelectedInLocalStorage = false;

        // Check localStorage first
        const localGymId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_GYM_KEY) : null;
        const localOutletId = typeof window !== "undefined" ? localStorage.getItem(STORAGE_OUTLET_KEY) : null;

        // Check authenticated user profile if logged in
        if (session?.user?.email) {
          try {
            const userRes = await fetch("/api/user/gym");
            const userData = await userRes.json();
            if (userData.success && userData.selectedGymId && userData.selectedOutletId) {
              chosenGymId = userData.selectedGymId;
              chosenOutletId = userData.selectedOutletId;
            } else if (localGymId && localOutletId) {
              // User logged in but had no DB gym yet: reconcile guest selection to DB
              chosenGymId = localGymId;
              chosenOutletId = localOutletId;
              guestSelectedInLocalStorage = true;
            }
          } catch (e) {
            console.warn("Failed to load user gym preference:", e);
          }
        }

        // Fallback to localStorage for guest or unset users
        if (!chosenGymId || !chosenOutletId) {
          chosenGymId = localGymId;
          chosenOutletId = localOutletId;
        }

        // Find matching gym and outlet in loaded list
        let matchedGym: GymInfo | null = null;
        let matchedOutlet: OutletInfo | null = null;

        if (chosenGymId && chosenOutletId && gymsList.length > 0) {
          matchedGym = gymsList.find((g) => g.id === chosenGymId) || null;
          if (matchedGym && matchedGym.outlets) {
            matchedOutlet = matchedGym.outlets.find((o) => o.id === chosenOutletId && o.isAvailable) || null;
          }
        }

        // Default to first available gym & kiosk if no valid saved state
        if ((!matchedGym || !matchedOutlet) && gymsList.length > 0) {
          for (const g of gymsList) {
            const avail = g.outlets?.find((o) => o.isAvailable);
            if (avail) {
              matchedGym = g;
              matchedOutlet = avail;
              break;
            }
          }
        }

        if (isMounted && matchedGym && matchedOutlet) {
          setSelectedGym(matchedGym);
          setSelectedOutlet(matchedOutlet);
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_GYM_KEY, matchedGym.id);
            localStorage.setItem(STORAGE_OUTLET_KEY, matchedOutlet.id);
          }

          // If guest selection needs to be persisted upon login, sync with backend
          if (guestSelectedInLocalStorage && session?.user?.email) {
            fetch("/api/gyms/select", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ gymId: matchedGym.id, outletId: matchedOutlet.id }),
            }).catch((err) => console.warn("Failed to sync guest gym upon login:", err));
          }
        }
      } catch (err) {
        console.error("Error initializing gym context:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    if (status !== "loading") {
      initGymState();
    }

    return () => {
      isMounted = false;
    };
  }, [session, status]);

  // Select Gym & Outlet handler with server-side validation
  const selectGymAndOutlet = useCallback(
    async (gymId: string, outletId: string) => {
      // 1. Call server API to validate gym and outlet
      const res = await fetch("/api/gyms/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gymId, outletId }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Unable to select this kiosk. Please choose another location.");
      }

      // 2. Find from current pool
      const lookupPool = [...allGyms, ...nearbyGyms];
      let targetGym = lookupPool.find((g) => g.id === gymId);
      let targetOutlet: OutletInfo | null = null;

      if (targetGym && targetGym.outlets) {
        targetOutlet = targetGym.outlets.find((o) => o.id === outletId) || null;
      }

      // If not in client pool, use the verified server response
      if (!targetGym) {
        targetGym = data.gym;
      }
      if (!targetOutlet) {
        targetOutlet = data.outlet;
      }

      if (targetGym && targetOutlet) {
        setSelectedGym(targetGym);
        setSelectedOutlet(targetOutlet);
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_GYM_KEY, targetGym.id);
          localStorage.setItem(STORAGE_OUTLET_KEY, targetOutlet.id);
        }
      }
    },
    [allGyms, nearbyGyms]
  );

  // Browser Geolocation Detection
  const detectLocationAndFindNearby = useCallback(async (): Promise<GymInfo[] | null> => {
    setLocationError(null);
    setIsLocating(true);

    if (typeof window === "undefined" || !navigator.geolocation) {
      setIsLocating(false);
      setLocationError("Geolocation is not supported by your browser. Please choose your gym manually.");
      return null;
    }

    return new Promise<GymInfo[] | null>((resolve) => {
      let isResolved = false;

      const geoTimeout = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          setIsLocating(false);
          setLocationError("Location request timed out. Please try again or choose your gym manually.");
          resolve(null);
        }
      }, 10000);

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(geoTimeout);
          const { latitude, longitude } = position.coords;
          setUserCoords({ lat: latitude, lng: longitude });

          try {
            const res = await fetch(`/api/gyms?lat=${latitude}&lng=${longitude}`);
            const data = await res.json();

            if (data.success && Array.isArray(data.gyms)) {
              if (data.gyms.length === 0) {
                setIsLocating(false);
                setLocationError("No partner gyms found near your location. Please choose your gym manually.");
                resolve(null);
                return;
              }

              setNearbyGyms(data.gyms);
              setIsLocating(false);
              resolve(data.gyms);
            } else {
              setIsLocating(false);
              setLocationError(data.error || "Unable to detect your location. Please choose your gym manually.");
              resolve(null);
            }
          } catch (err: any) {
            setIsLocating(false);
            setLocationError("Failed to fetch nearby gyms from database. Please choose your gym manually.");
            resolve(null);
          }
        },
        (err) => {
          if (isResolved) return;
          isResolved = true;
          clearTimeout(geoTimeout);
          setIsLocating(false);
          switch (err.code) {
            case err.PERMISSION_DENIED:
              setLocationError(
                "Location access was denied. Please allow location access in your browser or select a gym manually."
              );
              break;
            case err.POSITION_UNAVAILABLE:
              setLocationError("Location information is unavailable. Please select your gym manually.");
              break;
            case err.TIMEOUT:
              setLocationError("Location request timed out. Please try again or choose your gym manually.");
              break;
            default:
              setLocationError("Unable to detect your location. Please choose your gym manually.");
              break;
          }
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return (
    <GymContext.Provider
      value={{
        selectedGym,
        selectedOutlet,
        allGyms,
        nearbyGyms,
        availableCities,
        isLoading,
        isLocating,
        locationError,
        userCoords,
        isModalOpen,
        activeModalId,
        setIsModalOpen,
        openGymModal,
        closeGymModal,
        selectGymAndOutlet,
        detectLocationAndFindNearby,
        resetLocation,
        fetchAllGyms,
        clearLocationError,
      }}
    >
      <Suspense fallback={null}>
        <UrlGymListener onTrigger={openGymModal} />
      </Suspense>
      {children}
    </GymContext.Provider>
  );
}

function UrlGymListener({ onTrigger }: { onTrigger: () => void }) {
  const searchParams = useSearchParams();
  useEffect(() => {
    if (searchParams) {
      const action = searchParams.get("action");
      const findGym = searchParams.get("findGym");
      if (action === "find-gym" || findGym === "true") {
        onTrigger();
      }
    }
  }, [searchParams, onTrigger]);
  return null;
}

export function useGym() {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error("useGym must be used within a GymProvider");
  }
  return context;
}
