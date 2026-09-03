import { NextResponse } from "next/server";
import { getProducts } from "@/services/product.service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") || undefined;
  const categorySlug = searchParams.get("categorySlug") || undefined;
  const search = searchParams.get("search") || undefined;
  const isVeg = searchParams.get("isVeg") === "true" ? true : searchParams.get("isVeg") === "false" ? false : undefined;
  const isPopular = searchParams.get("isPopular") === "true" ? true : undefined;

  try {
    const products = await getProducts({ categoryId, categorySlug, search, isVeg, isPopular });
    return NextResponse.json({ success: true, products });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
