import { NextResponse } from "next/server";
import { getCategories } from "@/services/product.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getCategories();
    return NextResponse.json(
      { success: true, categories },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error("[API /api/categories] Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Categories are temporarily unavailable. Please retry in a moment." },
      { status: 503 }
    );
  }
}
