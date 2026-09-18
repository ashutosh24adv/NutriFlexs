import { Prisma } from "@prisma/client";

/**
 * Centralized Dietary Filter Service for NutriFlexs
 * Enforces strict vegetarian classification and query-level filtering across all database operations.
 */

export interface DietaryFilterOptions {
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  isVeg?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
  availableOnly?: boolean;
}

/**
 * Constructs a centralized Prisma Product where-clause ensuring database-level filtering.
 */
export function buildProductDietaryWhere(options?: DietaryFilterOptions): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = {};

  if (options?.availableOnly !== false) {
    where.isAvailable = true;
  }

  // Strict Vegetarian Filtering: When isVeg is true, only vegetarian products are matched
  if (options?.isVeg !== undefined) {
    where.isVeg = options.isVeg;
  }

  if (options?.categoryId) {
    where.categoryId = options.categoryId;
  } else if (options?.categorySlug && options.categorySlug !== "all") {
    where.category = { slug: options.categorySlug };
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
      {
        ingredients: {
          some: {
            ingredient: {
              name: { contains: query, mode: "insensitive" },
            },
          },
        },
      },
    ];
  }

  return where;
}

/**
 * Validates whether a given product object is strictly vegetarian.
 */
export function isStrictVegetarian(product: { isVeg?: boolean | null } | null | undefined): boolean {
  if (!product) return false;
  return Boolean(product.isVeg);
}
