import { NextRequest, NextResponse } from "next/server";
import { getKitchenAuthContext } from "@/lib/kitchen-auth";
import { getKitchenWastages, recordKitchenWastage } from "@/services/kitchen-inventory.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedOutletId = searchParams.get("outletId");
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const auth = await getKitchenAuthContext(requestedOutletId);
    if (auth.error || !auth.context) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const { outletId } = auth.context;
    const result = await getKitchenWastages({
      outletId,
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
    console.error("Error fetching wastage records:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load wastage records." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestedOutletId, inventoryItemId, quantityWasted, reason, notes } = body;

    const auth = await getKitchenAuthContext(requestedOutletId);
    if (auth.error || !auth.context) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const { outletId, userId } = auth.context;

    if (!inventoryItemId) {
      return NextResponse.json({ success: false, error: "Inventory item ID is required." }, { status: 400 });
    }

    const qty = Number(quantityWasted);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ success: false, error: "Quantity wasted must be greater than zero." }, { status: 400 });
    }

    if (!reason || !reason.trim()) {
      return NextResponse.json({ success: false, error: "Reason for wastage (e.g. Expired, Spoiled) is required." }, { status: 400 });
    }

    const result = await recordKitchenWastage({
      outletId,
      inventoryItemId,
      quantityWasted: qty,
      reason: reason.trim(),
      notes,
      userId,
    });

    return NextResponse.json({ ...result });
  } catch (error: any) {
    console.error("Error recording wastage:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to record wastage." },
      { status: 500 }
    );
  }
}
