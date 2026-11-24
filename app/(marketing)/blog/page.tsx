import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import {
  Clock,
  Sparkles,
  Layers,
  MapPin,
  Utensils,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { getBlogPosts, getBlogSidebarData } from "@/services/blog.service";
import { BlogFeed } from "@/components/blog/blog-feed";

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

  let articles: any[] = [];
  let totalCount = 0;
  let recentArticles: any[] = [];
  let categories: { name: string; count: number }[] = [];
  let featuredProducts: any[] = [];
  let totalAllArticles = 0;
  let dbError = false;

  try {
    const [postsData, sidebarData] = await Promise.all([
      getBlogPosts({
        category: selectedCategory,
        page: currentPage,
        limit,
      }),
      getBlogSidebarData(),
    ]);

    articles = postsData.articles;
    totalCount = postsData.totalCount;
    recentArticles = sidebarData.recentArticles;
    categories = sidebarData.categories;
    featuredProducts = sidebarData.featuredProducts;
    totalAllArticles = sidebarData.totalAllArticles;
  } catch (err: any) {
    console.error("[BlogPage] Error loading blog from database:", err);
    dbError = true;
  }

  if (dbError) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 bg-nutri-bg">
        <div className="max-w-md w-full bg-white border border-nutri-border rounded-3xl p-8 text-center shadow-xs space-y-4 my-8">
          <div className="w-12 h-12 rounded-full bg-amber-50 border border-amber-200 text-amber-700 mx-auto flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h2 className="text-lg font-bold font-heading text-nutri-charcoal">
              Journal Insights Momentarily Unavailable
            </h2>
            <p className="text-xs text-nutri-secondary leading-relaxed">
              We were unable to load nutrition insights from our database. This usually resolves in a few moments.
            </p>
          </div>
          <Link
            href="/blog"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-nutri-green text-white hover:bg-nutri-green-dark text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            Refresh Articles
          </Link>
        </div>
      </div>
    );
  }

  function formatDate(date: Date | string) {
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
        </div>
      </section>

      {/* ============================================================== */}
      {/* TWO-COLUMN BLOG CONTENT                                        */}
      {/* ============================================================== */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT SIDEBAR (Approx 25-30% width: 4 of 12 columns) */}
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

            {/* Widget 3: Featured NutriFlexs Products */}
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
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-nutri-green-light">
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
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-nutri-green-light hover:text-white pt-1 transition-colors"
              >
                <span>Find Nearby Gyms</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </aside>

          {/* MAIN ARTICLE FEED WITH INSTANT CLIENT-SIDE FILTERING */}
          <BlogFeed
            initialArticles={articles}
            initialTotalCount={totalCount}
            initialCurrentPage={currentPage}
            initialCategory={selectedCategory}
            categories={categories}
            totalAllArticles={totalAllArticles}
            limit={limit}
          />
        </div>
      </div>
    </div>
  );
}
