import { NextRequest, NextResponse } from "next/server";
import { getKitchenAuthContext } from "@/lib/kitchen-auth";
import { adjustKitchenStock } from "@/services/kitchen-inventory.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestedOutletId, inventoryItemId, adjustmentType, quantity, reason } = body;

    const auth = await getKitchenAuthContext(requestedOutletId);
    if (auth.error || !auth.context) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const { outletId, userId } = auth.context;

    if (!inventoryItemId) {
      return NextResponse.json({ success: false, error: "Inventory item ID is required." }, { status: 400 });
    }

    const qty = Number(quantity);
    if (isNaN(qty) || qty < 0) {
      return NextResponse.json({ success: false, error: "Adjustment quantity must be non-negative." }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: "An audit reason is required for stock adjustments." }, { status: 400 });
    }

    const result = await adjustKitchenStock({
      outletId,
      inventoryItemId,
      adjustmentType: adjustmentType || "SET",
      quantity: qty,
      reason: reason.trim(),
      userId,
    });

    return NextResponse.json({ ...result });
  } catch (error: any) {
    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to adjust stock." },
      { status: 500 }
    );
  }
}
