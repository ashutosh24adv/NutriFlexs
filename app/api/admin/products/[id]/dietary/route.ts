import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { invalidateProductCache } from "@/services/product.service";
import { DietGoal } from "@prisma/client";

const VALID_GOALS: DietGoal[] = [
  DietGoal.WEIGHT_LOSS,
  DietGoal.WEIGHT_GAIN,
  DietGoal.WEIGHT_MAINTENANCE,
];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    const updateData: any = {};
    if (typeof body.isVeg === "boolean") {
      updateData.isVeg = body.isVeg;
    }

    // Process dietGoals if provided
    let newGoals: DietGoal[] | undefined = undefined;
    if (Array.isArray(body.dietGoals)) {
      newGoals = body.dietGoals
        .map((g: string) => g.toUpperCase().trim())
        .filter((g: any): g is DietGoal => VALID_GOALS.includes(g as DietGoal));
    }

    if (Object.keys(updateData).length === 0 && newGoals === undefined) {
      return NextResponse.json(
        { success: false, error: "Either isVeg boolean or dietGoals array is required." },
        { status: 400 }
      );
    }

    const updatedProduct = await withDbRetry(async () => {
      return await prisma.$transaction(async (tx) => {
        if (Object.keys(updateData).length > 0) {
          await tx.product.update({
            where: { id },
            data: updateData,
          });
        }

        if (newGoals !== undefined) {
          // Remove previous diet goals
          await tx.productDietGoal.deleteMany({
            where: { productId: id },
          });

          // Insert new diet goals
          if (newGoals.length > 0) {
            await tx.productDietGoal.createMany({
              data: newGoals.map((goal) => ({
                productId: id,
                goal,
              })),
            });
          }
        }

        return await tx.product.findUnique({
          where: { id },
          include: {
            category: true,
            dietGoals: true,
            ingredients: {
              include: {
                ingredient: true,
              },
            },
          },
        });
      });
    });

    invalidateProductCache();

    return NextResponse.json({
      success: true,
      product: {
        ...updatedProduct,
        dietGoals: updatedProduct?.dietGoals?.map((dg) => dg.goal) || [],
      },
    });
  } catch (error: any) {
    console.error("[API Admin Dietary PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update product dietary classification" },
      { status: 500 }
    );
  }
}
