import { prisma } from "@/lib/prisma";

export async function getProducts(options?: {
  categoryId?: string;
  categorySlug?: string;
  search?: string;
  isVeg?: boolean;
  isPopular?: boolean;
  isFeatured?: boolean;
}) {
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

  return await prisma.product.findMany({
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
}

export async function getProductBySlug(slug: string) {
  return await prisma.product.findUnique({
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
}

export async function getCategories() {
  return await prisma.category.findMany({
    orderBy: { displayOrder: "asc" },
  });
}
