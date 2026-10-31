import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@prisma/client";
import {
  hashAccessCode,
  generateSecureAccessCode,
  normalizeAccessCode,
} from "@/lib/staff-access-codes";
import {
  createStaffAccessCodeSchema,
  revokeStaffAccessCodeSchema,
} from "@/lib/validations/auth.schema";

/**
 * Super Admin Access Code Management API
 *
 * Strictly restricted to users with Role.ADMIN.
 * - GET: List all staff access codes (hashes and plaintext codes are never returned).
 * - POST: Generate a new staff access code (plaintext code returned ONLY once upon generation).
 * - PATCH: Revoke an existing staff access code.
 */

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
    const codes = await prisma.staffAccessCode.findMany({
      include: {
        outlet: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const safeCodes = codes.map((c) => ({
      id: c.id,
      codePrefix: c.codePrefix || "NF-STAFF",
      role: c.role,
      outletId: c.outletId,
      outletName: c.outlet?.name || null,
      isActive: c.isActive,
      expiresAt: c.expiresAt,
      maxUses: c.maxUses,
      usedCount: c.usedCount,
      description: c.description,
      isDevSeed: c.isDevSeed,
      createdAt: c.createdAt,
      createdByName: c.createdBy?.name || (c.isDevSeed ? "System Seed" : "Admin"),
    }));

    return NextResponse.json({ success: true, codes: safeCodes });
  } catch (error: any) {
    console.error("Error fetching staff access codes:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load access codes" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;
  const currentUserId = (session?.user as any)?.id;

  if (!session || userRole !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Super Admin access required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = createStaffAccessCodeSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid access code data";
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const { role, outletId, expiresAt, maxUses, description, customCode } = parsed.data;

    // Validate outlet if role is KITCHEN and outletId provided
    let verifiedOutletId: string | null = null;
    if (role === "KITCHEN" && outletId) {
      const foundOutlet = await prisma.outlet.findUnique({
        where: { id: outletId },
      });
      if (!foundOutlet) {
        return NextResponse.json(
          { success: false, error: "Specified kitchen outlet does not exist." },
          { status: 400 }
        );
      }
      verifiedOutletId = foundOutlet.id;
    }

    // Determine code string: either custom provided or securely generated
    const targetRole = role as Role;
    const plaintextCode = customCode
      ? normalizeAccessCode(customCode)
      : generateSecureAccessCode(targetRole);

    const codeHash = hashAccessCode(plaintextCode);

    // Check collision
    const existing = await prisma.staffAccessCode.findUnique({
      where: { codeHash },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "An identical access code already exists. Please choose another or re-generate." },
        { status: 409 }
      );
    }

    const prefix = plaintextCode.slice(0, Math.min(10, plaintextCode.length - 4)) || "NF-STAFF";

    const record = await prisma.staffAccessCode.create({
      data: {
        codeHash,
        codePrefix: prefix,
        role: targetRole,
        outletId: verifiedOutletId,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        maxUses: maxUses || 1,
        usedCount: 0,
        isActive: true,
        description: description || null,
        isDevSeed: false,
        createdById: currentUserId || null,
      },
      include: {
        outlet: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Access code successfully created. Store the plaintext code securely now.",
      // Plaintext code is returned ONCE upon creation to the admin
      plaintextCode,
      code: {
        id: record.id,
        codePrefix: record.codePrefix,
        role: record.role,
        outletId: record.outletId,
        outletName: record.outlet?.name || null,
        isActive: record.isActive,
        expiresAt: record.expiresAt,
        maxUses: record.maxUses,
        usedCount: record.usedCount,
        description: record.description,
        isDevSeed: record.isDevSeed,
        createdAt: record.createdAt,
      },
    });
  } catch (error: any) {
    console.error("Error creating staff access code:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create access code" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as any)?.role;

  if (!session || userRole !== "ADMIN") {
    return NextResponse.json(
      { success: false, error: "Unauthorized. Super Admin access required." },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const parsed = revokeStaffAccessCodeSchema.safeParse(body);

    if (!parsed.success) {
      const errorMsg = parsed.error.issues[0]?.message || "Invalid payload";
      return NextResponse.json({ success: false, error: errorMsg }, { status: 400 });
    }

    const { id, isActive } = parsed.data;

    const record = await prisma.staffAccessCode.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        codePrefix: true,
        role: true,
        isActive: true,
        usedCount: true,
        maxUses: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: isActive ? "Access code re-activated." : "Access code revoked successfully.",
      code: record,
    });
  } catch (error: any) {
    console.error("Error updating staff access code:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update access code" },
      { status: 500 }
    );
  }
}
