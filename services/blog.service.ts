import { prisma, withDbRetry } from "@/lib/prisma";
import { getCached, setCached, invalidateCacheByTag } from "@/lib/cache";

export const BLOG_CARD_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  coverImage: true,
  category: true,
  authorName: true,
  authorRole: true,
  authorAvatar: true,
  readTimeMinutes: true,
  isFeatured: true,
  isPublished: true,
  publishedAt: true,
  tags: true,
} as const;

export interface GetBlogPostsParams {
  category?: string;
  tag?: string;
  page?: number;
  limit?: number;
}

export async function getBlogPosts(params?: GetBlogPostsParams) {
  const page = Math.max(1, params?.page || 1);
  const limit = Math.min(50, Math.max(1, params?.limit || 4));
  const category = params?.category;
  const tag = params?.tag;

  const cacheKey = `blog_list_${category || "all"}_${tag || "none"}_p${page}_l${limit}`;
  const cached = getCached<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const whereClause: any = {
    isPublished: true,
  };

  if (category && category !== "All") {
    whereClause.category = category;
  }

  if (tag) {
    whereClause.tags = {
      has: tag,
    };
  }

  const skip = (page - 1) * limit;

  const [articles, totalCount] = await withDbRetry(() =>
    Promise.all([
      prisma.blogPost.findMany({
        where: whereClause,
        orderBy: { publishedAt: "desc" },
        skip,
        take: limit,
        select: BLOG_CARD_SELECT,
      }),
      prisma.blogPost.count({
        where: whereClause,
      }),
    ])
  );

  const totalPages = Math.ceil(totalCount / limit);
  const result = {
    articles,
    totalCount,
    totalPages,
    currentPage: page,
    limit,
  };

  setCached(cacheKey, result, 180, ["blog"]);
  return result;
}

export async function getBlogSidebarData() {
  const cacheKey = "blog_sidebar_data";
  const cached = getCached<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const [recentArticles, allCategoriesRaw, featuredProducts] = await withDbRetry(() =>
    Promise.all([
      // Recent articles for sidebar (top 4)
      prisma.blogPost.findMany({
        where: { isPublished: true },
        orderBy: { publishedAt: "desc" },
        take: 4,
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          publishedAt: true,
          category: true,
          readTimeMinutes: true,
        },
      }),
      // All categories with count
      prisma.blogPost.groupBy({
        by: ["category"],
        where: { isPublished: true },
        _count: {
          id: true,
        },
      }),
      // Real featured NutriFlexs products for sidebar
      prisma.product.findMany({
        where: {
          isAvailable: true,
          isFeatured: true,
        },
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          calories: true,
          protein: true,
          imageUrl: true,
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { price: "asc" },
      }),
    ])
  );

  const categories = allCategoriesRaw.map((c) => ({
    name: c.category,
    count: c._count.id,
  }));

  const totalAllArticles = allCategoriesRaw.reduce((acc, c) => acc + c._count.id, 0);

  const result = {
    recentArticles,
    categories,
    featuredProducts,
    totalAllArticles,
  };

  setCached(cacheKey, result, 300, ["blog"]);
  return result;
}

export async function getBlogPostBySlug(slug: string) {
  const cacheKey = `blog_post_${slug}`;
  const cached = getCached<any>(cacheKey);
  if (cached) {
    return cached;
  }

  const article = await withDbRetry(() =>
    prisma.blogPost.findUnique({
      where: { slug },
    })
  );

  if (article) {
    setCached(cacheKey, article, 300, ["blog"]);
  }

  return article;
}

export function invalidateBlogCache() {
  invalidateCacheByTag("blog");
}
