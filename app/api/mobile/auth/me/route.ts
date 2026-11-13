import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    // Attempt to find customer in Neon PostgreSQL
    let user = await prisma.user.findFirst({
      where: { role: "CUSTOMER" },
    });

    if (!user) {
      user = await prisma.user.findFirst();
    }

    if (user) {
      const nameParts = (user.name || "Nutri Member").trim().split(" ");
      const avatarInitials =
        nameParts.length >= 2
          ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
          : (user.name || "NM").substring(0, 2).toUpperCase();

      return NextResponse.json({
        success: true,
        user: {
          id: user.id,
          name: user.name || "Nutri Member",
          phone: user.phone || "+91 98765 43210",
          email: user.email,
          membershipTier: "PRO",
          homeKiosk: "Cult.fit HSR Layout, Bengaluru",
          passBalance: 1500,
          memberCode: `NF-${user.id.substring(0, 6).toUpperCase()}`,
          avatarInitials,
          targets: {
            calories: 2000,
            proteinGrams: user.proteinGoalGrams || 120,
            carbsGrams: 250,
            fatGrams: 65,
            waterMl: 3000,
          },
        },
      });
    }

    // Default member if no users in DB yet
    return NextResponse.json({
      success: true,
      user: {
        id: "usr_athlete_01",
        name: "Nutri Member",
        phone: "+91 98765 43210",
        email: "athlete@nutriflex.fit",
        membershipTier: "PRO",
        homeKiosk: "Cult.fit HSR Layout, Bengaluru",
        passBalance: 1500,
        memberCode: "NF-PRO",
        avatarInitials: "NM",
        targets: {
          calories: 2000,
          proteinGrams: 120,
          carbsGrams: 250,
          fatGrams: 65,
          waterMl: 3000,
        },
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        success: true,
        user: {
          id: "usr_athlete_fallback",
          name: "Nutri Member",
          phone: "+91 98765 43210",
          email: "athlete@nutriflex.fit",
          membershipTier: "PRO",
          homeKiosk: "Cult.fit HSR Layout, Bengaluru",
          passBalance: 1500,
          memberCode: "NF-PRO",
          avatarInitials: "NM",
        },
      },
      { status: 200 }
    );
  }
}

