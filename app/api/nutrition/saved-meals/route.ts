import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSavedMeals, createSavedMeal } from "@/services/nutrition.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ success: true, meals: [] });
    }

    const meals = await getSavedMeals(userId);

    return NextResponse.json({
      success: true,
      meals,
    });
  } catch (error: any) {
    console.error("Error fetching saved meals:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load saved meals" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required to create saved meals" },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { success: false, error: "Meal name is required" },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { success: false, error: "A saved meal must contain at least one food item" },
        { status: 400 }
      );
    }

    const meal = await createSavedMeal(userId, body);

    return NextResponse.json({
      success: true,
      meal,
    });
  } catch (error: any) {
    console.error("Error creating saved meal:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create saved meal" },
      { status: 500 }
    );
  }
}

