import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminUpdateGym, adminToggleGymActive } from "@/services/gym.service";
import { z } from "zod";

const updateGymSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  area: z.string().optional(),
  phone: z.string().optional(),
  operatingHours: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isActive: z.boolean().optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Super Admin access required." },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const parsed = updateGymSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const gym = await adminUpdateGym(params.id, parsed.data);
    return NextResponse.json({ success: true, gym });
  } catch (error: any) {
    console.error("Admin update gym error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update partner gym" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Super Admin access required." },
      { status: 403 }
    );
  }

  try {
    // Soft toggle / deactivate
    const gym = await adminToggleGymActive(params.id, false);
    return NextResponse.json({ success: true, gym, message: "Gym deactivated successfully" });
  } catch (error: any) {
    console.error("Admin deactivate gym error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to deactivate partner gym" },
      { status: 500 }
    );
  }
}

