import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const gyms = await prisma.gym.findMany({
      include: {
        outlets: true,
      },
      orderBy: { name: "asc" },
    });
    return NextResponse.json({ success: true, gyms });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
