import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getConsultationById,
  updateConsultationStatus,
} from "@/services/dietitian.service";
import { ConsultationStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  try {
    const consultation = await getConsultationById(params.id, userId, userRole);
    if (!consultation) {
      return NextResponse.json(
        { success: false, error: "Consultation not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, consultation });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load consultation." },
      { status: 403 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Authentication required." },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  try {
    const body = await req.json();
    const { status, reason } = body;

    if (!status || !Object.values(ConsultationStatus).includes(status)) {
      return NextResponse.json(
        { success: false, error: "Valid consultation status is required." },
        { status: 400 }
      );
    }

    const updated = await updateConsultationStatus(
      params.id,
      userId,
      userRole,
      status as ConsultationStatus,
      reason
    );

    return NextResponse.json({ success: true, consultation: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update consultation status." },
      { status: 400 }
    );
  }
}
