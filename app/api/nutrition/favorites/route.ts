import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getFavoriteFoods,
  toggleFavoriteFood,
  removeFavoriteFood,
} from "@/services/nutrition.service";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json({ success: true, favorites: [] });
    }

    const favorites = await getFavoriteFoods(userId);

    return NextResponse.json({
      success: true,
      favorites,
    });
  } catch (error: any) {
    console.error("Error fetching favorite foods:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load favorite foods" },
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
        { success: false, error: "Authentication required to manage favorite foods" },
        { status: 401 }
      );
    }

    const body = await req.json();
    if (!body.foodName || !body.foodName.trim()) {
      return NextResponse.json(
        { success: false, error: "Food name is required" },
        { status: 400 }
      );
    }

    const result = await toggleFavoriteFood(userId, body);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error("Error toggling favorite food:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update favorite food" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json(
        { success: false, error: "Favorite item ID is required" },
        { status: 400 }
      );
    }

    await removeFavoriteFood(userId, id);

    return NextResponse.json({
      success: true,
      message: "Favorite removed",
    });
  } catch (error: any) {
    console.error("Error removing favorite food:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to remove favorite food" },
      { status: 500 }
    );
  }
}

