import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { invalidateProductCache } from "@/services/product.service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    if (typeof body.isVeg !== "boolean") {
      return NextResponse.json(
        { success: false, error: "isVeg boolean value is required" },
        { status: 400 }
      );
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { isVeg: body.isVeg },
      include: { category: true },
    });

    invalidateProductCache();

    return NextResponse.json({
      success: true,
      product: updatedProduct,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update product dietary classification" },
      { status: 500 }
    );
  }
}
