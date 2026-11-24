import React from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  if (!session) {
    redirect("/login?staff=true&portal=trainer&callbackUrl=/trainer");
  }

  if (role !== "TRAINER" && role !== "ADMIN" && role !== "SUPER_ADMIN") {
    redirect("/login?staff=true&portal=trainer&error=unauthorized_role");
  }

  return (
    <div className="min-h-screen bg-[#F7FAF4] text-[#111111]">
      {children}
    </div>
  );
}
