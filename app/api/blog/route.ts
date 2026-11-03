import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(1, parseInt(searchParams.get("limit") || "4", 10));
    const category = searchParams.get("category");
    const tag = searchParams.get("tag");

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

    const [articles, totalCount, recentArticles, allCategoriesRaw, featuredProducts] =
      await Promise.all([
        prisma.blogPost.findMany({
          where: whereClause,
          orderBy: { publishedAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.blogPost.count({
          where: whereClause,
        }),
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
          include: {
            category: true,
          },
          orderBy: { price: "asc" },
        }),
      ]);

    const categories = allCategoriesRaw.map((c) => ({
      name: c.category,
      count: c._count.id,
    }));

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      articles,
      totalCount,
      totalPages,
      currentPage: page,
      limit,
      recentArticles,
      categories,
      featuredProducts,
    });
  } catch (error) {
    console.error("Error fetching blog articles from database:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load blog posts" },
      { status: 500 }
    );
  }
}

