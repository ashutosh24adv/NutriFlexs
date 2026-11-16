import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma, withDbRetry } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { safeErrorResponse } from "@/lib/api-security";

export const dynamic = "force-dynamic";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name cannot exceed 100 characters"),
  email: z
    .string()
    .trim()
    .email("Please provide a valid email address")
    .max(150, "Email cannot exceed 150 characters"),
  phone: z
    .string()
    .trim()
    .max(25, "Phone number cannot exceed 25 characters")
    .optional()
    .nullable(),
  category: z.enum(
    [
      "General Enquiry",
      "Food Order Support",
      "Nutrition Tracker Support",
      "AI Meal Scanner Support",
      "Payment Issue",
      "Gym Partnership",
      "Trainer Partnership",
      "Feedback or Suggestion",
      "Other",
    ],
    {
      errorMap: () => ({ message: "Please select an enquiry category" }),
    }
  ),
  orderId: z
    .string()
    .trim()
    .max(60, "Order ID cannot exceed 60 characters")
    .optional()
    .nullable(),
  message: z
    .string()
    .trim()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message cannot exceed 2000 characters"),
});

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);

  // 1. Rate limiting: Max 5 submissions per IP per 10 minutes
  const rateLimit = checkRateLimit({
    key: `contact:${clientIp}`,
    maxRequests: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many contact submissions. Please wait a few minutes before trying again.",
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rateLimit.resetMs / 1000).toString(),
        },
      }
    );
  }

  try {
    const rawBody = await req.json();

    // 2. Strict Zod validation
    const parsed = contactSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input data";
      return NextResponse.json(
        { success: false, error: firstError },
        { status: 400 }
      );
    }

    const { name, email, phone, category, orderId, message } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // 3. Optional authenticated user association
    const session = await getServerSession(authOptions);
    const authenticatedUserId = (session?.user as any)?.id || null;

    // 4. Duplicate / spam check (same email + same message within 3 minutes)
    const threeMinutesAgo = new Date(Date.now() - 3 * 60 * 1000);
    const existingRecent = await withDbRetry(() =>
      prisma.contactSubmission.findFirst({
        where: {
          email: normalizedEmail,
          message: message.trim(),
          createdAt: { gte: threeMinutesAgo },
        },
      })
    );

    if (existingRecent) {
      return NextResponse.json(
        {
          success: true,
          message:
            "Your message was already received. Our support team is reviewing it.",
          submissionId: existingRecent.id,
          isDuplicate: true,
        },
        { status: 200 }
      );
    }

    // 5. Store submission in Neon PostgreSQL
    const submission = await withDbRetry(() =>
      prisma.contactSubmission.create({
        data: {
          name: name.trim(),
          email: normalizedEmail,
          phone: phone ? phone.trim() : null,
          category,
          orderId: orderId ? orderId.trim() : null,
          message: message.trim(),
          userId: authenticatedUserId,
          status: "NEW",
        },
        select: {
          id: true,
          name: true,
          email: true,
          category: true,
          createdAt: true,
        },
      })
    );

    // Email notification note: No external email provider is currently configured in package.json.
    // The message is stored in Neon PostgreSQL for admin review.
    return NextResponse.json(
      {
        success: true,
        message: "Thank You for Reaching Out! Your message has been received.",
        submissionId: submission.id,
        emailDeliveryNotice: "Message safely recorded in database. Outbound email requires SMTP provider configuration.",
      },
      { status: 201 }
    );
  } catch (error: any) {
    return safeErrorResponse(
      error,
      "We're temporarily unable to record your inquiry. Please try again shortly.",
      500
    );
  }
}

