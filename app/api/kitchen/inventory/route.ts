import { NextRequest, NextResponse } from "next/server";
import { getKitchenAuthContext } from "@/lib/kitchen-auth";
import {
  getKitchenInventoryOverview,
  getKitchenInventoryItems,
  upsertKitchenInventoryItem,
} from "@/services/kitchen-inventory.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedOutletId = searchParams.get("outletId");
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || undefined;
    const statusFilter = searchParams.get("status") || "all";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const auth = await getKitchenAuthContext(requestedOutletId);
    if (auth.error || !auth.context) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const { outletId } = auth.context;

    const [itemsResult, overview] = await Promise.all([
      getKitchenInventoryItems({
        outletId,
        search,
        category,
        statusFilter,
        page,
        limit,
      }),
      getKitchenInventoryOverview(outletId),
    ]);

    return NextResponse.json({
      success: true,
      outletId,
      outletName: auth.context.outletName,
      overview,
      ...itemsResult,
    });
  } catch (error: any) {
    console.error("Error fetching kitchen inventory:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load kitchen inventory." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { requestedOutletId, ...itemData } = body;

    const auth = await getKitchenAuthContext(requestedOutletId);
    if (auth.error || !auth.context) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const { outletId, userId } = auth.context;

    if (!itemData.ingredientName || !itemData.ingredientName.trim()) {
      return NextResponse.json({ success: false, error: "Ingredient name is required." }, { status: 400 });
    }

    if (itemData.quantity === undefined || itemData.quantity < 0) {
      return NextResponse.json({ success: false, error: "Valid non-negative quantity is required." }, { status: 400 });
    }

    const item = await upsertKitchenInventoryItem({
      outletId,
      ingredientName: itemData.ingredientName,
      category: itemData.category || "General",
      unit: itemData.unit || "kg",
      quantity: Number(itemData.quantity) || 0,
      lowStockThreshold: Number(itemData.lowStockThreshold) || 5,
      maxStockThreshold: itemData.maxStockThreshold ? Number(itemData.maxStockThreshold) : null,
      purchasePricePerUnit: Number(itemData.purchasePricePerUnit) || 0,
      supplier: itemData.supplier,
      batchNumber: itemData.batchNumber,
      expiryDate: itemData.expiryDate,
      storageLocation: itemData.storageLocation,
      notes: itemData.notes,
      userId,
    });

    return NextResponse.json({ success: true, item });
  } catch (error: any) {
    console.error("Error saving inventory item:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save inventory item." },
      { status: 500 }
    );
  }
}
