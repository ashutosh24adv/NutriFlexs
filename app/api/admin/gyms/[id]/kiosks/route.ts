import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminCreateOutlet } from "@/services/gym.service";
import { z } from "zod";

const createOutletSchema = z.object({
  name: z.string().min(2, "Kiosk name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  phone: z.string().optional(),
  operatingHours: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isAvailable: z.boolean().optional(),
});

export async function POST(
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
    const parsed = createOutletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const outlet = await adminCreateOutlet(params.id, parsed.data);
    return NextResponse.json({ success: true, outlet });
  } catch (error: any) {
    console.error("Admin create kiosk error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to add kiosk to gym" },
      { status: 500 }
    );
  }
}

