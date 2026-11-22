import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  bookConsultation,
  getCustomerConsultations,
  getDietitianConsultations,
} from "@/services/dietitian.service";
import { ConsultationType } from "@prisma/client";
import { z } from "zod";

const bookConsultationSchema = z.object({
  dietitianId: z.string().min(1, "Dietitian ID is required"),
  scheduledDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Valid date is required"),
  timeSlot: z.string().min(1, "Time slot is required"),
  consultationType: z.nativeEnum(ConsultationType).default(ConsultationType.ONLINE),
  primaryConcern: z.string().min(5, "Please describe your primary health goal or concern (min 5 chars)"),
  healthNotes: z.string().optional(),
});

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Authentication required to view consultations." },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  try {
    if (userRole === "DIETITIAN") {
      const consultations = await getDietitianConsultations(userId);
      return NextResponse.json({ success: true, consultations });
    } else {
      const consultations = await getCustomerConsultations(userId);
      return NextResponse.json({ success: true, consultations });
    }
  } catch (error: any) {
    console.error("[API /api/consultations GET] Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load consultations." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Please sign in to your NutriFlexs account to book an appointment." },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;

  try {
    const json = await req.json();
    const parsed = bookConsultationSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.errors.map((e) => e.message).join(", "),
        },
        { status: 400 }
      );
    }

    const { dietitianId, scheduledDate, timeSlot, consultationType, primaryConcern, healthNotes } =
      parsed.data;

    const consultation = await bookConsultation({
      customerId: userId,
      dietitianId,
      scheduledDate: new Date(scheduledDate),
      timeSlot,
      consultationType,
      primaryConcern,
      healthNotes,
    });

    return NextResponse.json({
      success: true,
      consultation,
    });
  } catch (error: any) {
    console.error("[API /api/consultations POST] Error:", error);
    const isConflict =
      error.message?.includes("already been booked") ||
      error.message?.includes("reserved") ||
      error.message?.includes("conflict");

    return NextResponse.json(
      { success: false, error: error.message || "Failed to book consultation." },
      { status: isConflict ? 409 : 400 }
    );
  }
}
