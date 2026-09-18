import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateGymSchema = z.object({
  gymId: z.string().min(1, "Gym ID is required"),
  outletId: z.string().min(1, "Outlet ID is required"),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({
      success: true,
      selectedGymId: null,
      selectedOutletId: null,
      gym: null,
      outlet: null,
    });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
    select: {
      selectedGymId: true,
      selectedOutletId: true,
      selectedGym: {
        select: {
          id: true,
          name: true,
          address: true,
          city: true,
        },
      },
      selectedOutlet: {
        select: {
          id: true,
          name: true,
          address: true,
          phone: true,
          isAvailable: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    selectedGymId: user?.selectedGymId || null,
    selectedOutletId: user?.selectedOutletId || null,
    gym: user?.selectedGym || null,
    outlet: user?.selectedOutlet || null,
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Authentication required to save preferred gym." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const parsed = updateGymSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid gym or outlet selection", details: parsed.error.issues },
        { status: 400 }
      );
    }

    const { gymId, outletId } = parsed.data;

    // Verify gym and outlet exist in database
    const outlet = await prisma.outlet.findFirst({
      where: {
        id: outletId,
        gymId: gymId,
        isAvailable: true,
      },
      include: {
        gym: true,
      },
    });

    if (!outlet) {
      return NextResponse.json(
        { success: false, error: "Selected outlet is not available or does not match the gym." },
        { status: 400 }
      );
    }

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email.toLowerCase().trim() },
      data: {
        selectedGymId: gymId,
        selectedOutletId: outletId,
      },
      select: {
        selectedGymId: true,
        selectedOutletId: true,
      },
    });

    return NextResponse.json({
      success: true,
      selectedGymId: updatedUser.selectedGymId,
      selectedOutletId: updatedUser.selectedOutletId,
      gym: outlet.gym,
      outlet,
    });
  } catch (error: any) {
    console.error("Failed to update user gym preference:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update gym selection" },
      { status: 500 }
    );
  }
}
