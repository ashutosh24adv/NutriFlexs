import { prisma } from "@/lib/prisma";

// Fallback known coordinates for seed gyms in case database columns are unpopulated
const DEFAULT_GYM_COORDS: Record<string, { lat: number; lng: number }> = {
  indiranagar: { lat: 12.9784, lng: 77.6408 },
  koramangala: { lat: 12.9345, lng: 77.6265 },
  bandra: { lat: 19.0596, lng: 72.8295 },
};

/**
 * Calculates geographic great-circle distance between two coordinates using the Haversine formula.
 * @returns Distance in kilometers
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance into clean, user-friendly strings.
 * Under 1 km -> "650 m away"
 * 1 km or more -> "2.4 km away"
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.max(10, Math.round(distanceKm * 1000));
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

function getGymCoordinates(
  gym: { name: string; latitude?: number | null; longitude?: number | null },
  outlet?: { latitude?: number | null; longitude?: number | null }
): {
  lat: number;
  lng: number;
} {
  if (
    typeof gym.latitude === "number" &&
    !isNaN(gym.latitude) &&
    typeof gym.longitude === "number" &&
    !isNaN(gym.longitude)
  ) {
    return { lat: gym.latitude, lng: gym.longitude };
  }

  if (
    outlet &&
    typeof outlet.latitude === "number" &&
    !isNaN(outlet.latitude) &&
    typeof outlet.longitude === "number" &&
    !isNaN(outlet.longitude)
  ) {
    return { lat: outlet.latitude, lng: outlet.longitude };
  }

  const lowerName = gym.name.toLowerCase();
  for (const [key, coords] of Object.entries(DEFAULT_GYM_COORDS)) {
    if (lowerName.includes(key)) {
      return coords;
    }
  }

  // Default fallback if coordinates cannot be determined
  return { lat: 12.9716, lng: 77.5946 };
}

export interface NearbyGymResult {
  gymId: string;
  gymName: string;
  gymAddress: string;
  city: string;
  distanceKm: number;
  formattedDistance: string;
  latitude: number;
  longitude: number;
  outlets: Array<{
    id: string;
    name: string;
    address: string;
    phone: string | null;
    isAvailable: boolean;
    distanceKm: number;
    formattedDistance: string;
  }>;
  nearestOutlet: {
    id: string;
    name: string;
    address: string;
    phone: string | null;
    formattedDistance: string;
  };
}

/**
 * Queries real database gyms with active outlets, calculates Haversine distance, and sorts nearest first.
 */
export async function getNearbyGyms(
  userLat: number,
  userLng: number
): Promise<NearbyGymResult[]> {
  // Query gyms with at least one active NutriFlexs kiosk outlet
  const gyms = await prisma.gym.findMany({
    where: {
      outlets: {
        some: {
          isAvailable: true,
        },
      },
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      outlets: {
        where: {
          isAvailable: true,
        },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          latitude: true,
          longitude: true,
          isAvailable: true,
        },
      },
    },
  });

  const results: NearbyGymResult[] = [];

  for (const gym of gyms) {
    if (!gym.outlets || gym.outlets.length === 0) continue;

    const gymCoords = getGymCoordinates(gym);

    const computedOutlets = gym.outlets.map((outlet) => {
      const outletCoords = getGymCoordinates(gym, outlet);
      const outletDistKm = calculateHaversineDistance(
        userLat,
        userLng,
        outletCoords.lat,
        outletCoords.lng
      );

      return {
        id: outlet.id,
        name: outlet.name,
        address: outlet.address,
        phone: outlet.phone,
        isAvailable: outlet.isAvailable,
        distanceKm: outletDistKm,
        formattedDistance: formatDistance(outletDistKm),
      };
    });

    // Sort outlets of this gym nearest first
    computedOutlets.sort((a, b) => a.distanceKm - b.distanceKm);

    const nearestOutlet = computedOutlets[0];

    results.push({
      gymId: gym.id,
      gymName: gym.name,
      gymAddress: gym.address,
      city: gym.city,
      distanceKm: nearestOutlet.distanceKm,
      formattedDistance: formatDistance(nearestOutlet.distanceKm),
      latitude: gymCoords.lat,
      longitude: gymCoords.lng,
      outlets: computedOutlets,
      nearestOutlet: {
        id: nearestOutlet.id,
        name: nearestOutlet.name,
        address: nearestOutlet.address,
        phone: nearestOutlet.phone,
        formattedDistance: nearestOutlet.formattedDistance,
      },
    });
  }

  // Sort gyms ascending by nearest distance
  results.sort((a, b) => a.distanceKm - b.distanceKm);

  return results;
}

/**
 * Returns all active gyms and their available outlets.
 */
export async function getAllActiveGyms(search?: string) {
  const where: any = {
    outlets: {
      some: {
        isAvailable: true,
      },
    },
  };

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { mode: "insensitive", contains: q } },
      { address: { contains: q, mode: "insensitive" } },
      {
        outlets: {
          some: {
            name: { contains: q, mode: "insensitive" },
            isAvailable: true,
          },
        },
      },
    ];
  }

  const gyms = await prisma.gym.findMany({
    where,
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      latitude: true,
      longitude: true,
      outlets: {
        where: {
          isAvailable: true,
        },
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          latitude: true,
          longitude: true,
          isAvailable: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return gyms
    .filter((gym) => gym.outlets && gym.outlets.length > 0)
    .map((gym) => {
      const coords = getGymCoordinates(gym);
      return {
        id: gym.id,
        name: gym.name,
        address: gym.address,
        city: gym.city,
        latitude: coords.lat,
        longitude: coords.lng,
        outlets: gym.outlets.map((o) => ({
          id: o.id,
          name: o.name,
          address: o.address,
          phone: o.phone,
          isAvailable: o.isAvailable,
        })),
      };
    });
}
