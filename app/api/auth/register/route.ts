import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hashPassword } from "@/lib/password";
import { validateAndConsumeStaffCode } from "@/lib/staff-access-codes";
import { registerSchema } from "@/lib/validations/auth.schema";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(request: Request) {
  const clientIp = getClientIp(request);

  // 1. Rate limiting: Max 20 registration attempts per IP per 15 minutes
  const rateLimit = checkRateLimit({
    key: `register:${clientIp}`,
    maxRequests: 20,
    windowMs: 15 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      {
        success: false,
        error: "Too many registration attempts. Please try again later.",
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

    // 2. Strict Zod validation
    const parsed = registerSchema.safeParse(rawBody);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || "Invalid input data";
      return NextResponse.json({ success: false, error: firstError }, { status: 400 });
    }

    const {
      name,
      email,
      phone,
      password,
      portal,
      inviteCode,
      accessCode,
      outletId,
      referralCode,
    } = parsed.data;

    const normalizedEmail = email.toLowerCase().trim();

    // 3. Prevent duplicate email registration
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // 4. Normalize portal selection
    const normalizedPortal = (portal || "").toLowerCase().trim();
    const providedCode = (accessCode || inviteCode || "").trim();

    // 5. Staff Role Security & Registration Handling
    const hashedPassword = hashPassword(password);

    // KITCHEN STAFF REGISTRATION
    if (normalizedPortal === "kitchen") {
      if (!providedCode) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Kitchen Access Code is required. Kitchen staff registration requires an authorized outlet access code.",
          },
          { status: 403 }
        );
      }

      // Execute code consumption and user creation atomically in transaction
      const result = await prisma.$transaction(async (tx) => {
        // Validate and atomically consume code
        const validation = await validateAndConsumeStaffCode({
          code: providedCode,
          requiredRole: Role.KITCHEN,
          requestedOutletId: outletId,
          tx,
        });

        if (!validation.valid || !validation.outletId) {
          throw new Error(validation.error || "Invalid or unauthorized staff access code.");
        }

        // Verify authorized outlet
        const foundOutlet = await tx.outlet.findUnique({
          where: { id: validation.outletId },
        });

        if (!foundOutlet) {
          throw new Error("Assigned kitchen outlet could not be found.");
        }

        const newUser = await tx.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            phone: phone ? phone.trim() : null,
            passwordHash: hashedPassword,
            role: Role.KITCHEN,
            selectedOutletId: foundOutlet.id,
            selectedGymId: foundOutlet.gymId,
            streakDays: 1,
            proteinGoalGrams: 120,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            selectedOutletId: true,
          },
        });

        return newUser;
      });

      return NextResponse.json({
        success: true,
        user: result,
        portal: "kitchen",
      });
    }

    // TRAINER PARTNER REGISTRATION
    if (normalizedPortal === "trainer") {
      if (!providedCode) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Trainer Partner Passcode is required. Trainer registration requires an authorized partner passcode.",
          },
          { status: 403 }
        );
      }

      // Generate unique referral code for trainer
      const rawHandle = (referralCode || name)
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase()
        .slice(0, 10);
      let candidateCode = rawHandle.startsWith("NUTRI")
        ? rawHandle
        : `NUTRI-${rawHandle || "PARTNER"}`;

      let existingTrainer = await prisma.trainer.findUnique({
        where: { referralCode: candidateCode },
      });
      if (existingTrainer) {
        candidateCode = `${candidateCode}-${Math.floor(100 + Math.random() * 900)}`;
      }

      const result = await prisma.$transaction(async (tx) => {
        const validation = await validateAndConsumeStaffCode({
          code: providedCode,
          requiredRole: Role.TRAINER,
          tx,
        });

        if (!validation.valid) {
          throw new Error(validation.error || "Invalid or unauthorized staff access code.");
        }

        const newUser = await tx.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            phone: phone ? phone.trim() : null,
            passwordHash: hashedPassword,
            role: Role.TRAINER,
            streakDays: 1,
            proteinGoalGrams: 120,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });

        const newTrainer = await tx.trainer.create({
          data: {
            userId: newUser.id,
            referralCode: candidateCode,
            totalReferrals: 0,
            activeSubscribers: 0,
            rewardsEarned: 0,
          },
        });

        return { user: newUser, trainer: newTrainer };
      });

      return NextResponse.json({
        success: true,
        user: result.user,
        portal: "trainer",
        referralCode: result.trainer.referralCode,
      });
    }

    // SUPER ADMIN REGISTRATION
    if (normalizedPortal === "admin") {
      if (!providedCode) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Administrator Invitation Key is required. Super Admin registration requires an authorized administrator invitation.",
          },
          { status: 403 }
        );
      }

      const result = await prisma.$transaction(async (tx) => {
        const validation = await validateAndConsumeStaffCode({
          code: providedCode,
          requiredRole: Role.ADMIN,
          tx,
        });

        if (!validation.valid) {
          throw new Error(validation.error || "Invalid or unauthorized staff access code.");
        }

        const newUser = await tx.user.create({
          data: {
            name: name.trim(),
            email: normalizedEmail,
            phone: phone ? phone.trim() : null,
            passwordHash: hashedPassword,
            role: Role.ADMIN,
            streakDays: 1,
            proteinGoalGrams: 120,
          },
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        });

        return newUser;
      });

      return NextResponse.json({
        success: true,
        user: result,
        portal: "admin",
      });
    }

    // CUSTOMER REGISTRATION (Public, strictly CUSTOMER role only)
    const defaultOutlet = await prisma.outlet.findFirst();

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        passwordHash: hashedPassword,
        role: Role.CUSTOMER, // Strict: never allows privileged role in public registration
        selectedGymId: defaultOutlet?.gymId || null,
        selectedOutletId: defaultOutlet?.id || null,
        streakDays: 1,
        proteinGoalGrams: 120,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        selectedOutletId: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: newUser,
      portal: "customer",
    });
  } catch (error: any) {
    console.error("User registration error:", error);

    // If an error came from access code validation during transaction, return 403
    if (
      error.message &&
      (error.message.includes("access code") ||
        error.message.includes("authorized") ||
        error.message.includes("outlet"))
    ) {
      return NextResponse.json({ success: false, error: error.message }, { status: 403 });
    }

    return NextResponse.json(
      { success: false, error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
