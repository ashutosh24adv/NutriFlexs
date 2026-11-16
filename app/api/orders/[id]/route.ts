import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getOrderById } from "@/services/order.service";
import { safeErrorResponse, stripSensitiveFields } from "@/lib/api-security";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required to view order details" },
        { status: 401 }
      );
    }

    const order = await getOrderById(params.id);
    if (!order) {
      return NextResponse.json({ success: false, error: "Order not found" }, { status: 404 });
    }

    const currentUserId = (session.user as any)?.id;
    const currentUserRole = (session.user as any)?.role;
    let staffOutletId = (session.user as any)?.selectedOutletId;

    if (currentUserRole === "KITCHEN" && !staffOutletId) {
      const dbUser = await prisma.user.findUnique({
        where: { email: session.user.email?.toLowerCase().trim() },
        select: { selectedOutletId: true },
      });
      staffOutletId = dbUser?.selectedOutletId;
    }

    const isOwner = Boolean(currentUserId && order.userId === currentUserId);
    const isAdmin = currentUserRole === "ADMIN" || currentUserRole === "SUPER_ADMIN";
    const isKitchenAuthorized =
      currentUserRole === "KITCHEN" && Boolean(staffOutletId && order.outletId === staffOutletId);

    if (!isOwner && !isAdmin && !isKitchenAuthorized) {
      return NextResponse.json(
        { success: false, error: "Forbidden: You are not authorized to view this order" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, order: stripSensitiveFields(order) });
  } catch (error: any) {
    return safeErrorResponse(error, "Failed to retrieve order details", 500);
  }
}
