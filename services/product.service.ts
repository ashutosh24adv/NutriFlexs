import { prisma } from "@/lib/prisma";

// High-performance in-memory cache for static/read-heavy catalog data (60s TTL)
interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const globalForCatalogCache = globalThis as unknown as {
  catalogMemoryCache: Map<string, CacheEntry<any>> | undefined;
};

const memoryCache =
  globalForCatalogCache.catalogMemoryCache ?? new Map<string, CacheEntry<any>>();

if (process.env.NODE_ENV !== "production") {
  globalForCatalogCache.catalogMemoryCache = memoryCache;
}

const CACHE_TTL_MS = 60 * 1000; // 60 seconds

function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data;
}

function setInCache<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
  memoryCache.set(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
}

export async function getProducts(options?: {
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  isVeg?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
}) {
  const cacheKey = `products_${JSON.stringify(options || {})}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const where: any = { isAvailable: true };

  if (options?.categoryId) {
    where.categoryId = options.categoryId;
  } else if (options?.categorySlug) {
    where.category = { slug: options.categorySlug };
  }

  if (options?.isVeg !== undefined) {
    where.isVeg = options.isVeg;
  }

  if (options?.isPopular) {
    where.isPopular = true;
  }

  if (options?.isFeatured) {
    where.isFeatured = true;
  }

  if (options?.search) {
    const query = options.search.trim().toLowerCase();
    where.OR = [
      { name: { contains: query, mode: "insensitive" } },
      { description: { contains: query, mode: "insensitive" } },
      { ingredients: { some: { ingredient: { name: { contains: query, mode: "insensitive" } } } } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    include: {
      category: true,
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  setInCache(cacheKey, products);
  return products;
}

export async function getProductBySlug(slug: string) {
  const cacheKey = `product_slug_${slug}`;
  const cached = getFromCache<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const product = await prisma.product.findUnique({
    where: { slug },
    include: {
      category: true,
      ingredients: {
        include: {
          ingredient: true,
        },
      },
    },
  });

  if (product) {
    setInCache(cacheKey, product);
  }
  return product;
}

export async function getCategories() {
  const cacheKey = "categories_all";
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const categories = await prisma.category.findMany({
    orderBy: { displayOrder: "asc" },
  });

  setInCache(cacheKey, categories);
  return categories;
}
