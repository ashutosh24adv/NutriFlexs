import { NextRequest, NextResponse } from "next/server";
import { getKitchenAuthContext } from "@/lib/kitchen-auth";
import { getKitchenMovements } from "@/services/kitchen-inventory.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedOutletId = searchParams.get("outletId");
    const movementType = searchParams.get("movementType") || undefined;
    const ingredientId = searchParams.get("ingredientId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const auth = await getKitchenAuthContext(requestedOutletId);
    if (auth.error || !auth.context) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const { outletId } = auth.context;
    const result = await getKitchenMovements({
      outletId,
      movementType,
      ingredientId,
      startDate,
      endDate,
      page,
      limit,
    });

    return NextResponse.json({
      success: true,
      outletId,
      outletName: auth.context.outletName,
      ...result,
    });
  } catch (error: any) {
    console.error("Error fetching stock movements:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load stock movements." },
      { status: 500 }
    );
  }
}
