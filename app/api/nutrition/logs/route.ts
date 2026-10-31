import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { addFoodLogSchema } from "@/lib/validations/nutrition.schema";
import { addFoodLog } from "@/services/nutrition.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to log food" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = addFoodLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const result = await addFoodLog(userId, parsed.data);
    return NextResponse.json({
      success: true,
      log: result.log,
      possibleDuplicate: result.possibleDuplicate,
    });
  } catch (error: any) {
    console.error("Error adding food log entry:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add food log entry" },
      { status: 500 }
    );
  }
}

