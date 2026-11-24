import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * API for users to suggest a missing food item to the NutriFlexs food database.
 * Submits the item as an unverified food record that admins can review, refine, and verify.
 */

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const body = await req.json();
    const {
      name,
      category,
      brand,
      cuisine,
      description,
      caloriesPer100g,
      protein,
      carbohydrates,
      fat,
      fiber,
      defaultServingSize,
      defaultServingUnit,
      servingWeightGrams,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Food name is required." },
        { status: 400 }
      );
    }

    const trimmedName = name.trim();

    // Check if an identical verified food already exists
    const existing = await withDbRetry(() =>
      prisma.foodItem.findFirst({
        where: {
          name: { equals: trimmedName, mode: "insensitive" },
          isActive: true,
        },
      })
    );

    if (existing && existing.isVerified) {
      return NextResponse.json({
        success: true,
        alreadyExists: true,
        message: "This food item already exists in the NutriFlexs food database.",
        food: existing,
      });
    }

    // Create an unverified user-suggested food item
    const created = await withDbRetry(() =>
      prisma.foodItem.create({
        data: {
          name: trimmedName,
          category: (category && typeof category === "string" ? category.trim() : "Custom foods"),
          subCategory: "User Suggestion",
          brand: brand && typeof brand === "string" ? brand.trim() : null,
          cuisine: cuisine && typeof cuisine === "string" ? cuisine.trim() : null,
          description: description && typeof description === "string" ? description.trim() : "Submitted by user",
          caloriesPer100g: parseFloat(caloriesPer100g) || 0,
          protein: parseFloat(protein) || 0,
          carbohydrates: parseFloat(carbohydrates) || 0,
          fat: parseFloat(fat) || 0,
          fiber: parseFloat(fiber) || 0,
          defaultServingSize: parseFloat(defaultServingSize) || 1,
          defaultServingUnit: defaultServingUnit && typeof defaultServingUnit === "string" ? defaultServingUnit.trim() : "serving",
          servingWeightGrams: parseFloat(servingWeightGrams) || 100,
          dataSource: "User Community Suggestion",
          isVerified: false,
          isCustom: true,
          createdById: userId || null,
          isActive: true,
        },
      })
    );

    return NextResponse.json({
      success: true,
      message: "Thank you! Your food suggestion has been submitted for verification.",
      food: created,
    });
  } catch (error: any) {
    console.error("Food suggestion submission error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to submit food suggestion" },
      { status: 500 }
    );
  }
}
