import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminUpdateOutlet } from "@/services/gym.service";
import { z } from "zod";

const updateOutletSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(5).optional(),
  phone: z.string().optional(),
  operatingHours: z.string().optional(),
  isAvailable: z.boolean().optional(),
  isActive: z.boolean().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
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
    const parsed = updateOutletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const outlet = await adminUpdateOutlet(params.id, parsed.data);
    return NextResponse.json({ success: true, outlet });
  } catch (error: any) {
    console.error("Admin update kiosk error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update kiosk" },
      { status: 500 }
    );
  }
}

