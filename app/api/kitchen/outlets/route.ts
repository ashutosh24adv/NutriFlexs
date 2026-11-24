import { NextRequest, NextResponse } from "next/server";
import { getKitchenAuthContext } from "@/lib/kitchen-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await getKitchenAuthContext();
    if (auth.error || !auth.context) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status || 403 });
    }

    let outlets: Array<{ id: string; name: string; address: string; phone?: string | null }> = [];

    if (auth.context.role === "ADMIN") {
      outlets = await prisma.outlet.findMany({
        where: { isActive: true },
        select: { id: true, name: true, address: true, phone: true },
        orderBy: { name: "asc" },
      });
    } else {
      const single = await prisma.outlet.findUnique({
        where: { id: auth.context.outletId },
        select: { id: true, name: true, address: true, phone: true },
      });
      if (single) outlets = [single];
    }

    return NextResponse.json({
      success: true,
      currentOutletId: auth.context.outletId,
      currentOutletName: auth.context.outletName,
      userRole: auth.context.role,
      userName: auth.context.userName,
      userEmail: auth.context.userEmail,
      outlets,
    });
  } catch (error: any) {
    console.error("Error fetching outlets:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load outlets." },
      { status: 500 }
    );
  }
}
