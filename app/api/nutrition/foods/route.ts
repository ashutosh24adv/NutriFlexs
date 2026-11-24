import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { searchFoodLibrary } from "@/services/nutrition.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") || "25", 10), 100);

    const result = await searchFoodLibrary({
      query,
      category,
      userId,
      page,
      limit,
    });

    return NextResponse.json(
      {
        success: true,
        ...result,
      },
      {
        headers: !userId
          ? {
              "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
            }
          : undefined,
      }
    );
  } catch (error: any) {
    console.error("Error searching food library:", error);
    return NextResponse.json(
      { success: false, error: "Unable to search foods from database. Please try again." },
      { status: 500 }
    );
  }
}

