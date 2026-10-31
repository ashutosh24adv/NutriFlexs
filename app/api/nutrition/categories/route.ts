import { NextResponse } from "next/server";
import { getFoodCategories } from "@/services/nutrition.service";

export async function GET() {
  try {
    const categories = await getFoodCategories();
    return NextResponse.json({
      success: true,
      categories: ["All", "NutriFlexs Menu", ...categories],
    });
  } catch (error: any) {
    console.error("Error fetching food categories:", error);
    return NextResponse.json(
      { success: false, error: "Unable to load food categories. Please try again." },
      { status: 500 }
    );
  }
}

