import { prisma, withDbRetry } from "@/lib/prisma";
import { unstable_cache, revalidateTag } from "next/cache";

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

const CACHE_TTL_MS = 300 * 1000; // 300 seconds (5 minutes) cache for catalog data

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

import { buildProductDietaryWhere, DietaryFilterOptions } from "./dietary-filter.service";

export function invalidateProductCache() {
  memoryCache.clear();
  try {
    revalidateTag("products");
    revalidateTag("categories");
  } catch {
    // Safe no-op outside Next.js request/cache context (e.g., standalone scripts)
  }
}

const fetchProductsFromDb = unstable_cache(
  async (optionsJson: string) => {
    const options: DietaryFilterOptions = JSON.parse(optionsJson || "{}");
    const where = buildProductDietaryWhere(options);

    return await withDbRetry(() =>
      prisma.product.findMany({
        where,
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          price: true,
          calories: true,
          protein: true,
          carbs: true,
          fats: true,
          totalSugar: true,
          addedSugar: true,
          preparationTimeMinutes: true,
          imageUrl: true,
          categoryId: true,
          isAvailable: true,
          isFeatured: true,
          isPopular: true,
          isVeg: true,
          category: {
            select: { id: true, name: true, slug: true },
          },
          ingredients: {
            select: {
              amount: true,
              ingredient: {
                select: { name: true },
              },
            },
          },
          dietGoals: {
            select: { goal: true },
          },
        },
        orderBy: { createdAt: "asc" },
      })
    );
  },
  ["nutriflexs-products"],
  { revalidate: 300, tags: ["products"] }
);

export async function getProducts(options?: DietaryFilterOptions) {
  const optionsJson = JSON.stringify(options || {});
  const cacheKey = `products_${optionsJson}`;
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const products = await fetchProductsFromDb(optionsJson);

  setInCache(cacheKey, products);
  return products;
}

export async function getProductBySlug(slug: string) {
  const cacheKey = `product_slug_${slug}`;
  const cached = getFromCache<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const product = await withDbRetry(() =>
    prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        ingredients: {
          include: {
            ingredient: true,
          },
        },
        dietGoals: true,
      },
    })
  );

  if (product) {
    setInCache(cacheKey, product);
  }
  return product;
}

const fetchCategoriesFromDb = unstable_cache(
  async () => {
    return await withDbRetry(() =>
      prisma.category.findMany({
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          displayOrder: true,
        },
        orderBy: { displayOrder: "asc" },
      })
    );
  },
  ["nutriflexs-categories"],
  { revalidate: 300, tags: ["categories"] }
);

export async function getCategories() {
  const cacheKey = "categories_all";
  const cached = getFromCache<any[]>(cacheKey);
  if (cached) {
    return cached;
  }

  const categories = await fetchCategoriesFromDb();

  setInCache(cacheKey, categories);
  return categories;
}
