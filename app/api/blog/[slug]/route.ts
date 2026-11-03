import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;

    const article = await prisma.blogPost.findUnique({
      where: { slug },
    });

    if (!article || !article.isPublished) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Related articles (same category or recent, excluding current)
    const relatedArticles = await prisma.blogPost.findMany({
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
    });

    // If less than 2 related in same category, supplement with recent
    let finalRelated = [...relatedArticles];
    if (finalRelated.length < 2) {
      const extra = await prisma.blogPost.findMany({
        where: {
          isPublished: true,
          slug: { notIn: [slug, ...finalRelated.map((r) => r.slug)] },
        },
        take: 2 - finalRelated.length,
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
      });
      finalRelated = [...finalRelated, ...extra];
    }

    // Recommended NutriFlexs products (e.g. popular or featured items)
    const recommendedProducts = await prisma.product.findMany({
      where: {
        isAvailable: true,
      },
      take: 3,
      include: {
        category: true,
      },
      orderBy: { isFeatured: "desc" },
    });

    return NextResponse.json({
      success: true,
      article,
      relatedArticles: finalRelated,
      recommendedProducts,
    });
  } catch (error) {
    console.error("Error fetching article by slug:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load article" },
      { status: 500 }
    );
  }
}

