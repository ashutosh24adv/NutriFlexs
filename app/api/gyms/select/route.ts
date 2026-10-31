import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { validateAndSelectGym } from "@/services/gym.service";
import { z } from "zod";

const selectSchema = z.object({
  gymId: z.string().min(1, "Gym ID is required"),
  outletId: z.string().min(1, "Outlet ID is required"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;

    const body = await req.json();
    const parsed = selectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors[0]?.message || "Invalid gym or outlet selection",
        },
        { status: 400 }
      );
    }

    const { gymId, outletId } = parsed.data;

    const result = await validateAndSelectGym(gymId, outletId, userId);

    return NextResponse.json({
      success: true,
      gym: result.gym,
      outlet: result.outlet,
    });
  } catch (error: any) {
    console.error("Gym selection validation error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to validate pickup location",
      },
      { status: 400 }
    );
  }
}

