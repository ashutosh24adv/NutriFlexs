import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { logWaterSchema } from "@/lib/validations/nutrition.schema";
import { addWaterEntry, deleteWaterEntry } from "@/services/nutrition.service";
import { prisma, withDbRetry } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(req: NextRequest) {
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
    const dateKey = searchParams.get("dateKey") || new Date().toISOString().split("T")[0];

    const entries = await withDbRetry(() =>
      prisma.waterEntry.findMany({
        where: { userId, dateKey },
        orderBy: { loggedAt: "desc" },
      })
    );

    const totalMl = entries.reduce((sum, e) => sum + e.amountMl, 0);

    return NextResponse.json({
      success: true,
      dateKey,
      totalMl,
      entries,
    });
  } catch (error: any) {
    console.error("Error fetching water entries:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch water entries" },
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
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = logWaterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid water intake data" },
        { status: 400 }
      );
    }

    const result = await addWaterEntry(userId, parsed.data.dateKey, parsed.data.amountMl);

    return NextResponse.json({
      success: true,
      entry: result.entry,
      totalMl: result.totalMl,
      waterGoalMl: result.waterGoalMl,
      entries: result.entries,
    });
  } catch (error: any) {
    console.error("Error logging water entry:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to log water intake" },
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
    let entryId = searchParams.get("id");

    if (!entryId) {
      try {
        const body = await req.json();
        entryId = body.entryId || body.id;
      } catch {
        // query param was preferred
      }
    }

    if (!entryId) {
      return NextResponse.json(
        { success: false, error: "Water entry ID is required" },
        { status: 400 }
      );
    }

    const result = await deleteWaterEntry(userId, entryId);

    return NextResponse.json({
      success: true,
      deletedEntryId: result.deletedId,
      totalMl: result.totalMl,
      entries: result.entries,
    });
  } catch (error: any) {
    console.error("Error deleting water entry:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete water entry" },
      { status: 500 }
    );
  }
}
