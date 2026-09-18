"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

export interface OutletInfo {
  id: string;
  name: string;
  address: string;
  phone?: string | null;
  isAvailable: boolean;
  distanceKm?: number;
  formattedDistance?: string;
}

export interface GymInfo {
  id: string;
  name: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
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
  isLoading: boolean;
  isLocating: boolean;
  locationError: string | null;
  isModalOpen: boolean;
  setIsModalOpen: (open: boolean) => void;
  openGymModal: () => void;
  closeGymModal: () => void;
  selectGymAndOutlet: (gymId: string, outletId: string) => Promise<void>;
  detectLocationAndFindNearby: () => Promise<GymInfo[] | null>;
  fetchAllGyms: (search?: string) => Promise<GymInfo[]>;
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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const clearLocationError = useCallback(() => {
    setLocationError(null);
  }, []);

  const openGymModal = useCallback(() => {
    setLocationError(null);
    setIsModalOpen(true);
  }, []);

  const closeGymModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  // Fetch all active gyms from API
  const fetchAllGyms = useCallback(async (search?: string): Promise<GymInfo[]> => {
    try {
      const url = search ? `/api/gyms?search=${encodeURIComponent(search)}` : "/api/gyms";
      const res = await fetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.gyms)) {
        if (!search) {
          setAllGyms(data.gyms);
        }
        return data.gyms;
      }
      return [];
    } catch (err) {
      console.error("Failed to fetch active gyms:", err);
      return [];
    }
  }, []);

  // Initial load: Fetch gyms and sync user selection
  useEffect(() => {
    let isMounted = true;

    async function initGymState() {
      setIsLoading(true);
      try {
        const gymsRes = await fetch("/api/gyms");
        const gymsData = await gymsRes.json();
        const gymsList: GymInfo[] = gymsData.success && Array.isArray(gymsData.gyms) ? gymsData.gyms : [];

        if (isMounted) {
          setAllGyms(gymsList);
        }

        let chosenGymId: string | null = null;
        let chosenOutletId: string | null = null;

        // Check authenticated user profile if logged in
        if (session?.user?.email) {
          try {
            const userRes = await fetch("/api/user/gym");
            const userData = await userRes.json();
            if (userData.success && userData.selectedGymId && userData.selectedOutletId) {
              chosenGymId = userData.selectedGymId;
              chosenOutletId = userData.selectedOutletId;
            }
          } catch (e) {
            console.warn("Failed to load user gym preference:", e);
          }
        }

        // Fallback to localStorage for guest or unset users
        if (!chosenGymId || !chosenOutletId) {
          chosenGymId = localStorage.getItem(STORAGE_GYM_KEY);
          chosenOutletId = localStorage.getItem(STORAGE_OUTLET_KEY);
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

        // Default to first available gym & outlet if no valid saved state
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
          localStorage.setItem(STORAGE_GYM_KEY, matchedGym.id);
          localStorage.setItem(STORAGE_OUTLET_KEY, matchedOutlet.id);
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

  // Select Gym & Outlet handler
  const selectGymAndOutlet = useCallback(
    async (gymId: string, outletId: string) => {
      // Find from allGyms or nearbyGyms
      const lookupPool = [...allGyms, ...nearbyGyms];
      const targetGym = lookupPool.find((g) => g.id === gymId);
      let targetOutlet: OutletInfo | null = null;

      if (targetGym && targetGym.outlets) {
        targetOutlet = targetGym.outlets.find((o) => o.id === outletId) || null;
      }

      if (targetGym && targetOutlet) {
        setSelectedGym(targetGym);
        setSelectedOutlet(targetOutlet);
        localStorage.setItem(STORAGE_GYM_KEY, targetGym.id);
        localStorage.setItem(STORAGE_OUTLET_KEY, targetOutlet.id);
      }

      // If authenticated, sync with database
      if (session?.user?.email) {
        try {
          await fetch("/api/user/gym", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ gymId, outletId }),
          });
        } catch (e) {
          console.error("Failed to sync gym selection with user profile:", e);
        }
      }
    },
    [allGyms, nearbyGyms, session]
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

          try {
            const res = await fetch(`/api/gyms/nearby?lat=${latitude}&lng=${longitude}`);
            const data = await res.json();

            if (data.success && Array.isArray(data.gyms)) {
              if (data.gyms.length === 0) {
                setIsLocating(false);
                setLocationError("No partner gyms found near your location. Please choose your gym manually.");
                resolve(null);
                return;
              }

              const mappedGyms: GymInfo[] = data.gyms.map((g: any) => ({
                id: g.gymId,
                name: g.gymName,
                address: g.gymAddress,
                city: g.city,
                latitude: g.latitude,
                longitude: g.longitude,
                distanceKm: g.distanceKm,
                formattedDistance: g.formattedDistance,
                outlets: g.outlets,
                nearestOutlet: g.nearestOutlet,
              }));

              setNearbyGyms(mappedGyms);
              setIsLocating(false);
              resolve(mappedGyms);
            } else {
              setIsLocating(false);
              setLocationError(data.error || "Unable to detect your location. Please choose your gym manually.");
              resolve(null);
            }
          } catch (err: any) {
            setIsLocating(false);
            setLocationError("Failed to fetch nearby gyms from server. Please choose your gym manually.");
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
                "Location access is disabled. Please allow location access in your browser or choose a gym manually."
              );
              break;
            case err.POSITION_UNAVAILABLE:
              setLocationError("Unable to detect your location. Please choose your gym manually.");
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
        isLoading,
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
      }}
    >
      <Suspense fallback={null}>
        <UrlGymListener onTrigger={openGymModal} />
      </Suspense>
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  const context = useContext(GymContext);
  if (!context) {
    throw new Error("useGym must be used within a GymProvider");
  }
  return context;
}
