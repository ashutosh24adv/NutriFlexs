import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export interface MobileHealthSyncPayload {
  userId?: string;
  date?: string;
  dateKey?: string;
  steps?: number;
  activeCalories?: number;
  heartRate?: number;
  distanceMeters?: number;
  restingCalories?: number;
  totalCalories?: number;
  avgHeartRate?: number;
  workoutsCount?: number;
  hydrationMl?: number;
  source?: string;
  syncedAt?: string;
  [key: string]: any;
}

function parseNumber(val: any, fallback = 0): number {
  if (typeof val === "number" && !isNaN(val)) return val;
  if (typeof val === "string" && val.trim() !== "" && !isNaN(Number(val))) return Number(val);
  return fallback;
}

/**
 * GET /api/mobile/health-sync?date=YYYY-MM-DD
 * Retrieves the latest synced health telemetry stored for the current athlete user in Neon Postgres.
 */
export async function GET(req: NextRequest) {
  try {
    const authUser = await getMobileAuthUser(req);
    let user = null;

    if (authUser) {
      user = await withDbRetry(() =>
        prisma.user.findUnique({
          where: { id: authUser.id },
          select: { id: true, name: true, email: true },
        })
      );
    }

    if (!user) {
      const session = await getServerSession(authOptions);
      const email = session?.user?.email;
      if (email) {
        user = await withDbRetry(() =>
          prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, name: true, email: true },
          })
        );
      }
    }

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const dateParam = searchParams.get("date");
    const todayStr = new Date().toISOString().split("T")[0];
    const targetDateKey = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
      ? dateParam
      : todayStr;

    // Fetch metric from Neon Postgres
    const metric = await withDbRetry(() =>
      prisma.dailyHealthMetric.findFirst({
        where: {
          userId: user.id,
          ...(dateParam ? { dateKey: targetDateKey } : {}),
        },
        orderBy: { dateKey: "desc" },
      })
    );

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
      },
      latestTelemetry: metric
        ? {
            date: metric.dateKey,
            dateKey: metric.dateKey,
            steps: metric.steps,
            activeCalories: metric.activeCalories,
            restingCalories: metric.restingCalories,
            totalCalories: metric.totalCalories,
            heartRate: metric.avgHeartRate,
            avgHeartRate: metric.avgHeartRate,
            distanceMeters: metric.distanceMeters ?? 0,
            workoutsCount: metric.workoutsCount,
            hydrationMl: metric.hydrationMl,
            source: metric.source,
            syncedAt: metric.syncedAt,
          }
        : {
            date: targetDateKey,
            dateKey: targetDateKey,
            steps: 0,
            activeCalories: 0,
            restingCalories: 0,
            totalCalories: 0,
            heartRate: 0,
            avgHeartRate: 0,
            distanceMeters: 0,
            workoutsCount: 0,
            hydrationMl: 0,
            source: "Native Health Bridge",
            syncedAt: null,
          },
    });
  } catch (error: any) {
    console.error("[HealthSync GET Error]:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to retrieve health telemetry" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobile/health-sync
 * Accepts { date, steps, activeCalories, heartRate, distanceMeters } (including 0 values),
 * upserts DailyHealthMetric in Neon Postgres, and returns success.
 */
export async function POST(req: NextRequest) {
  try {
    const body: MobileHealthSyncPayload = await req.json().catch(() => ({}));

    // Resolve target authenticated user
    let targetUser = null;
    const authUser = await getMobileAuthUser(req);
    if (authUser) {
      targetUser = await withDbRetry(() =>
        prisma.user.findUnique({
          where: { id: authUser.id },
          select: { id: true, name: true, email: true },
        })
      );
    }

    if (!targetUser && body.userId) {
      targetUser = await withDbRetry(() =>
        prisma.user.findUnique({
          where: { id: body.userId },
          select: { id: true, name: true, email: true },
        })
      );
    }

    if (!targetUser) {
      const session = await getServerSession(authOptions);
      const email = session?.user?.email;
      if (email) {
        targetUser = await withDbRetry(() =>
          prisma.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, name: true, email: true },
          })
        );
      }
    }

    if (!targetUser) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Safely parse telemetry accepting 0 values
    const steps = parseNumber(body.steps ?? body.stepCount, 0);
    const activeCalories = parseNumber(body.activeCalories ?? body.activeCals ?? body.activeBurn, 0);
    const heartRate = parseNumber(body.heartRate ?? body.avgHeartRate ?? body.bpm, 0);
    const distanceMeters = parseNumber(body.distanceMeters ?? body.distance, 0);
    const restingCalories = parseNumber(body.restingCalories, 0);
    const totalCalories = parseNumber(
      body.totalCalories,
      activeCalories + restingCalories
    );
    const workoutsCount = parseNumber(body.workoutsCount, 0);
    const hydrationMl = parseNumber(body.hydrationMl ?? body.waterMl, 0);
    const source =
      typeof body.source === "string" && body.source.trim()
        ? body.source.trim()
        : "Native Health Bridge";

    // Resolve dateKey: "YYYY-MM-DD"
    const rawDate = body.date || body.dateKey || body.syncedAt;
    let dateKey: string;
    if (rawDate && /^\d{4}-\d{2}-\d{2}/.test(String(rawDate))) {
      dateKey = String(rawDate).substring(0, 10);
    } else {
      dateKey = new Date().toISOString().split("T")[0];
    }

    // Upsert DailyHealthMetric in Neon PostgreSQL
    const metric = await withDbRetry(() =>
      prisma.dailyHealthMetric.upsert({
        where: {
          userId_dateKey: {
            userId: targetUser.id,
            dateKey,
          },
        },
        create: {
          userId: targetUser.id,
          dateKey,
          steps: Math.round(steps),
          activeCalories,
          restingCalories,
          totalCalories,
          avgHeartRate: heartRate,
          distanceMeters,
          workoutsCount: Math.round(workoutsCount),
          hydrationMl,
          source,
          rawPayload: JSON.stringify(body),
          syncedAt: new Date(),
        },
        update: {
          steps: Math.round(steps),
          activeCalories,
          restingCalories,
          totalCalories,
          avgHeartRate: heartRate,
          distanceMeters,
          workoutsCount: Math.round(workoutsCount),
          hydrationMl,
          source,
          rawPayload: JSON.stringify(body),
          syncedAt: new Date(),
        },
      })
    );

    return NextResponse.json({
      success: true,
      persistedToNeon: true,
      metric,
      telemetry: {
        date: metric.dateKey,
        dateKey: metric.dateKey,
        steps: metric.steps,
        activeCalories: metric.activeCalories,
        heartRate: metric.avgHeartRate,
        avgHeartRate: metric.avgHeartRate,
        distanceMeters: metric.distanceMeters ?? 0,
        restingCalories: metric.restingCalories,
        totalCalories: metric.totalCalories,
        workoutsCount: metric.workoutsCount,
        hydrationMl: metric.hydrationMl,
        source: metric.source,
        syncedAt: metric.syncedAt,
      },
      message: `Successfully synced ${steps.toLocaleString()} steps and ${activeCalories} kcal active burn for ${dateKey} to Neon Postgres`,
    });
  } catch (error: any) {
    console.error("[HealthSync POST Error]:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to persist health telemetry to Neon Postgres",
      },
      { status: 500 }
    );
  }
}
