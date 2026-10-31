import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createCustomFoodSchema } from "@/lib/validations/nutrition.schema";
import { createCustomFood } from "@/services/nutrition.service";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to create custom food" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createCustomFoodSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const newFood = await createCustomFood(userId, parsed.data);
    return NextResponse.json({
      success: true,
      food: newFood,
    });
  } catch (error: any) {
    console.error("Error creating custom food:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create custom food" },
      { status: 500 }
    );
  }
}

