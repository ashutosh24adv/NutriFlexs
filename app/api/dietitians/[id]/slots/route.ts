import { NextRequest, NextResponse } from "next/server";
import { getAvailableSlots } from "@/services/dietitian.service";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");

    const targetDate = dateParam ? new Date(dateParam) : new Date();
    if (isNaN(targetDate.getTime())) {
      return NextResponse.json(
        { success: false, error: "Invalid date format. Expected YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const slots = await getAvailableSlots(id, targetDate);

    return NextResponse.json({
      success: true,
      slots,
      date: targetDate.toISOString().split("T")[0],
    });
  } catch (error: any) {
    console.error(`[API /api/dietitians/${params.id}/slots] Error:`, error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch appointment slots." },
      { status: 500 }
    );
  }
}
