import { NextRequest, NextResponse } from "next/server";
import { getKitchenAuthContext } from "@/lib/kitchen-auth";
import { getKitchenKdsOrders } from "@/services/kitchen-orders.service";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedOutletId = searchParams.get("outletId");

    const auth = await getKitchenAuthContext(requestedOutletId);
    if (auth.error || !auth.context) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    const { outletId } = auth.context;
    const result = await getKitchenKdsOrders(outletId);

    return NextResponse.json({
      success: true,
      outletId,
      outletName: auth.context.outletName,
      userRole: auth.context.role,
      ...result,
    });
  } catch (error: any) {
    console.error("Error fetching kitchen orders:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load kitchen orders." },
      { status: 500 }
    );
  }
}
