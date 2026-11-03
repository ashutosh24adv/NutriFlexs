import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  Clock,
  Calendar,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  User,
  Share2,
  Utensils,
  Sparkles,
  CheckCircle2,
  MapPin,
  Bookmark,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

interface ArticlePageProps {
  params: {
    slug: string;
  };
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const article = await prisma.blogPost.findUnique({
    where: { slug: params.slug },
  });

  if (!article) {
    return {
      title: "Article Not Found | NutriFlexs",
    };
  }

  return {
    title: `${article.title} | NutriFlexs Blog`,
    description: article.excerpt,
    openGraph: {
      title: `${article.title} | NutriFlexs`,
      description: article.excerpt,
      images: [{ url: article.coverImage }],
      type: "article",
      publishedTime: article.publishedAt.toISOString(),
      authors: [article.authorName],
    },
  };
}

export default async function ArticleDetailPage({ params }: ArticlePageProps) {
  const { slug } = params;

  const article = await prisma.blogPost.findUnique({
    where: { slug },
  });

  if (!article || !article.isPublished) {
    notFound();
  }

  // Related articles (same category or recent, excluding current)
  const relatedArticles = await prisma.blogPost.findMany({
    where: {
      isPublished: true,
      slug: { not: slug },
    },
    take: 2,
    orderBy: { publishedAt: "desc" },
  });

  // Featured NutriFlexs products
  const recommendedProducts = await prisma.product.findMany({
    where: {
      isAvailable: true,
      isFeatured: true,
    },
    take: 3,
    include: {
      category: true,
    },
    orderBy: { price: "asc" },
  });

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  }

  // Simple Markdown renderer for headings and paragraphs
  const renderFormattedContent = (content: string) => {
    const lines = content.trim().split("\n");
    const elements: React.ReactNode[] = [];
    let currentParagraph: string[] = [];

    const flushParagraph = (key: string) => {
      if (currentParagraph.length > 0) {
        const text = currentParagraph.join(" ").trim();
        if (text) {
          elements.push(
            <p key={key} className="text-base sm:text-lg text-nutri-secondary leading-relaxed font-normal">
              {text}
            </p>
          );
        }
        currentParagraph = [];
      }
    };

    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) {
        flushParagraph(`p-${idx}`);
        return;
      }

      if (trimmed.startsWith("### ")) {
        flushParagraph(`before-h3-${idx}`);
        elements.push(
          <h3
            key={`h3-${idx}`}
            className="text-xl sm:text-2xl font-bold font-heading text-nutri-charcoal pt-6 pb-2"
          >
            {trimmed.replace("### ", "")}
          </h3>
        );
      } else if (trimmed.startsWith("## ")) {
        flushParagraph(`before-h2-${idx}`);
        elements.push(
          <h2
            key={`h2-${idx}`}
            className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal pt-8 pb-3"
          >
            {trimmed.replace("## ", "")}
          </h2>
        );
      } else if (trimmed.startsWith("- ")) {
        flushParagraph(`before-li-${idx}`);
        elements.push(
          <div key={`li-${idx}`} className="flex items-start gap-2.5 my-1.5 pl-2 text-sm sm:text-base text-nutri-secondary">
            <CheckCircle2 className="w-4 h-4 text-nutri-green shrink-0 mt-1" />
            <span>{trimmed.replace("- ", "")}</span>
          </div>
        );
      } else if (trimmed.match(/^\d+\.\s/)) {
        flushParagraph(`before-ol-${idx}`);
        elements.push(
          <div key={`ol-${idx}`} className="flex items-start gap-2.5 my-1.5 pl-2 text-sm sm:text-base text-nutri-secondary">
            <span className="w-5 h-5 rounded-full bg-nutri-green-light text-nutri-green text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
              {trimmed.split(".")[0]}
            </span>
            <span>{trimmed.replace(/^\d+\.\s/, "")}</span>
          </div>
        );
      } else {
        currentParagraph.push(trimmed);
      }
    });

    flushParagraph("final-p");
    return elements;
  };

  return (
    <div className="min-h-screen bg-nutri-bg pb-24">
      {/* ============================================================== */}
      {/* BREADCRUMBS & ARTICLE HEADER                                    */}
      {/* ============================================================== */}
      <div className="bg-gradient-to-b from-[#F3F7EE] to-nutri-bg border-b border-nutri-border py-8 sm:py-12">
        <div className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          {/* Breadcrumb Navigation */}
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs font-semibold text-nutri-secondary">
            <Link href="/" className="hover:text-nutri-green transition-colors">
              Home
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-nutri-border" />
            <Link href="/blog" className="hover:text-nutri-green transition-colors">
              Blog
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-nutri-border" />
            <Link
              href={`/blog?category=${encodeURIComponent(article.category)}`}
              className="text-nutri-green font-bold hover:underline"
            >
              {article.category}
            </Link>
          </nav>

          {/* Category Badge & Read Time */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-nutri-green-light text-nutri-green font-extrabold text-xs uppercase tracking-wider px-3.5 py-1 rounded-full border border-nutri-green-soft">
              {article.category}
            </span>
            <span className="text-xs text-nutri-secondary flex items-center gap-1.5 font-medium">
              <Clock className="w-3.5 h-3.5 text-nutri-green" />
              {article.readTimeMinutes} min read
            </span>
          </div>

          {/* Article Title */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight leading-[1.12]">
            {article.title}
          </h1>

          {/* Author & Publication Metadata */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-nutri-border-light text-xs sm:text-sm text-nutri-secondary">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-nutri-green text-white flex items-center justify-center font-extrabold shadow-sm shrink-0">
                <User className="w-5 h-5" />
              </div>
              <div>
                <p className="font-bold text-nutri-charcoal text-sm leading-tight">
                  {article.authorName}
                </p>
                <p className="text-xs text-nutri-secondary">{article.authorRole || "Nutrition Specialist"}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-nutri-green" />
                {formatDate(article.publishedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* COVER IMAGE & ARTICLE BODY                                      */}
      {/* ============================================================== */}
      <article className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 space-y-8">
        {/* Large Landscape Cover Image */}
        <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] rounded-3xl sm:rounded-4xl overflow-hidden shadow-float border border-nutri-border bg-nutri-green-soft">
          <Image
            src={article.coverImage}
            alt={article.title}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 960px"
            className="object-cover"
          />
        </div>

        {/* Lead Excerpt Callout */}
        <div className="p-6 sm:p-7 rounded-3xl bg-[#F7FAF4] border border-nutri-border border-l-4 border-l-nutri-green shadow-xs">
          <p className="text-base sm:text-lg font-medium text-nutri-charcoal italic leading-relaxed">
            &ldquo;{article.excerpt}&rdquo;
          </p>
        </div>

        {/* Formatted Content */}
        <div className="space-y-4 pt-2">
          {renderFormattedContent(article.content)}
        </div>

        {/* Article Tags */}
        {article.tags.length > 0 && (
          <div className="pt-6 border-t border-nutri-border flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-nutri-secondary mr-1">Tags:</span>
            {article.tags.map((tag: string) => (
              <span
                key={tag}
                className="text-xs font-semibold text-nutri-green bg-nutri-green-light px-3 py-1 rounded-full border border-nutri-green-soft"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Back to Blog Action */}
        <div className="pt-4 flex items-center justify-between">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-nutri-green hover:underline cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to All Articles
          </Link>
        </div>
      </article>

      {/* ============================================================== */}
      {/* RELEVANT NUTRIFLEXS PRODUCT RECOMMENDATIONS                    */}
      {/* ============================================================== */}
      <section className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 pt-16">
        <div className="bg-gradient-to-br from-[#F7FAF4] to-[#EAF4E3]/60 rounded-3xl p-6 sm:p-8 border border-nutri-border shadow-card space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-nutri-border-light pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-4 h-4 text-nutri-green" />
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-nutri-green">
                  Fuel Recommended For This Routine
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                Refuel Clean at NutriFlexs Kiosks
              </h3>
            </div>
            <Link
              href="/menu"
              className="text-xs font-extrabold text-nutri-green hover:underline inline-flex items-center gap-1 shrink-0"
            >
              <span>Explore Full Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {recommendedProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-white rounded-2xl p-4 border border-nutri-border flex flex-col justify-between shadow-xs hover:shadow-md transition-shadow group"
              >
                <div className="space-y-3">
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden bg-nutri-green-soft">
                    <Image
                      src={prod.imageUrl}
                      alt={prod.name}
                      fill
                      sizes="200px"
                      className="object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-nutri-charcoal group-hover:text-nutri-green transition-colors line-clamp-1">
                      {prod.name}
                    </h4>
                    <p className="text-[11px] text-nutri-secondary line-clamp-2 mt-0.5">
                      {prod.description}
                    </p>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t border-nutri-border-light flex items-center justify-between">
                  <span className="text-[11px] font-bold text-nutri-green bg-nutri-green-light px-2 py-0.5 rounded-full">
                    {prod.protein}g Protein
                  </span>
                  <span className="text-sm font-black text-nutri-charcoal">
                    {formatPrice(prod.price)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* RELATED ARTICLES                                               */}
      {/* ============================================================== */}
      {relatedArticles.length > 0 && (
        <section className="max-w-[960px] mx-auto px-4 sm:px-6 lg:px-8 pt-16">
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-nutri-border pb-3">
              <h3 className="text-xl sm:text-2xl font-extrabold font-heading text-nutri-charcoal">
                Related Articles
              </h3>
              <Link
                href="/blog"
                className="text-xs font-bold text-nutri-green hover:underline inline-flex items-center gap-1"
              >
                <span>View All Articles</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {relatedArticles.map((related) => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="bg-white rounded-3xl overflow-hidden border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 group flex flex-col justify-between"
                >
                  <div className="relative w-full aspect-[16/9] overflow-hidden bg-nutri-green-soft">
                    <Image
                      src={related.coverImage}
                      alt={related.title}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/95 backdrop-blur-md text-nutri-green font-extrabold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-xs">
                        {related.category}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 sm:p-6 space-y-2 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-[11px] text-nutri-secondary">
                        {formatDate(related.publishedAt)} • {related.readTimeMinutes} min read
                      </span>
                      <h4 className="text-base sm:text-lg font-bold font-heading text-nutri-charcoal group-hover:text-nutri-green transition-colors leading-snug mt-1">
                        {related.title}
                      </h4>
                      <p className="text-xs text-nutri-secondary line-clamp-2 mt-1">
                        {related.excerpt}
                      </p>
                    </div>

                    <div className="pt-2 text-xs font-extrabold text-nutri-green inline-flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      <span>Read Article</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

