import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export interface KitchenAuthContext {
  userId: string;
  userEmail: string;
  userName: string;
  role: "KITCHEN" | "ADMIN";
  outletId: string;
  outletName: string;
  isAllOutletsPermitted: boolean;
}

/**
 * Validates that current session belongs to KITCHEN staff or ADMIN.
 * Resolves their assigned outlet, ensuring outlet-level isolation.
 */
export async function getKitchenAuthContext(requestedOutletId?: string | null): Promise<{
  error?: string;
  status?: number;
  context?: KitchenAuthContext;
}> {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return { error: "Authentication required to access Kitchen Operations.", status: 401 };
  }

  const role = (session.user as any)?.role;
  if (role !== "KITCHEN" && role !== "ADMIN") {
    return { error: "Unauthorized. Kitchen staff or Admin privileges required.", status: 403 };
  }

  const userEmail = session.user.email?.toLowerCase().trim() || "";
  let staffOutletId = (session.user as any)?.selectedOutletId;

  const dbUser = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, name: true, selectedOutletId: true, role: true },
  });

  if (!dbUser) {
    return { error: "User profile not found in system.", status: 401 };
  }

  staffOutletId = staffOutletId || dbUser.selectedOutletId;

  // If Admin, they can view requestedOutletId or fallback to first active outlet
  if (role === "ADMIN") {
    let targetOutletId = requestedOutletId || staffOutletId;
    if (!targetOutletId) {
      const firstOutlet = await prisma.outlet.findFirst({
        where: { isActive: true },
        select: { id: true, name: true },
      });
      targetOutletId = firstOutlet?.id;
    }

    if (!targetOutletId) {
      return { error: "No active kitchen outlets configured.", status: 404 };
    }

    const outlet = await prisma.outlet.findUnique({
      where: { id: targetOutletId },
      select: { id: true, name: true },
    });

    return {
      context: {
        userId: dbUser.id,
        userEmail,
        userName: dbUser.name,
        role: "ADMIN",
        outletId: targetOutletId,
        outletName: outlet?.name || "All Outlets (HQ)",
        isAllOutletsPermitted: true,
      },
    };
  }

  // If KITCHEN staff, they must have an assigned outlet
  if (!staffOutletId) {
    // Attempt fallback to first outlet if unassigned in dev
    const defaultOutlet = await prisma.outlet.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    });
    if (defaultOutlet) {
      staffOutletId = defaultOutlet.id;
      // Auto-assign
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { selectedOutletId: defaultOutlet.id },
      });
    } else {
      return { error: "Unauthorized: Kitchen staff has no assigned kiosk outlet.", status: 403 };
    }
  }

  // Prevent cross-outlet access for KITCHEN role
  if (requestedOutletId && requestedOutletId !== staffOutletId) {
    return {
      error: "Unauthorized: Kitchen staff can only manage their assigned kiosk outlet.",
      status: 403,
    };
  }

  const outlet = await prisma.outlet.findUnique({
    where: { id: staffOutletId },
    select: { id: true, name: true },
  });

  return {
    context: {
      userId: dbUser.id,
      userEmail,
      userName: dbUser.name,
      role: "KITCHEN",
      outletId: staffOutletId,
      outletName: outlet?.name || "Kiosk Kitchen",
      isAllOutletsPermitted: false,
    },
  };
}
