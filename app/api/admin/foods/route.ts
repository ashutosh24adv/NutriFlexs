import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Super Admin Food Management API
 *
 * Restricted to users with Role.ADMIN.
 * - GET: List food library items with filtering (unverified, custom, search, category).
 * - PATCH: Verify food item or update nutritional parameters.
 * - POST: Create new verified food item.
 */

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || userRole !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q") || "";
    const category = searchParams.get("category") || "";
    const unverifiedOnly = searchParams.get("unverifiedOnly") === "true";
    const customOnly = searchParams.get("customOnly") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (unverifiedOnly) {
      where.isVerified = false;
    }

    if (customOnly) {
      where.isCustom = true;
    }

    if (category && category !== "All") {
      where.category = category;
    }

    if (query.trim()) {
      where.OR = [
        { name: { contains: query.trim(), mode: "insensitive" } },
        { brand: { contains: query.trim(), mode: "insensitive" } },
        { cuisine: { contains: query.trim(), mode: "insensitive" } },
        { subCategory: { contains: query.trim(), mode: "insensitive" } },
      ];
    }

    const [foods, totalCount] = await Promise.all([
      withDbRetry(() =>
        prisma.foodItem.findMany({
          where,
          orderBy: [{ createdAt: "desc" }, { name: "asc" }],
          skip,
          take: limit,
          include: {
            createdBy: {
              select: { id: true, name: true, email: true },
            },
          },
        })
      ),
      withDbRetry(() => prisma.foodItem.count({ where })),
    ]);

    return NextResponse.json({
      success: true,
      foods,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error: any) {
    console.error("Admin foods GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load foods" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || userRole !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, isVerified, isActive, name, category, subCategory, cuisine, brand, caloriesPer100g, protein, carbohydrates, fat, fiber, sugar, sodium, defaultServingSize, defaultServingUnit, servingWeightGrams, servingUnits, dataSource } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Food item ID is required." },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (typeof isVerified === "boolean") updateData.isVerified = isVerified;
    if (typeof isActive === "boolean") updateData.isActive = isActive;
    if (name) updateData.name = name.trim();
    if (category) updateData.category = category;
    if (subCategory !== undefined) updateData.subCategory = subCategory;
    if (cuisine !== undefined) updateData.cuisine = cuisine;
    if (brand !== undefined) updateData.brand = brand;
    if (typeof caloriesPer100g === "number") updateData.caloriesPer100g = caloriesPer100g;
    if (typeof protein === "number") updateData.protein = protein;
    if (typeof carbohydrates === "number") updateData.carbohydrates = carbohydrates;
    if (typeof fat === "number") updateData.fat = fat;
    if (typeof fiber === "number") updateData.fiber = fiber;
    if (typeof sugar === "number") updateData.sugar = sugar;
    if (typeof sodium === "number") updateData.sodium = sodium;
    if (typeof defaultServingSize === "number") updateData.defaultServingSize = defaultServingSize;
    if (defaultServingUnit) updateData.defaultServingUnit = defaultServingUnit;
    if (typeof servingWeightGrams === "number") updateData.servingWeightGrams = servingWeightGrams;
    if (servingUnits !== undefined) updateData.servingUnits = servingUnits;
    if (dataSource) updateData.dataSource = dataSource;

    const updated = await withDbRetry(() =>
      prisma.foodItem.update({
        where: { id },
        data: updateData,
      })
    );

    return NextResponse.json({
      success: true,
      message: "Food item updated successfully.",
      food: updated,
    });
  } catch (error: any) {
    console.error("Admin foods PATCH error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update food item" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userRole = (session?.user as any)?.role;

    if (!session || userRole !== "ADMIN") {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Super Admin access required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { name, category, subCategory, cuisine, brand, caloriesPer100g, protein, carbohydrates, fat, fiber, sugar, sodium, saturatedFat, defaultServingSize, defaultServingUnit, servingWeightGrams, servingUnits, dataSource } = body;

    if (!name || !category || caloriesPer100g === undefined) {
      return NextResponse.json(
        { success: false, error: "Name, category, and calories per 100g are required." },
        { status: 400 }
      );
    }

    const created = await withDbRetry(() =>
      prisma.foodItem.create({
        data: {
          name: name.trim(),
          category: category.trim(),
          subCategory: subCategory?.trim() || null,
          cuisine: cuisine?.trim() || null,
          brand: brand?.trim() || null,
          caloriesPer100g: parseFloat(caloriesPer100g) || 0,
          protein: parseFloat(protein) || 0,
          carbohydrates: parseFloat(carbohydrates) || 0,
          fat: parseFloat(fat) || 0,
          fiber: fiber !== undefined ? parseFloat(fiber) : 0,
          sugar: sugar !== undefined ? parseFloat(sugar) : 0,
          sodium: sodium !== undefined ? parseFloat(sodium) : 0,
          saturatedFat: saturatedFat !== undefined ? parseFloat(saturatedFat) : 0,
          defaultServingSize: parseFloat(defaultServingSize) || 1,
          defaultServingUnit: defaultServingUnit?.trim() || "g",
          servingWeightGrams: parseFloat(servingWeightGrams) || 100,
          servingUnits: servingUnits || null,
          dataSource: dataSource?.trim() || "Admin Verified Recipe",
          isVerified: true,
          isCustom: false,
          isActive: true,
        },
      })
    );

    return NextResponse.json({
      success: true,
      message: "Verified food item created successfully.",
      food: created,
    });
  } catch (error: any) {
    console.error("Admin foods POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create food item" },
      { status: 500 }
    );
  }
}
