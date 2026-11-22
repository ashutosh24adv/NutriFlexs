import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  getConsultationMessages,
  sendConsultationMessage,
} from "@/services/dietitian.service";
import { z } from "zod";

const messageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty"),
  imageUrl: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Authentication required to view messages." },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  try {
    const messages = await getConsultationMessages(params.id, userId, userRole);
    return NextResponse.json({ success: true, messages });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load messages." },
      { status: 403 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json(
      { success: false, error: "Authentication required to send messages." },
      { status: 401 }
    );
  }

  const userId = (session.user as any).id;
  const userRole = (session.user as any).role;

  try {
    const json = await req.json();
    const parsed = messageSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.errors[0]?.message || "Invalid message." },
        { status: 400 }
      );
    }

    const { content, imageUrl } = parsed.data;

    const message = await sendConsultationMessage({
      consultationId: params.id,
      senderId: userId,
      senderRole: userRole,
      content,
      imageUrl,
    });

    return NextResponse.json({ success: true, message });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send message." },
      { status: 403 }
    );
  }
}
