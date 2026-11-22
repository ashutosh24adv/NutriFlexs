import { NextRequest, NextResponse } from "next/server";
import { getDietitianById } from "@/services/dietitian.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const dietitian = await getDietitianById(id);

    if (!dietitian) {
      return NextResponse.json(
        { success: false, error: "Dietitian profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      dietitian,
    });
  } catch (error: any) {
    console.error(`[API /api/dietitians/${params.id}] Error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to load dietitian profile." },
      { status: 500 }
    );
  }
}
