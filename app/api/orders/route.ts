import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOrder, getUserOrders, getKitchenOrders } from "@/services/order.service";
import { createOrderSchema } from "@/lib/validations/order.schema";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");
  const outletId = searchParams.get("outletId") || undefined;

  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (view === "kitchen" || view === "admin") {
      if (!session || (userRole !== "KITCHEN" && userRole !== "ADMIN")) {
        return NextResponse.json(
          { success: false, error: "Unauthorized. Kitchen staff or Admin role required." },
          { status: 403 }
        );
      }

      let targetOutletId = outletId;

      // Kitchen staff can ONLY access orders for their assigned outlet
      if (userRole === "KITCHEN") {
        let staffOutletId = (session.user as any)?.selectedOutletId;

        if (!staffOutletId) {
          const dbUser = await prisma.user.findUnique({
            where: { email: session.user?.email?.toLowerCase().trim() },
            select: { selectedOutletId: true },
          });
          staffOutletId = dbUser?.selectedOutletId;
        }

        if (!staffOutletId) {
          return NextResponse.json(
            { success: false, error: "Unauthorized: Kitchen operator has no assigned outlet." },
            { status: 403 }
          );
        }

        // If kitchen operator attempts to query a different outlet, block with 403 Forbidden
        if (outletId && outletId !== staffOutletId) {
          return NextResponse.json(
            {
              success: false,
              error: "Unauthorized: Kitchen operators can only view orders for their assigned outlet.",
            },
            { status: 403 }
          );
        }

        targetOutletId = staffOutletId;
      }

      const orders = await getKitchenOrders(targetOutletId);
      return NextResponse.json({ success: true, orders });
    }

    if (!session?.user?.email) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ success: true, orders: [] });
    }

    const orders = await getUserOrders(user.id);
    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Authentication required to place an order" },
      { status: 401 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: "User profile not found" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    const result = await createOrder({
      userId: user.id,
      outletId: validated.outletId,
      items: validated.items,
      couponCode: validated.couponCode,
      trainerReferralCode: validated.trainerReferralCode,
      isVegetarian: validated.isVegetarian,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
