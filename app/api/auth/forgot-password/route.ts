import { NextResponse } from "next/server";
import { forgotPasswordSchema } from "@/lib/validations/auth.schema";
import { createPasswordResetToken } from "@/lib/password-reset";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  // 1. Sliding window rate limiting: max 5 requests per 15 minutes per IP
  const rateLimit = checkRateLimit({
    key: `forgot-password:${clientIp}`,
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many password reset requests. Please wait a few minutes before trying again.",
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
    const rawBody = await request.json();
    const parsed = forgotPasswordSchema.safeParse(rawBody);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Please provide a valid email address.";
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const { email } = parsed.data;
    const result = await createPasswordResetToken(email);

    return NextResponse.json({
      success: true,
      message:
        "If an account is associated with this email address, password reset instructions have been generated.",
      emailConfigured: result.emailConfigured,
      ...(!result.emailConfigured
        ? {
            emailNotice:
              "Email transport is not configured on this server. Contact system administrator for direct credential assistance.",
          }
        : {}),
      ...(result.devToken ? { devToken: result.devToken } : {}),
    });
  } catch (error: any) {
    console.error("Forgot password processing error:", error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to process password reset request right now. Please try again later.",
      },
      { status: 500 }
    );
  }
}
