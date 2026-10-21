import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import { hashPassword } from "@/lib/password";

// Secure staff invitation passcodes (configured via .env or secure fallbacks)
const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || "NF-ADMIN-2026-SECURE";
const KITCHEN_INVITE_CODE = process.env.KITCHEN_INVITE_CODE || "NF-KITCHEN-2026";
const TRAINER_INVITE_CODE = process.env.TRAINER_INVITE_CODE || "NF-TRAINER-2026";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      password,
      portal,
      inviteCode,
      outletId,
      referralCode,
    } = body;

    // 1. Basic validation
    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Full name is required" },
        { status: 400 }
      );
    }

    if (!email || !email.trim()) {
      return NextResponse.json(
        { success: false, error: "Email address is required" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { success: false, error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 2. Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // 3. Normalize portal selection
    const normalizedPortal = (portal || "").toLowerCase().trim();

    // 4. Role Authorization & Strict Security Verification
    let assignedRole: Role = Role.CUSTOMER;
    let targetOutletId: string | null = null;
    let targetGymId: string | null = null;

    if (normalizedPortal === "admin") {
      // Super Admin: Strictly requires authorized admin invite code
      const trimmedCode = (inviteCode || "").trim();
      if (!trimmedCode || trimmedCode !== ADMIN_INVITE_CODE) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid or missing Administrator Invitation Code. Super Admin registration requires an authorized administrator invitation.",
          },
          { status: 403 }
        );
      }
      assignedRole = Role.ADMIN;
    } else if (normalizedPortal === "kitchen") {
      // Kitchen Display Kiosk: Strictly requires authorized kiosk access code
      const trimmedCode = (inviteCode || "").trim();
      if (!trimmedCode || trimmedCode !== KITCHEN_INVITE_CODE) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid or missing Kitchen Access Code. Kitchen staff registration requires an authorized outlet access code.",
          },
          { status: 403 }
        );
      }
      assignedRole = Role.KITCHEN;

      // Assign specified outlet or default first available outlet
      if (outletId) {
        const foundOutlet = await prisma.outlet.findUnique({
          where: { id: outletId },
        });
        if (foundOutlet) {
          targetOutletId = foundOutlet.id;
          targetGymId = foundOutlet.gymId;
        }
      }

      if (!targetOutletId) {
        const defaultOutlet = await prisma.outlet.findFirst();
        if (defaultOutlet) {
          targetOutletId = defaultOutlet.id;
          targetGymId = defaultOutlet.gymId;
        }
      }
    } else if (normalizedPortal === "trainer") {
      // Trainer Partner: Strictly requires authorized partner passcode
      const trimmedCode = (inviteCode || "").trim();
      if (!trimmedCode || trimmedCode !== TRAINER_INVITE_CODE) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Invalid or missing Trainer Partner Passcode. Trainer registration requires an authorized partner passcode.",
          },
          { status: 403 }
        );
      }
      assignedRole = Role.TRAINER;
    } else {
      // Default: Public self-registration is strictly CUSTOMER only
      assignedRole = Role.CUSTOMER;
      const defaultOutlet = await prisma.outlet.findFirst();
      if (defaultOutlet) {
        targetOutletId = defaultOutlet.id;
        targetGymId = defaultOutlet.gymId;
      }
    }

    // 5. Create user in database (with transaction for trainer profile)
    const hashedPassword = hashPassword(password);

    if (assignedRole === Role.TRAINER) {
      // Generate unique referral code for trainer
      const rawHandle = (referralCode || name)
        .replace(/[^A-Za-z0-9]/g, "")
        .toUpperCase()
        .slice(0, 10);
      let candidateCode = rawHandle.startsWith("NUTRI")
        ? rawHandle
        : `NUTRI-${rawHandle || "PARTNER"}`;

      // Check collision
      let existingTrainer = await prisma.trainer.findUnique({
        where: { referralCode: candidateCode },
      });
      if (existingTrainer) {
        candidateCode = `${candidateCode}-${Math.floor(100 + Math.random() * 900)}`;
      }

      const result = await prisma.$transaction(async (tx) => {
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

    // Non-trainer user creation (CUSTOMER, KITCHEN, ADMIN)
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        phone: phone ? phone.trim() : null,
        passwordHash: hashedPassword,
        role: assignedRole,
        selectedGymId: targetGymId,
        selectedOutletId: targetOutletId,
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
      portal: normalizedPortal || "customer",
    });
  } catch (error: any) {
    console.error("User registration error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create account" },
      { status: 500 }
    );
  }
}
