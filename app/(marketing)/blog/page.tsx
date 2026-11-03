import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  Calendar,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  MapPin,
  Utensils,
  BookOpen,
  CheckCircle2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Blog & Nutrition Insights | NutriFlexs",
  description:
    "Explore dietitian-backed fitness nutrition articles, post-workout recovery science, cold-pressed hydration guides, and clean eating habits from NutriFlexs.",
  openGraph: {
    title: "Blog & Nutrition Insights | NutriFlexs",
    description:
      "Explore dietitian-backed fitness nutrition articles, post-workout recovery science, and clean eating habits.",
    url: "https://nutriflexs.com/blog",
    siteName: "NutriFlexs",
    type: "website",
  },
};

interface BlogPageProps {
  searchParams?: {
    page?: string;
    category?: string;
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const currentPage = Math.max(1, parseInt(searchParams?.page || "1", 10));
  const selectedCategory = searchParams?.category || "All";
  const limit = 4;
  const skip = (currentPage - 1) * limit;

  const whereClause: any = {
    isPublished: true,
  };

  if (selectedCategory && selectedCategory !== "All") {
    whereClause.category = selectedCategory;
  }

  // Fetch articles, total count, recent articles, categories, and featured products from Neon PostgreSQL
  const [articles, totalCount, recentArticles, categoriesRaw, featuredProducts] =
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
      prisma.blogPost.groupBy({
        by: ["category"],
        where: { isPublished: true },
        _count: { id: true },
      }),
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

  const totalPages = Math.ceil(totalCount / limit);
  const categories = categoriesRaw.map((c) => ({
    name: c.category,
    count: c._count.id,
  }));

  const totalAllArticles = categoriesRaw.reduce((acc, c) => acc + c._count.id, 0);

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  }

  return (
    <div className="min-h-screen bg-nutri-bg pb-20">
      {/* ============================================================== */}
      {/* HEADER SECTION                                                 */}
      {/* ============================================================== */}
      <section className="bg-gradient-to-b from-[#F3F7EE] to-nutri-bg border-b border-nutri-border py-12 sm:py-16">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 space-y-4 text-center">
          <Badge
            variant="gold"
            className="bg-nutri-green-light text-nutri-green border-nutri-green-soft font-extrabold text-xs px-3.5 py-1 inline-flex items-center gap-1.5 shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-nutri-green shrink-0" />
            NUTRIFLEXS JOURNAL
          </Badge>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold font-heading text-nutri-charcoal tracking-tight">
            Fuel for Thought. Science for Sweat.
          </h1>

          <p className="text-sm sm:text-base text-nutri-secondary max-w-2xl mx-auto leading-relaxed">
            Dietitian-backed insights on post-workout recovery, clean hydration, and everyday nutrition
            habits designed to support your active lifestyle.
          </p>

          {/* Quick Category Filter Bar */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
            <Link
              href="/blog"
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
                selectedCategory === "All"
                  ? "bg-nutri-green text-white shadow-sm"
                  : "bg-white text-nutri-charcoal border border-nutri-border hover:border-nutri-green/50"
              }`}
            >
              All Articles ({totalAllArticles})
            </Link>
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.name;
              return (
                <Link
                  key={cat.name}
                  href={`/blog?category=${encodeURIComponent(cat.name)}`}
                  className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
                    isSelected
                      ? "bg-nutri-green text-white shadow-sm"
                      : "bg-white text-nutri-charcoal border border-nutri-border hover:border-nutri-green/50"
                  }`}
                >
                  {cat.name} ({cat.count})
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============================================================== */}
      {/* TWO-COLUMN BLOG CONTENT                                        */}
      {/* ============================================================== */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* ============================================================ */}
          {/* LEFT SIDEBAR (Approx 25-30% width: 4 of 12 columns)           */}
          {/* ============================================================ */}
          <aside className="lg:col-span-4 space-y-6 sm:space-y-8 order-2 lg:order-1">
            {/* Widget 1: Recent Articles */}
            <div className="bg-white rounded-3xl p-6 border border-nutri-border shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-nutri-border-light pb-3">
                <h3 className="font-bold font-heading text-nutri-charcoal text-base flex items-center gap-2">
                  <Clock className="w-4 h-4 text-nutri-green" /> Recent Articles
                </h3>
              </div>

              <div className="space-y-4 divide-y divide-nutri-border-light">
                {recentArticles.map((recent, idx) => (
                  <Link
                    key={recent.id}
                    href={`/blog/${recent.slug}`}
                    className={`group flex items-start gap-3.5 transition-colors cursor-pointer ${
                      idx > 0 ? "pt-3.5" : ""
                    }`}
                  >
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-nutri-green-soft shrink-0 border border-nutri-border">
                      <Image
                        src={recent.coverImage}
                        alt={recent.title}
                        fill
                        sizes="64px"
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-nutri-green tracking-wider block">
                        {recent.category}
                      </span>
                      <h4 className="text-xs font-bold text-nutri-charcoal group-hover:text-nutri-green transition-colors line-clamp-2 leading-snug">
                        {recent.title}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] text-nutri-secondary">
                        <span>{formatDate(recent.publishedAt)}</span>
                        <span>•</span>
                        <span>{recent.readTimeMinutes} min</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Widget 2: Popular Categories */}
            <div className="bg-white rounded-3xl p-6 border border-nutri-border shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-nutri-border-light pb-3">
                <h3 className="font-bold font-heading text-nutri-charcoal text-base flex items-center gap-2">
                  <Layers className="w-4 h-4 text-nutri-green" /> Categories
                </h3>
              </div>

              <div className="space-y-2">
                <Link
                  href="/blog"
                  className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCategory === "All"
                      ? "bg-nutri-green-light text-nutri-green font-bold"
                      : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                  }`}
                >
                  <span>All Categories</span>
                  <span className="text-[11px] font-bold bg-white px-2 py-0.5 rounded-full border border-nutri-border">
                    {totalAllArticles}
                  </span>
                </Link>

                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat.name;
                  return (
                    <Link
                      key={cat.name}
                      href={`/blog?category=${encodeURIComponent(cat.name)}`}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer ${
                        isSelected
                          ? "bg-nutri-green-light text-nutri-green font-bold"
                          : "text-nutri-charcoal hover:bg-nutri-green-soft hover:text-nutri-green"
                      }`}
                    >
                      <span className="truncate pr-2">{cat.name}</span>
                      <span className="text-[11px] font-bold bg-white px-2 py-0.5 rounded-full border border-nutri-border shrink-0">
                        {cat.count}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Widget 3: Featured NutriFlexs Products with Real DB Data */}
            <div className="bg-gradient-to-br from-[#F7FAF4] to-[#EAF4E3]/60 rounded-3xl p-6 border border-nutri-border shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-nutri-border-light pb-3">
                <div>
                  <h3 className="font-bold font-heading text-nutri-charcoal text-base flex items-center gap-1.5">
                    <Utensils className="w-4 h-4 text-nutri-green" /> Featured Fuel
                  </h3>
                  <p className="text-[11px] text-nutri-secondary mt-0.5">
                    Order fresh at your partner gym kiosk
                  </p>
                </div>
              </div>

              <div className="space-y-3.5">
                {featuredProducts.map((prod) => (
                  <div
                    key={prod.id}
                    className="bg-white rounded-2xl p-3 border border-nutri-border flex items-center gap-3 shadow-xs hover:shadow-sm transition-shadow"
                  >
                    <div className="relative w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-nutri-border-light bg-nutri-green-soft">
                      <Image
                        src={prod.imageUrl}
                        alt={prod.name}
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-extrabold text-nutri-charcoal truncate">
                        {prod.name}
                      </h4>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-nutri-green bg-nutri-green-light px-1.5 py-0.5 rounded">
                          {prod.protein}g Protein
                        </span>
                        <span className="text-xs font-black text-nutri-charcoal">
                          {formatPrice(prod.price)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                <Link
                  href="/menu"
                  className="block w-full py-2.5 text-center text-xs font-bold bg-white hover:bg-nutri-green-soft text-nutri-green border border-nutri-green/40 rounded-full transition-colors shadow-xs"
                >
                  Explore Full Menu →
                </Link>
              </div>
            </div>

            {/* Widget 4: Kiosk Pickup Guarantee Card */}
            <div className="bg-[#1E3A1E] text-white rounded-3xl p-6 shadow-md border border-nutri-green-dark space-y-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-emerald-300">
                <MapPin className="w-5 h-5" />
              </div>
              <h4 className="font-heading font-extrabold text-base text-white">
                5-Min Kiosk Pickup
              </h4>
              <p className="text-xs text-nutri-green-light leading-relaxed">
                NutriFlexs express kiosks are positioned 50–100m outside partner gyms for instant,
                sweat-free post-workout refuels.
              </p>
              <Link
                href="/gyms"
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-emerald-300 hover:text-white pt-1 transition-colors"
              >
                <span>Find Nearby Gyms</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>

          {/* ============================================================ */}
          {/* MAIN ARTICLE FEED (Approx 70-75% width: 8 of 12 columns)     */}
          {/* ============================================================ */}
          <main className="lg:col-span-8 space-y-10 order-1 lg:order-2">
            {articles.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-nutri-border space-y-4">
                <BookOpen className="w-12 h-12 text-nutri-secondary/50 mx-auto" />
                <h3 className="text-xl font-bold font-heading text-nutri-charcoal">
                  No articles found in this category
                </h3>
                <p className="text-xs text-nutri-secondary">
                  Check back soon or browse all articles from the journal.
                </p>
                <Link
                  href="/blog"
                  className="inline-flex items-center gap-2 bg-nutri-green text-white px-5 py-2.5 rounded-full text-xs font-bold"
                >
                  Browse All Articles
                </Link>
              </div>
            ) : (
              articles.map((article, index) => (
                <article
                  key={article.id}
                  className="bg-white rounded-3xl overflow-hidden border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 group"
                >
                  {/* Large Landscape Cover Image */}
                  <Link href={`/blog/${article.slug}`} className="block relative w-full aspect-[16/9] sm:aspect-[2/1] overflow-hidden bg-nutri-green-soft">
                    <Image
                      src={article.coverImage}
                      alt={article.title}
                      fill
                      priority={index === 0}
                      sizes="(max-width: 1024px) 100vw, 66vw"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                    
                    {/* Floating Category Badge */}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="bg-white/95 backdrop-blur-md text-nutri-green font-extrabold text-[11px] uppercase tracking-wider px-3.5 py-1 rounded-full shadow-sm border border-white/60">
                        {article.category}
                      </span>
                    </div>
                  </Link>

                  {/* Article Content Body */}
                  <div className="p-6 sm:p-8 space-y-4">
                    {/* Metadata Header */}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-nutri-secondary font-medium">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-nutri-green" />
                        {formatDate(article.publishedAt)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-nutri-green" />
                        {article.readTimeMinutes} min read
                      </span>
                      <span>•</span>
                      <span className="font-semibold text-nutri-charcoal">
                        By {article.authorName}
                      </span>
                    </div>

                    {/* Title */}
                    <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-nutri-charcoal group-hover:text-nutri-green transition-colors leading-tight">
                      <Link href={`/blog/${article.slug}`}>
                        {article.title}
                      </Link>
                    </h2>

                    {/* Excerpt */}
                    <p className="text-sm sm:text-base text-nutri-secondary leading-relaxed font-normal">
                      {article.excerpt}
                    </p>

                    {/* Read More Action */}
                    <div className="pt-2 flex items-center justify-between border-t border-nutri-border-light">
                      <Link
                        href={`/blog/${article.slug}`}
                        className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-nutri-green hover:text-nutri-green-dark group-hover:translate-x-1 transition-all py-1"
                      >
                        <span>Read Full Article</span>
                        <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                      </Link>

                      {/* Tag preview */}
                      {article.tags.length > 0 && (
                        <div className="hidden sm:flex items-center gap-1.5">
                          {article.tags.slice(0, 3).map((tag: string) => (
                            <span
                              key={tag}
                              className="text-[10px] font-semibold text-nutri-secondary bg-nutri-bg px-2.5 py-0.5 rounded-full border border-nutri-border"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              ))
            )}

            {/* ============================================================ */}
            {/* PAGINATION (Connected to Actual Backend Data)               */}
            {/* ============================================================ */}
            {totalPages > 1 && (
              <div className="pt-6 border-t border-nutri-border flex items-center justify-between">
                {/* Previous Button */}
                {currentPage > 1 ? (
                  <Link
                    href={`/blog?page=${currentPage - 1}${
                      selectedCategory !== "All"
                        ? `&category=${encodeURIComponent(selectedCategory)}`
                        : ""
                    }`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-white text-nutri-charcoal border border-nutri-border hover:bg-nutri-green-soft hover:text-nutri-green transition-colors shadow-xs"
                  >
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed">
                    <ChevronLeft className="w-4 h-4" /> Previous
                  </span>
                )}

                {/* Page Number Pills */}
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => {
                    const isCurrent = pageNum === currentPage;
                    return (
                      <Link
                        key={pageNum}
                        href={`/blog?page=${pageNum}${
                          selectedCategory !== "All"
                            ? `&category=${encodeURIComponent(selectedCategory)}`
                            : ""
                        }`}
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-extrabold transition-all ${
                          isCurrent
                            ? "bg-nutri-green text-white shadow-sm"
                            : "bg-white text-nutri-charcoal border border-nutri-border hover:border-nutri-green/50"
                        }`}
                      >
                        {pageNum}
                      </Link>
                    );
                  })}
                </div>

                {/* Next Button */}
                {currentPage < totalPages ? (
                  <Link
                    href={`/blog?page=${currentPage + 1}${
                      selectedCategory !== "All"
                        ? `&category=${encodeURIComponent(selectedCategory)}`
                        : ""
                    }`}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-white text-nutri-charcoal border border-nutri-border hover:bg-nutri-green-soft hover:text-nutri-green transition-colors shadow-xs"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed">
                    Next <ChevronRight className="w-4 h-4" />
                  </span>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

