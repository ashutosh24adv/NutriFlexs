import { prisma } from "@/lib/prisma";

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
 * Under 1 km -> "450 m away"
 * 1 km or more -> "2.4 km away"
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    const meters = Math.max(10, Math.round(distanceKm * 1000));
    return `${meters} m away`;
  }
  return `${distanceKm.toFixed(1)} km away`;
}

export function getGymCoordinates(
  gym: { name: string; latitude?: number | null; longitude?: number | null },
  outlet?: { latitude?: number | null; longitude?: number | null }
): {
  lat: number;
  lng: number;
} | null {
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

  return null;
}

export interface OutletDetail {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  operatingHours?: string | null;
  isAvailable: boolean;
  isActive: boolean;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number;
  formattedDistance?: string;
}

export interface GymDetail {
  id: string;
  name: string;
  address: string;
  city: string;
  area: string | null;
  phone: string | null;
  imageUrl: string | null;
  operatingHours: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
  distanceKm?: number;
  formattedDistance?: string;
  outlets: OutletDetail[];
  nearestOutlet?: OutletDetail;
}

export interface NearbyGymResult {
  gymId: string;
  gymName: string;
  gymAddress: string;
  city: string;
  area: string | null;
  distanceKm: number;
  formattedDistance: string;
  latitude: number;
  longitude: number;
  outlets: OutletDetail[];
  nearestOutlet: OutletDetail;
}

/**
 * Returns distinct cities where active partner gyms exist in Neon PostgreSQL.
 */
export async function getDistinctGymCities(): Promise<string[]> {
  const cities = await prisma.gym.findMany({
    where: { isActive: true },
    select: { city: true },
    distinct: ["city"],
    orderBy: { city: "asc" },
  });

  return cities.map((c) => c.city).filter(Boolean);
}

/**
 * Queries real database gyms with filters (search, city, coordinates),
 * calculates Haversine distance if lat/lng are provided, and returns results.
 */
export async function getAllActiveGyms(params?: {
  search?: string;
  city?: string;
  lat?: number;
  lng?: number;
  includeInactive?: boolean;
}): Promise<{ gyms: GymDetail[]; cities: string[]; total: number }> {
  const { search, city, lat, lng, includeInactive = false } = params || {};

  const where: any = {};

  if (!includeInactive) {
    where.isActive = true;
  }

  // City filter (case-insensitive)
  if (city && city.toLowerCase() !== "all") {
    where.city = { equals: city, mode: "insensitive" };
  }

  // Search filter matching name, city, area, address, or outlet details
  if (search && search.trim()) {
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { city: { contains: q, mode: "insensitive" } },
      { area: { contains: q, mode: "insensitive" } },
      { address: { contains: q, mode: "insensitive" } },
      {
        outlets: {
          some: {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { address: { contains: q, mode: "insensitive" } },
            ],
            ...(includeInactive ? {} : { isActive: true }),
          },
        },
      },
    ];
  }

  // Only show gyms with at least one active outlet for customers
  if (!includeInactive) {
    where.outlets = {
      some: {
        isActive: true,
      },
    };
  }

  const [dbGyms, distinctCities] = await Promise.all([
    prisma.gym.findMany({
      where,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        area: true,
        phone: true,
        imageUrl: true,
        operatingHours: true,
        latitude: true,
        longitude: true,
        isActive: true,
        outlets: {
          where: includeInactive ? {} : { isActive: true },
          select: {
            id: true,
            name: true,
            address: true,
            phone: true,
            operatingHours: true,
            latitude: true,
            longitude: true,
            isAvailable: true,
            isActive: true,
          },
          orderBy: { isAvailable: "desc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    getDistinctGymCities(),
  ]);

  const hasCoords = typeof lat === "number" && !isNaN(lat) && typeof lng === "number" && !isNaN(lng);

  const mappedGyms: GymDetail[] = dbGyms.map((gym) => {
    const gymCoords = getGymCoordinates(gym);

    const computedOutlets: OutletDetail[] = gym.outlets.map((outlet) => {
      let outletDistKm: number | undefined;
      let outletDistFormatted: string | undefined;

      if (hasCoords) {
        const outletCoords = getGymCoordinates(gym, outlet) || gymCoords;
        if (outletCoords) {
          outletDistKm = calculateHaversineDistance(lat!, lng!, outletCoords.lat, outletCoords.lng);
          outletDistFormatted = formatDistance(outletDistKm);
        }
      }

      return {
        id: outlet.id,
        name: outlet.name,
        address: outlet.address,
        phone: outlet.phone,
        operatingHours: outlet.operatingHours || gym.operatingHours || "6:00 AM – 10:00 PM",
        isAvailable: outlet.isAvailable,
        isActive: outlet.isActive,
        latitude: outlet.latitude,
        longitude: outlet.longitude,
        distanceKm: outletDistKm,
        formattedDistance: outletDistFormatted,
      };
    });

    // If coordinates are provided, sort outlets nearest first
    if (hasCoords) {
      computedOutlets.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
    }

    let gymDistKm: number | undefined;
    let gymDistFormatted: string | undefined;

    if (hasCoords && gymCoords) {
      gymDistKm = calculateHaversineDistance(lat!, lng!, gymCoords.lat, gymCoords.lng);
      gymDistFormatted = formatDistance(gymDistKm);
    } else if (hasCoords && computedOutlets[0]?.distanceKm != null) {
      gymDistKm = computedOutlets[0].distanceKm;
      gymDistFormatted = computedOutlets[0].formattedDistance;
    }

    return {
      id: gym.id,
      name: gym.name,
      address: gym.address,
      city: gym.city,
      area: gym.area,
      phone: gym.phone,
      imageUrl: gym.imageUrl,
      operatingHours: gym.operatingHours || "6:00 AM – 10:00 PM",
      latitude: gymCoords?.lat ?? gym.latitude,
      longitude: gymCoords?.lng ?? gym.longitude,
      isActive: gym.isActive,
      distanceKm: gymDistKm,
      formattedDistance: gymDistFormatted,
      outlets: computedOutlets,
      nearestOutlet: computedOutlets[0],
    };
  });

  // If coordinates provided, sort gyms ascending by distance
  if (hasCoords) {
    mappedGyms.sort((a, b) => (a.distanceKm ?? 99999) - (b.distanceKm ?? 99999));
  }

  return {
    gyms: mappedGyms,
    cities: ["all", ...distinctCities],
    total: mappedGyms.length,
  };
}

/**
 * Legacy compatible helper for /api/gyms/nearby
 */
export async function getNearbyGyms(
  userLat: number,
  userLng: number
): Promise<NearbyGymResult[]> {
  const { gyms } = await getAllActiveGyms({ lat: userLat, lng: userLng });

  return gyms.map((g) => ({
    gymId: g.id,
    gymName: g.name,
    gymAddress: g.address,
    city: g.city,
    area: g.area,
    distanceKm: g.distanceKm ?? 0,
    formattedDistance: g.formattedDistance ?? "Nearby",
    latitude: g.latitude ?? 0,
    longitude: g.longitude ?? 0,
    outlets: g.outlets,
    nearestOutlet: g.nearestOutlet || g.outlets[0],
  }));
}

/**
 * Fetch a single gym by ID with its outlets.
 */
export async function getGymById(id: string): Promise<GymDetail | null> {
  const gym = await prisma.gym.findUnique({
    where: { id },
    include: {
      outlets: {
        where: { isActive: true },
        orderBy: { isAvailable: "desc" },
      },
    },
  });

  if (!gym) return null;

  return {
    id: gym.id,
    name: gym.name,
    address: gym.address,
    city: gym.city,
    area: gym.area,
    phone: gym.phone,
    imageUrl: gym.imageUrl,
    operatingHours: gym.operatingHours || "6:00 AM – 10:00 PM",
    latitude: gym.latitude,
    longitude: gym.longitude,
    isActive: gym.isActive,
    outlets: gym.outlets.map((o) => ({
      id: o.id,
      name: o.name,
      address: o.address,
      phone: o.phone,
      operatingHours: o.operatingHours || gym.operatingHours || "6:00 AM – 10:00 PM",
      isAvailable: o.isAvailable,
      isActive: o.isActive,
      latitude: o.latitude,
      longitude: o.longitude,
    })),
  };
}

/**
 * Validates gym & outlet selection on the server and attaches it to the user profile if authenticated.
 */
export async function validateAndSelectGym(
  gymId: string,
  outletId: string,
  userId?: string
) {
  // 1. Validate Gym exists & is active
  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: { id: true, name: true, address: true, city: true, area: true, isActive: true },
  });

  if (!gym) {
    throw new Error("Partner gym not found in database.");
  }

  if (!gym.isActive) {
    throw new Error("This partner gym location is currently inactive.");
  }

  // 2. Validate Outlet exists, belongs to Gym, is active, and isAvailable
  const outlet = await prisma.outlet.findFirst({
    where: {
      id: outletId,
      gymId: gymId,
    },
  });

  if (!outlet) {
    throw new Error("Selected kiosk outlet does not belong to this gym.");
  }

  if (!outlet.isActive) {
    throw new Error("This express kiosk is currently inactive.");
  }

  if (!outlet.isAvailable) {
    throw new Error("This express kiosk is temporarily closed and not accepting orders.");
  }

  // 3. Persist to user record if authenticated
  if (userId) {
    await prisma.user.update({
      where: { id: userId },
      data: {
        selectedGymId: gymId,
        selectedOutletId: outletId,
      },
    });
  }

  return {
    gym,
    outlet: {
      id: outlet.id,
      name: outlet.name,
      address: outlet.address,
      phone: outlet.phone,
      isAvailable: outlet.isAvailable,
      isActive: outlet.isActive,
    },
  };
}

/* =========================================================================================
   ADMIN GYM & KIOSK MANAGEMENT
   ========================================================================================= */

export async function adminGetAllGyms() {
  return await prisma.gym.findMany({
    include: {
      outlets: {
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { users: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function adminCreateGym(data: {
  name: string;
  address: string;
  city: string;
  area?: string;
  phone?: string;
  operatingHours?: string;
  latitude?: number;
  longitude?: number;
  kioskName?: string;
  kioskAddress?: string;
  kioskPhone?: string;
}) {
  const {
    name,
    address,
    city,
    area,
    phone,
    operatingHours = "6:00 AM – 10:00 PM",
    latitude,
    longitude,
    kioskName,
    kioskAddress,
    kioskPhone,
  } = data;

  const gym = await prisma.gym.create({
    data: {
      name,
      address,
      city,
      area: area || null,
      phone: phone || null,
      operatingHours,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      isActive: true,
      outlets: kioskName
        ? {
            create: {
              name: kioskName,
              address: kioskAddress || address,
              phone: kioskPhone || phone || null,
              operatingHours,
              latitude: latitude ?? null,
              longitude: longitude ?? null,
              isAvailable: true,
              isActive: true,
            },
          }
        : undefined,
    },
    include: {
      outlets: true,
    },
  });

  return gym;
}

export async function adminUpdateGym(
  id: string,
  data: {
    name?: string;
    address?: string;
    city?: string;
    area?: string;
    phone?: string;
    operatingHours?: string;
    latitude?: number;
    longitude?: number;
    isActive?: boolean;
  }
) {
  return await prisma.gym.update({
    where: { id },
    data,
    include: {
      outlets: true,
    },
  });
}

export async function adminToggleGymActive(id: string, isActive: boolean) {
  return await prisma.gym.update({
    where: { id },
    data: { isActive },
    include: {
      outlets: true,
    },
  });
}

export async function adminCreateOutlet(
  gymId: string,
  data: {
    name: string;
    address: string;
    phone?: string;
    operatingHours?: string;
    latitude?: number;
    longitude?: number;
    isAvailable?: boolean;
  }
) {
  return await prisma.outlet.create({
    data: {
      gymId,
      name: data.name,
      address: data.address,
      phone: data.phone || null,
      operatingHours: data.operatingHours || "6:00 AM – 10:00 PM",
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      isAvailable: data.isAvailable ?? true,
      isActive: true,
    },
  });
}

export async function adminUpdateOutlet(
  id: string,
  data: {
    name?: string;
    address?: string;
    phone?: string;
    operatingHours?: string;
    isAvailable?: boolean;
    isActive?: boolean;
    latitude?: number;
    longitude?: number;
  }
) {
  return await prisma.outlet.update({
    where: { id },
    data,
  });
}

export async function adminToggleOutletAvailability(id: string, isAvailable: boolean) {
  return await prisma.outlet.update({
    where: { id },
    data: { isAvailable },
  });
}
