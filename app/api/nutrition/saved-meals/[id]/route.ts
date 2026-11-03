import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateSavedMeal, deleteSavedMeal } from "@/services/nutrition.service";

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
    const updated = await updateSavedMeal(userId, params.id, body);

    return NextResponse.json({
      success: true,
      meal: updated,
    });
  } catch (error: any) {
    console.error("Error updating saved meal:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update saved meal" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await deleteSavedMeal(userId, params.id);

    return NextResponse.json({
      success: true,
      message: "Saved meal deleted",
    });
  } catch (error: any) {
    console.error("Error deleting saved meal:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete saved meal" },
      { status: 500 }
    );
  }
}

