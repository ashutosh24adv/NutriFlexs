import { NextResponse } from "next/server";
import { updateOrderStatus } from "@/services/order.service";
import { OrderStatus } from "@/types/enums";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { status } = await request.json();
    if (!Object.values(OrderStatus).includes(status)) {
      return NextResponse.json({ success: false, error: "Invalid order status" }, { status: 400 });
    }

    const updatedOrder = await updateOrderStatus(params.id, status as any);
    return NextResponse.json({ success: true, order: updatedOrder });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
