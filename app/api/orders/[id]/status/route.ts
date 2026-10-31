import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateOrderStatus } from "@/services/order.service";
import { OrderStatus } from "@/types/enums";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const userRole = (session.user as any)?.role;
    if (userRole !== "KITCHEN" && userRole !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Kitchen or Admin role required." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { status } = body;
    if (!status || !Object.values(OrderStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid order status value" },
        { status: 400 }
      );
    }

    // Server-side outlet authorization for Kitchen staff
    if (userRole === "KITCHEN") {
      const order = await prisma.order.findUnique({
        where: { id: params.id },
        select: { id: true, outletId: true },
      });

      if (!order) {
        return NextResponse.json(
          { success: false, error: "Order not found" },
          { status: 404 }
        );
      }

      let staffOutletId = (session.user as any)?.selectedOutletId;
      if (!staffOutletId) {
        const dbUser = await prisma.user.findUnique({
          where: { email: session.user.email?.toLowerCase().trim() },
          select: { selectedOutletId: true },
        });
        staffOutletId = dbUser?.selectedOutletId;
      }

      if (!staffOutletId || order.outletId !== staffOutletId) {
        return NextResponse.json(
          {
            success: false,
            error: "Unauthorized: Kitchen staff can only update orders for their assigned outlet.",
          },
          { status: 403 }
        );
      }
    }

    const updatedOrder = await updateOrderStatus(params.id, status as any);
    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update order status" },
      { status: 500 }
    );
  }
}
