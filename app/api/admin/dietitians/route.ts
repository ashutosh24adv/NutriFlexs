import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  adminGetAllDietitians,
  adminVerifyDietitian,
} from "@/services/dietitian.service";
import { DietitianVerificationStatus } from "@prisma/client";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: "Super Admin privileges required." },
      { status: 403 }
    );
  }

  try {
    const dietitians = await adminGetAllDietitians();
    return NextResponse.json({ success: true, dietitians });
  } catch (error: any) {
    console.error("[API Admin Dietitians GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load dietitian applications." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (userRole !== "ADMIN" && userRole !== "SUPER_ADMIN") {
    return NextResponse.json(
      { success: false, error: "Super Admin privileges required." },
      { status: 403 }
    );
  }

  try {
    const { id, status } = await req.json();

    if (!id || !status || !Object.values(DietitianVerificationStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: "Valid dietitian ID and status (APPROVED, REJECTED, SUSPENDED, PENDING) required." },
        { status: 400 }
      );
    }

    const updated = await adminVerifyDietitian(id, status as DietitianVerificationStatus);

    return NextResponse.json({
      success: true,
      dietitian: updated,
    });
  } catch (error: any) {
    console.error("[API Admin Dietitians PATCH] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update dietitian verification status." },
      { status: 500 }
    );
  }
}
