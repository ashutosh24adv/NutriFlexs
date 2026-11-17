import { NextRequest, NextResponse } from "next/server";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";

function getTodayDateKey(timeZone = "Asia/Kolkata"): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

/**
 * POST /api/mobile/nutrition/water
 * Upserts water intake for a specific date in Neon PostgreSQL.
 * Supports relative increments (+250ml, +500ml) or absolute updates.
 */
export async function POST(req: NextRequest) {
  try {
    const authUser = await getMobileAuthUser(req);
    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = authUser.id;

    const body = await req.json();

    const rawAmount = typeof body.amountMl === "number"
      ? body.amountMl
      : typeof body.amount === "number"
      ? body.amount
      : typeof body.waterMl === "number"
      ? body.waterMl
      : 250;

    const dateKey = (body.dateKey || body.dateStr || body.date || getTodayDateKey()).trim();

    // Check existing water log for date
    const existing = await withDbRetry(() =>
      prisma.waterLog.findUnique({
        where: {
          userId_dateKey: {
            userId,
            dateKey,
          },
        },
      })
    );

    let finalAmount = Math.max(0, rawAmount);

    const isExplicitSet =
      body.action === "set" ||
      body.mode === "set" ||
      body.isDelta === false ||
      body.delta === false ||
      typeof body.totalMl === "number";

    if (typeof body.totalMl === "number") {
      finalAmount = Math.max(0, body.totalMl);
    } else if (isExplicitSet) {
      finalAmount = Math.max(0, rawAmount);
    } else {
      // Treat as increment (+250ml, +500ml, etc.)
      finalAmount = (existing?.amountMl || 0) + Math.max(0, rawAmount);
    }

    // Upsert WaterLog
    const waterLog = await withDbRetry(() =>
      prisma.waterLog.upsert({
        where: {
          userId_dateKey: {
            userId,
            dateKey,
          },
        },
        create: {
          userId,
          dateKey,
          amountMl: finalAmount,
          loggedAt: new Date(),
        },
        update: {
          amountMl: finalAmount,
          loggedAt: new Date(),
        },
      })
    );

    // Keep DailyHealthMetric hydrationMl synchronized if record exists
    try {
      await withDbRetry(() =>
        prisma.dailyHealthMetric.upsert({
          where: {
            userId_dateKey: {
              userId,
              dateKey,
            },
          },
          create: {
            userId,
            dateKey,
            hydrationMl: finalAmount,
            waterIntakeMl: finalAmount,
            source: "Mobile Hydration Tracker",
          },
          update: {
            hydrationMl: finalAmount,
            waterIntakeMl: finalAmount,
          },
        })
      );
    } catch (syncErr) {
      // Non-fatal telemetry sync error
    }

    return NextResponse.json({
      success: true,
      waterLog: {
        id: waterLog.id,
        userId: waterLog.userId,
        dateKey: waterLog.dateKey,
        amountMl: waterLog.amountMl,
        loggedAt: waterLog.loggedAt.toISOString(),
      },
      totalMl: waterLog.amountMl,
      amountMl: waterLog.amountMl,
    });
  } catch (error: any) {
    console.error("[Mobile Water POST Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update water intake" },
      { status: 500 }
    );
  }
}
