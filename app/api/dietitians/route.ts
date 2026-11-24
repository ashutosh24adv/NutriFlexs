import { NextRequest, NextResponse } from "next/server";
import { getVerifiedDietitians } from "@/services/dietitian.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const specialization = searchParams.get("specialization") || undefined;
    const language = searchParams.get("language") || undefined;
    const maxFee = searchParams.get("maxFee") ? Number(searchParams.get("maxFee")) : undefined;
    const minExperience = searchParams.get("minExperience") ? Number(searchParams.get("minExperience")) : undefined;

    const dietitians = await getVerifiedDietitians({
      search,
      specialization,
      language,
      maxFee,
      minExperience,
    });

    return NextResponse.json(
      {
        success: true,
        dietitians,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error("[API /api/dietitians] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load verified dietitians. Please try again." },
      { status: 500 }
    );
  }
}
