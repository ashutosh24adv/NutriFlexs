"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Sparkles,
} from "lucide-react";

interface ArticleItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  coverImage: string;
  category: string;
  authorName: string;
  authorRole?: string | null;
  authorAvatar?: string | null;
  readTimeMinutes: number;
  publishedAt: string | Date;
  tags: string[];
}

interface CategoryCount {
  name: string;
  count: number;
}

interface BlogFeedProps {
  initialArticles: ArticleItem[];
  initialTotalCount: number;
  initialCurrentPage: number;
  initialCategory: string;
  categories: CategoryCount[];
  totalAllArticles: number;
  limit?: number;
}

// Client-side cache to make back/forth category switching instantaneous (0ms)
const clientCategoryCache = new Map<string, { articles: ArticleItem[]; totalCount: number; totalPages: number }>();

export function BlogFeed({
  initialArticles,
  initialTotalCount,
  initialCurrentPage,
  initialCategory,
  categories,
  totalAllArticles,
  limit = 4,
}: BlogFeedProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || "All");
  const [currentPage, setCurrentPage] = useState<number>(initialCurrentPage || 1);
  const [articles, setArticles] = useState<ArticleItem[]>(initialArticles);
  const [totalCount, setTotalCount] = useState<number>(initialTotalCount);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [, startTransition] = useTransition();

  // Populate cache with initial data
  useEffect(() => {
    const key = `${initialCategory || "All"}_p${initialCurrentPage || 1}`;
    clientCategoryCache.set(key, {
      articles: initialArticles,
      totalCount: initialTotalCount,
      totalPages: Math.ceil(initialTotalCount / limit),
    });
  }, [initialArticles, initialTotalCount, initialCurrentPage, initialCategory, limit]);

  // Synchronize state with browser URL changes (e.g. Back / Forward button)
  useEffect(() => {
    const urlCategory = searchParams.get("category") || "All";
    const urlPage = parseInt(searchParams.get("page") || "1", 10);

    if (urlCategory !== selectedCategory || urlPage !== currentPage) {
      handleCategorySwitch(urlCategory, urlPage, false);
    }
  }, [searchParams]);

  const fetchArticles = useCallback(
    async (category: string, page: number, updateUrl = true) => {
      const cacheKey = `${category}_p${page}`;
      const cached = clientCategoryCache.get(cacheKey);

      // Instant optimistic UI update
      setSelectedCategory(category);
      setCurrentPage(page);

      if (updateUrl) {
        const params = new URLSearchParams();
        if (category !== "All") params.set("category", category);
        if (page > 1) params.set("page", String(page));
        const newUrl = params.toString() ? `/blog?${params.toString()}` : "/blog";
        window.history.pushState(null, "", newUrl);
      }

      // If cached in memory, switch instantly with 0 network delay
      if (cached) {
        startTransition(() => {
          setArticles(cached.articles);
          setTotalCount(cached.totalCount);
          setIsLoading(false);
        });
        return;
      }

      setIsLoading(true);
      try {
        const queryParams = new URLSearchParams();
        if (category !== "All") queryParams.set("category", category);
        queryParams.set("page", String(page));
        queryParams.set("limit", String(limit));

        const res = await fetch(`/api/blog?${queryParams.toString()}`);
        const data = await res.json();

        if (data.success && Array.isArray(data.articles)) {
          clientCategoryCache.set(cacheKey, {
            articles: data.articles,
            totalCount: data.totalCount,
            totalPages: data.totalPages,
          });

          startTransition(() => {
            setArticles(data.articles);
            setTotalCount(data.totalCount);
          });
        }
      } catch (err) {
        console.error("Failed to load blog category data:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [limit]
  );

  const handleCategorySwitch = (category: string, page = 1, updateUrl = true) => {
    fetchArticles(category, page, updateUrl);
  };

  const totalPages = Math.ceil(totalCount / limit);

  function formatDate(date: string | Date) {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(new Date(date));
  }

  return (
    <>
      {/* Category Filter Pill Bar */}
      <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
        <button
          onClick={() => handleCategorySwitch("All", 1)}
          className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
            selectedCategory === "All"
              ? "bg-nutri-green text-white shadow-sm ring-2 ring-nutri-green/30"
              : "bg-white text-nutri-charcoal border border-nutri-border hover:border-nutri-green/50 active:scale-95"
          }`}
          aria-pressed={selectedCategory === "All"}
        >
          All Articles ({totalAllArticles})
        </button>

        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.name;
          return (
            <button
              key={cat.name}
              onClick={() => handleCategorySwitch(cat.name, 1)}
              className={`text-xs font-bold px-4 py-2 rounded-full transition-all cursor-pointer ${
                isSelected
                  ? "bg-nutri-green text-white shadow-sm ring-2 ring-nutri-green/30"
                  : "bg-white text-nutri-charcoal border border-nutri-border hover:border-nutri-green/50 active:scale-95"
              }`}
              aria-pressed={isSelected}
            >
              {cat.name} ({cat.count})
            </button>
          );
        })}
      </div>

      {/* Main Feed Content Area */}
      <main className="lg:col-span-8 space-y-10 order-1 lg:order-2">
        {isLoading ? (
          // Skeletons during category loading
          <div className="space-y-8 animate-pulse">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-3xl overflow-hidden border border-nutri-border shadow-card"
              >
                <div className="w-full aspect-[16/9] sm:aspect-[2/1] bg-gray-100" />
                <div className="p-6 sm:p-8 space-y-4">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-7 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-nutri-border space-y-4">
            <BookOpen className="w-12 h-12 text-nutri-secondary/50 mx-auto" />
            <h3 className="text-xl font-bold font-heading text-nutri-charcoal">
              No articles found in this category
            </h3>
            <p className="text-xs text-nutri-secondary">
              Check back soon or browse all articles from the journal.
            </p>
            <button
              onClick={() => handleCategorySwitch("All", 1)}
              className="inline-flex items-center gap-2 bg-nutri-green text-white px-5 py-2.5 rounded-full text-xs font-bold cursor-pointer hover:bg-nutri-green-dark transition-colors"
            >
              Browse All Articles
            </button>
          </div>
        ) : (
          articles.map((article, index) => (
            <article
              key={article.id}
              className="bg-white rounded-3xl overflow-hidden border border-nutri-border shadow-card hover:shadow-float transition-all duration-300 group"
            >
              {/* Large Landscape Cover Image with Next.js Optimization */}
              <Link
                href={`/blog/${article.slug}`}
                className="block relative w-full aspect-[16/9] sm:aspect-[2/1] overflow-hidden bg-nutri-green-soft"
              >
                <Image
                  src={article.coverImage}
                  alt={article.title}
                  fill
                  priority={index === 0 && currentPage === 1}
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
                  <Link href={`/blog/${article.slug}`}>{article.title}</Link>
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
                  {article.tags && article.tags.length > 0 && (
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

        {/* PAGINATION with instant client navigation */}
        {totalPages > 1 && (
          <div className="pt-6 border-t border-nutri-border flex items-center justify-between">
            {/* Previous Button */}
            {currentPage > 1 ? (
              <button
                onClick={() => handleCategorySwitch(selectedCategory, currentPage - 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-white text-nutri-charcoal border border-nutri-border hover:bg-nutri-green-soft hover:text-nutri-green transition-colors shadow-xs cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
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
                  <button
                    key={pageNum}
                    onClick={() => handleCategorySwitch(selectedCategory, pageNum)}
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-xs font-extrabold transition-all cursor-pointer ${
                      isCurrent
                        ? "bg-nutri-green text-white shadow-sm ring-2 ring-nutri-green/30"
                        : "bg-white text-nutri-charcoal border border-nutri-border hover:border-nutri-green/50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            {currentPage < totalPages ? (
              <button
                onClick={() => handleCategorySwitch(selectedCategory, currentPage + 1)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-white text-nutri-charcoal border border-nutri-border hover:bg-nutri-green-soft hover:text-nutri-green transition-colors shadow-xs cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-xs font-bold bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed">
                Next <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </div>
        )}
      </main>
    </>
  );
}
