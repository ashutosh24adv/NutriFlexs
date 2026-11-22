import { NextResponse } from "next/server";
import { getProducts } from "@/services/product.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") || undefined;
  const categorySlug = searchParams.get("categorySlug") || undefined;
  const search = searchParams.get("search") || undefined;
  const isVeg = searchParams.get("isVeg") === "true" ? true : searchParams.get("isVeg") === "false" ? false : undefined;
  const isPopular = searchParams.get("isPopular") === "true" ? true : undefined;
  const dietGoal = searchParams.get("dietGoal") || undefined;

  try {
    const rawProducts = await getProducts({ categoryId, categorySlug, search, isVeg, isPopular, dietGoal });
    const products = rawProducts.map((p: any) => ({
      ...p,
      dietGoals: Array.isArray(p.dietGoals) ? p.dietGoals.map((dg: any) => dg.goal || dg) : [],
    }));
    return NextResponse.json(
      { success: true, products },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error("[API /api/products] Error fetching products:", error);
    return NextResponse.json(
      { success: false, error: "Our nutrition menu is temporarily unavailable. Please retry in a moment." },
      { status: 503 }
    );
  }
}
