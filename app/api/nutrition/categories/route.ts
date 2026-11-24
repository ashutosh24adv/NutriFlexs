import { NextResponse } from "next/server";
import { getFoodCategories } from "@/services/nutrition.service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const categories = await getFoodCategories();
    return NextResponse.json(
      {
        success: true,
        categories: ["All", "NutriFlexs Menu", ...categories],
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch (error: any) {
    console.error("Error fetching food categories:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load food categories. Please try again." },
      { status: 500 }
    );
  }
}

