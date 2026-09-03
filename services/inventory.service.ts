import { prisma } from "@/lib/prisma";

export async function getOutletInventory(outletId: string) {
  return await prisma.inventoryItem.findMany({
    where: { outletId },
    include: { ingredient: true },
  });
}
