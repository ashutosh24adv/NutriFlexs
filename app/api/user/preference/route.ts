import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ success: true, isVegetarian: false });
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase().trim() },
    select: { isVegetarian: true },
  });

  return NextResponse.json({
    success: true,
    isVegetarian: Boolean(user?.isVegetarian),
  });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: "Authentication required to update dietary preferences." },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const isVegetarian = Boolean(body.isVegetarian);

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email.toLowerCase().trim() },
      data: { isVegetarian },
      select: { id: true, email: true, isVegetarian: true },
    });

    return NextResponse.json({
      success: true,
      isVegetarian: updatedUser.isVegetarian,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update dietary preference." },
      { status: 500 }
    );
  }
}
