import React, { Suspense } from "react";
import { getCategories, getProducts } from "@/services/product.service";
import { MenuClient } from "@/components/customer/menu-client";

export const dynamic = "force-dynamic";

export default async function MenuPage() {
  let initialProducts: any[] = [];
  let initialCategories: any[] = [];

  try {
    const [rawProducts, categories] = await Promise.all([
      getProducts(),
      getCategories(),
    ]);

    initialProducts = rawProducts.map((p: any) => ({
      ...p,
      dietGoals: Array.isArray(p.dietGoals)
        ? p.dietGoals.map((dg: any) => dg.goal || dg)
        : [],
    }));
    initialCategories = categories;
  } catch (err) {
    // Graceful fallback: MenuClient will fetch via API and offer Retry if DB is waking up
    console.error("[MenuPage SSR] Failed to preload menu:", err);
  }

  return (
    <Suspense
      fallback={
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="h-10 w-64 rounded-xl bg-[#EAF4E3]/60 animate-pulse mb-6" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-64 rounded-3xl bg-white border border-nutri-border animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <MenuClient
        initialProducts={initialProducts}
        initialCategories={initialCategories}
      />
    </Suspense>
  );
}
