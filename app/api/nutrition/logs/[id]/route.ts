import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateFoodLogSchema } from "@/lib/validations/nutrition.schema";
import { updateFoodLog, deleteFoodLog } from "@/services/nutrition.service";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = updateFoodLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const updated = await updateFoodLog(userId, params.id, parsed.data);
    return NextResponse.json({
      success: true,
      log: updated,
    });
  } catch (error: any) {
    console.error("Error updating food log entry:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update food log entry" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    await deleteFoodLog(userId, params.id);
    return NextResponse.json({
      success: true,
      message: "Food log entry removed successfully",
    });
  } catch (error: any) {
    console.error("Error deleting food log entry:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete food log entry" },
      { status: 400 }
    );
  }
}

