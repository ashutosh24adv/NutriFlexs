import { NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validations/auth.schema";
import { verifyAndResetPassword } from "@/lib/password-reset";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  // 1. Sliding window rate limiting: max 10 reset attempts per 15 minutes per IP
  const rateLimit = checkRateLimit({
    key: `reset-password:${clientIp}`,
    maxRequests: 10,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many password reset attempts. Please wait 15 minutes before trying again.",
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
    const parsed = resetPasswordSchema.safeParse(rawBody);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input data.";
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const { token, newPassword } = parsed.data;
    const result = await verifyAndResetPassword({ token, newPassword });

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Your password has been successfully reset. You may now log in with your new credentials.",
    });
  } catch (error: any) {
    console.error("Reset password processing error:", error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: "Unable to complete password reset at this time. Please try again later.",
      },
      { status: 500 }
    );
  }
}
