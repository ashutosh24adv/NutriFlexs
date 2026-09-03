import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createOrder, getUserOrders } from "@/services/order.service";
import { createOrderSchema } from "@/lib/validations/order.schema";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const orders = await getUserOrders((session.user as any).id);
    return NextResponse.json({ success: true, orders });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id || "demo-customer-id";

  try {
    const body = await request.json();
    const validated = createOrderSchema.parse(body);

    const result = await createOrder({
      userId,
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
