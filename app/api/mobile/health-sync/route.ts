import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getMobileAuthUser } from "@/lib/mobile-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function getLocalDateString(date = new Date(), timeZone = "Asia/Kolkata"): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Zod schema for health telemetry payload.
 * Explicitly allows 0 for all numeric telemetry values (steps, activeCalories, heartRate, distanceMeters, etc.).
 */
export const healthSyncSchema = z.object({
  date: z.string().optional(),
  dateKey: z.string().optional(),
  syncedAt: z.string().optional(),
  steps: z.coerce
    .number({ invalid_type_error: "steps must be a number" })
    .min(0, "steps cannot be negative")
    .default(0),
  activeCalories: z.coerce
    .number({ invalid_type_error: "activeCalories must be a number" })
    .min(0, "activeCalories cannot be negative")
    .default(0),
  heartRate: z.coerce
    .number({ invalid_type_error: "heartRate must be a number" })
    .min(0, "heartRate cannot be negative")
    .default(0),
  distanceMeters: z.coerce
    .number({ invalid_type_error: "distanceMeters must be a number" })
    .min(0, "distanceMeters cannot be negative")
    .default(0),
  restingCalories: z.coerce
    .number({ invalid_type_error: "restingCalories must be a number" })
    .min(0, "restingCalories cannot be negative")
    .optional()
    .default(0),
  totalCalories: z.coerce
    .number({ invalid_type_error: "totalCalories must be a number" })
    .min(0, "totalCalories cannot be negative")
    .optional(),
  avgHeartRate: z.coerce
    .number({ invalid_type_error: "avgHeartRate must be a number" })
    .min(0, "avgHeartRate cannot be negative")
    .optional(),
  workoutsCount: z.coerce
    .number({ invalid_type_error: "workoutsCount must be a number" })
    .min(0, "workoutsCount cannot be negative")
    .optional()
    .default(0),
  hydrationMl: z.coerce
    .number({ invalid_type_error: "hydrationMl must be a number" })
    .min(0, "hydrationMl cannot be negative")
    .optional()
    .default(0),
  source: z.string().optional().default("Native Health Bridge"),
});

export type HealthSyncInput = z.infer<typeof healthSyncSchema>;

/**
 * GET /api/mobile/health-sync?date=YYYY-MM-DD
 * Retrieves the latest synced health telemetry stored for the current user in Neon Postgres.
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
    const todayStr = getLocalDateString();
    const targetDateKey =
      dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
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
      metric,
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
      {
        success: false,
        error: error.message || "Failed to retrieve health telemetry",
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/mobile/health-sync
 * Accepts { date, steps, activeCalories, heartRate, distanceMeters } (explicitly allowing 0 in Zod validation),
 * upserts DailyHealthMetric in Neon Postgres for authenticated userId and date, and returns { success: true, metric }.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate via Bearer JWT (lib/mobile-auth.ts)
    const authUser = await getMobileAuthUser(req);
    let targetUser = null;

    if (authUser) {
      targetUser = await withDbRetry(() =>
        prisma.user.findUnique({
          where: { id: authUser.id },
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

    // 2. Parse and validate request body with Zod (explicitly allowing 0 values)
    const rawBody = await req.json().catch(() => ({}));

    // Normalize field aliases before Zod validation
    const normalizedBody = {
      ...rawBody,
      steps: rawBody.steps ?? rawBody.stepCount ?? 0,
      activeCalories:
        rawBody.activeCalories ?? rawBody.activeCals ?? rawBody.activeBurn ?? 0,
      heartRate:
        rawBody.heartRate ?? rawBody.avgHeartRate ?? rawBody.bpm ?? 0,
      distanceMeters: rawBody.distanceMeters ?? rawBody.distance ?? 0,
      date: rawBody.date ?? rawBody.dateKey ?? rawBody.syncedAt,
    };

    const parseResult = healthSyncSchema.safeParse(normalizedBody);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid health sync payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      steps,
      activeCalories,
      heartRate,
      distanceMeters,
      restingCalories,
      workoutsCount,
      hydrationMl,
      source,
    } = parseResult.data;

    const totalCalories =
      parseResult.data.totalCalories ??
      (activeCalories + (restingCalories ?? 0));

    // Resolve dateKey: "YYYY-MM-DD"
    const rawDate = parseResult.data.date || parseResult.data.dateKey;
    let dateKey: string;
    if (rawDate && /^\d{4}-\d{2}-\d{2}/.test(String(rawDate))) {
      dateKey = String(rawDate).substring(0, 10);
    } else {
      dateKey = getLocalDateString();
    }

    // 3. Upsert DailyHealthMetric in Neon Postgres for authenticated userId and date
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
          restingCalories: restingCalories ?? 0,
          totalCalories,
          avgHeartRate: heartRate,
          distanceMeters,
          workoutsCount: Math.round(workoutsCount ?? 0),
          hydrationMl: hydrationMl ?? 0,
          source: source || "Native Health Bridge",
          rawPayload: JSON.stringify(rawBody),
          syncedAt: new Date(),
        },
        update: {
          steps: Math.round(steps),
          activeCalories,
          restingCalories: restingCalories ?? 0,
          totalCalories,
          avgHeartRate: heartRate,
          distanceMeters,
          workoutsCount: Math.round(workoutsCount ?? 0),
          hydrationMl: hydrationMl ?? 0,
          source: source || "Native Health Bridge",
          rawPayload: JSON.stringify(rawBody),
          syncedAt: new Date(),
        },
      })
    );

    // 4. Return { success: true, metric }
    return NextResponse.json({
      success: true,
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
        error:
          error.message ||
          "Failed to persist health telemetry to Neon Postgres",
      },
      { status: 500 }
    );
  }
}
