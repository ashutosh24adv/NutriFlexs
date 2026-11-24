import { NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getCached, setCached } from "@/lib/cache";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const cacheKey = `blog_detail_${slug}`;
    const cached = getCached<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, {
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      });
    }

    const article = await withDbRetry(() =>
      prisma.blogPost.findUnique({
        where: { slug },
      })
    );

    if (!article || !article.isPublished) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Related articles (same category or recent, excluding current)
    const [relatedArticles, recommendedProducts] = await withDbRetry(() =>
      Promise.all([
        prisma.blogPost.findMany({
          where: {
            isPublished: true,
            slug: { not: slug },
            category: article.category,
          },
          take: 2,
          orderBy: { publishedAt: "desc" },
          select: {
            id: true,
            title: true,
            slug: true,
            excerpt: true,
            coverImage: true,
            category: true,
            publishedAt: true,
            readTimeMinutes: true,
          },
        }),
        prisma.product.findMany({
          where: {
            isAvailable: true,
          },
          take: 3,
          include: {
            category: true,
          },
          orderBy: { isFeatured: "desc" },
        }),
      ])
    );

    const result = {
      success: true,
      article,
      relatedArticles,
      recommendedProducts,
    };

    setCached(cacheKey, result, 300, ["blog"]);

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    console.error("Error fetching article by slug:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load article" },
      { status: 500 }
    );
  }
}
