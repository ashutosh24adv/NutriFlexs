import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { adminGetAllGyms, adminCreateGym } from "@/services/gym.service";
import { z } from "zod";

const createGymSchema = z.object({
  name: z.string().min(2, "Gym name must be at least 2 characters"),
  address: z.string().min(5, "Address must be at least 5 characters"),
  city: z.string().min(2, "City is required"),
  area: z.string().optional(),
  phone: z.string().optional(),
  operatingHours: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  kioskName: z.string().optional(),
  kioskAddress: z.string().optional(),
  kioskPhone: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Super Admin access required." },
      { status: 403 }
    );
  }

  try {
    const gyms = await adminGetAllGyms();
    return NextResponse.json({ success: true, gyms });
  } catch (error: any) {
    console.error("Admin fetch gyms error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch gyms" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
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
    const parsed = createGymSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid input data" },
        { status: 400 }
      );
    }

    const gym = await adminCreateGym(parsed.data);
    return NextResponse.json({ success: true, gym });
  } catch (error: any) {
    console.error("Admin create gym error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create partner gym" },
      { status: 500 }
    );
  }
}

