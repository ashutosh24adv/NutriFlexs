import { NextRequest, NextResponse } from "next/server";
import { getKitchenAuthContext } from "@/lib/kitchen-auth";
import { receiveKitchenStock } from "@/services/kitchen-inventory.service";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      requestedOutletId,
      inventoryItemId,
      quantityReceived,
      costPerUnit,
      supplier,
      batchNumber,
      expiryDate,
      notes,
    } = body;

    const auth = await getKitchenAuthContext(requestedOutletId);
    if (auth.error || !auth.context) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const { outletId, userId } = auth.context;

    if (!inventoryItemId) {
      return NextResponse.json({ success: false, error: "Inventory item ID is required." }, { status: 400 });
    }

    const qty = Number(quantityReceived);
    if (isNaN(qty) || qty <= 0) {
      return NextResponse.json({ success: false, error: "Received quantity must be greater than zero." }, { status: 400 });
    }

    const cost = Number(costPerUnit);
    if (isNaN(cost) || cost < 0) {
      return NextResponse.json({ success: false, error: "Cost per unit must be a non-negative number." }, { status: 400 });
    }

    const result = await receiveKitchenStock({
      outletId,
      inventoryItemId,
      quantityReceived: qty,
      costPerUnit: cost,
      supplier: supplier || "Direct Vendor",
      batchNumber,
      expiryDate,
      notes,
      userId,
    });

    return NextResponse.json({ ...result });
  } catch (error: any) {
    console.error("Error receiving kitchen stock:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to process stock receiving." },
      { status: 500 }
    );
  }
}
