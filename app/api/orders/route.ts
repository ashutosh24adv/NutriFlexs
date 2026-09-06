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
    if (view === "kitchen" || view === "admin") {
      const orders = await getKitchenOrders(outletId);
      return NextResponse.json({ success: true, orders });
    }

    const session = await getServerSession(authOptions);
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
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 400 });
  }
}
