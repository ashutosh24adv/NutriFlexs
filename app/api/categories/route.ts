import { NextResponse } from "next/server";
import { getCategories } from "@/services/product.service";

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
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
