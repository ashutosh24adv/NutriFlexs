import { prisma, withDbRetry } from "@/lib/prisma";
import { KitchenMovementType } from "@prisma/client";

export interface InventoryItemDTO {
  id: string;
  outletId: string;
  ingredientId: string;
  name: string;
  isOrganic: boolean;
  category: string;
  quantity: number;
  reservedQuantity: number;
  netAvailable: number;
  unit: string;
  lowStockThreshold: number;
  maxStockThreshold?: number | null;
  purchasePricePerUnit: number;
  supplier?: string | null;
  batchNumber?: string | null;
  expiryDate?: Date | null;
  storageLocation?: string | null;
  notes?: string | null;
  status: "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRING_SOON" | "EXPIRED";
  daysUntilExpiry?: number | null;
  valuation: number;
  updatedAt: Date;
}

export function computeItemStatus(
  quantity: number,
  lowStockThreshold: number,
  expiryDate?: Date | null
): "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK" | "EXPIRING_SOON" | "EXPIRED" {
  const now = new Date();

  if (expiryDate) {
    const exp = new Date(expiryDate);
    if (exp < now) return "EXPIRED";
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 5) return "EXPIRING_SOON";
  }

  if (quantity <= 0) return "OUT_OF_STOCK";
  if (quantity <= lowStockThreshold) return "LOW_STOCK";
  return "IN_STOCK";
}

/**
 * Returns overall inventory summary KPIs for an outlet.
 */
export async function getKitchenInventoryOverview(outletId: string) {
  const items = await withDbRetry(() =>
    prisma.inventoryItem.findMany({
      where: { outletId, isActive: true },
      include: { ingredient: true },
    })
  );

  let totalValuation = 0;
  let inStockCount = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let expiringSoonCount = 0;
  let expiredCount = 0;

  const lowStockAlerts: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    threshold: number;
    status: string;
  }> = [];

  for (const item of items) {
    const status = computeItemStatus(item.quantity, item.lowStockThreshold, item.expiryDate);
    const val = item.quantity * (item.purchasePricePerUnit || 0);
    totalValuation += val;

    if (status === "EXPIRED") expiredCount++;
    else if (status === "EXPIRING_SOON") expiringSoonCount++;
    else if (status === "OUT_OF_STOCK") outOfStockCount++;
    else if (status === "LOW_STOCK") lowStockCount++;
    else inStockCount++;

    if (status === "LOW_STOCK" || status === "OUT_OF_STOCK" || status === "EXPIRING_SOON") {
      lowStockAlerts.push({
        id: item.id,
        name: item.ingredient.name,
        quantity: item.quantity,
        unit: item.unit,
        threshold: item.lowStockThreshold,
        status,
      });
    }
  }

  return {
    totalItems: items.length,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    expiringSoonCount,
    expiredCount,
    totalValuation: Math.round(totalValuation * 100) / 100,
    lowStockAlerts: lowStockAlerts.slice(0, 10),
  };
}

/**
 * Fetches filtered and paginated inventory items for an outlet.
 */
export async function getKitchenInventoryItems(params: {
  outletId: string;
  search?: string;
  category?: string;
  statusFilter?: string; // all, in_stock, low_stock, out_of_stock, expiring_soon, expired
  page?: number;
  limit?: number;
}) {
  const { outletId, search = "", category, statusFilter = "all", page = 1, limit = 50 } = params;

  const where: any = {
    outletId,
    isActive: true,
  };

  if (category && category !== "All") {
    where.category = category;
  }

  if (search.trim()) {
    where.ingredient = {
      name: { contains: search.trim(), mode: "insensitive" },
    };
  }

  const rawItems = await withDbRetry(() =>
    prisma.inventoryItem.findMany({
      where,
      include: { ingredient: true },
      orderBy: [{ ingredient: { name: "asc" } }],
    })
  );

  const now = new Date();
  const mapped: InventoryItemDTO[] = rawItems.map((item) => {
    const status = computeItemStatus(item.quantity, item.lowStockThreshold, item.expiryDate);
    let daysUntilExpiry: number | null = null;
    if (item.expiryDate) {
      daysUntilExpiry = Math.ceil(
        (new Date(item.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
    }

    const netAvailable = Math.max(0, item.quantity - (item.reservedQuantity || 0));
    const valuation = Math.round(item.quantity * (item.purchasePricePerUnit || 0) * 100) / 100;

    return {
      id: item.id,
      outletId: item.outletId,
      ingredientId: item.ingredientId,
      name: item.ingredient.name,
      isOrganic: item.ingredient.isOrganic,
      category: item.category || "General",
      quantity: Math.round(item.quantity * 100) / 100,
      reservedQuantity: Math.round((item.reservedQuantity || 0) * 100) / 100,
      netAvailable: Math.round(netAvailable * 100) / 100,
      unit: item.unit,
      lowStockThreshold: item.lowStockThreshold,
      maxStockThreshold: item.maxStockThreshold,
      purchasePricePerUnit: item.purchasePricePerUnit || 0,
      supplier: item.supplier,
      batchNumber: item.batchNumber,
      expiryDate: item.expiryDate,
      storageLocation: item.storageLocation,
      notes: item.notes,
      status,
      daysUntilExpiry,
      valuation,
      updatedAt: item.updatedAt,
    };
  });

  // Filter in memory for precise status
  let filtered = mapped;
  if (statusFilter && statusFilter !== "all") {
    const upper = statusFilter.toUpperCase();
    filtered = mapped.filter((item) => item.status === upper);
  }

  const total = filtered.length;
  const startIndex = (page - 1) * limit;
  const paginated = filtered.slice(startIndex, startIndex + limit);

  return {
    items: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Creates or updates an inventory item for an outlet.
 */
export async function upsertKitchenInventoryItem(params: {
  outletId: string;
  ingredientName: string;
  category: string;
  unit: string;
  quantity: number;
  lowStockThreshold: number;
  maxStockThreshold?: number | null;
  purchasePricePerUnit?: number;
  supplier?: string | null;
  batchNumber?: string | null;
  expiryDate?: string | Date | null;
  storageLocation?: string | null;
  notes?: string | null;
  userId?: string;
}) {
  const {
    outletId,
    ingredientName,
    category,
    unit,
    quantity,
    lowStockThreshold,
    maxStockThreshold,
    purchasePricePerUnit = 0,
    supplier,
    batchNumber,
    expiryDate,
    storageLocation,
    notes,
    userId,
  } = params;

  const trimmedName = ingredientName.trim();
  const parsedExpiry = expiryDate ? new Date(expiryDate) : null;

  return await prisma.$transaction(async (tx) => {
    // 1. Find or create ingredient
    let ingredient = await tx.ingredient.findUnique({
      where: { name: trimmedName },
    });

    if (!ingredient) {
      ingredient = await tx.ingredient.create({
        data: {
          name: trimmedName,
          isOrganic: true,
        },
      });
    }

    // 2. Check if item exists in this outlet
    const existing = await tx.inventoryItem.findUnique({
      where: {
        outletId_ingredientId: {
          outletId,
          ingredientId: ingredient.id,
        },
      },
    });

    if (existing) {
      const prevQty = existing.quantity;
      const updated = await tx.inventoryItem.update({
        where: { id: existing.id },
        data: {
          category,
          unit,
          quantity,
          lowStockThreshold,
          maxStockThreshold,
          purchasePricePerUnit,
          supplier,
          batchNumber,
          expiryDate: parsedExpiry,
          storageLocation,
          notes,
          isActive: true,
        },
        include: { ingredient: true },
      });

      // Record movement if quantity changed
      const delta = quantity - prevQty;
      if (Math.abs(delta) > 0.0001) {
        await tx.kitchenInventoryMovement.create({
          data: {
            outletId,
            inventoryItemId: existing.id,
            ingredientId: ingredient.id,
            movementType: delta > 0 ? KitchenMovementType.STOCK_RECEIVED : KitchenMovementType.MANUAL_ADJUSTMENT,
            quantity: Math.abs(delta),
            previousStock: prevQty,
            newStock: quantity,
            reason: "Inventory item details / stock updated",
            userId: userId || null,
            cost: Math.abs(delta) * purchasePricePerUnit,
          },
        });
      }

      return updated;
    } else {
      const created = await tx.inventoryItem.create({
        data: {
          outletId,
          ingredientId: ingredient.id,
          category,
          unit,
          quantity,
          reservedQuantity: 0,
          lowStockThreshold,
          maxStockThreshold,
          purchasePricePerUnit,
          supplier,
          batchNumber,
          expiryDate: parsedExpiry,
          storageLocation,
          notes,
          isActive: true,
        },
        include: { ingredient: true },
      });

      if (quantity > 0) {
        await tx.kitchenInventoryMovement.create({
          data: {
            outletId,
            inventoryItemId: created.id,
            ingredientId: ingredient.id,
            movementType: KitchenMovementType.STOCK_RECEIVED,
            quantity,
            previousStock: 0,
            newStock: quantity,
            reason: "Initial stock registration",
            userId: userId || null,
            cost: quantity * purchasePricePerUnit,
          },
        });
      }

      return created;
    }
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Restocks / receives newly purchased stock.
 */
export async function receiveKitchenStock(params: {
  outletId: string;
  inventoryItemId: string;
  quantityReceived: number;
  costPerUnit: number;
  supplier: string;
  batchNumber?: string | null;
  expiryDate?: string | Date | null;
  notes?: string | null;
  userId?: string;
}) {
  const {
    outletId,
    inventoryItemId,
    quantityReceived,
    costPerUnit,
    supplier,
    batchNumber,
    expiryDate,
    notes,
    userId,
  } = params;

  if (quantityReceived <= 0) {
    throw new Error("Quantity received must be greater than zero.");
  }

  const parsedExpiry = expiryDate ? new Date(expiryDate) : null;
  const totalCost = Math.round(quantityReceived * costPerUnit * 100) / 100;
  const receiptNumber = `REC-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;

  return await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { ingredient: true },
    });

    if (!item || item.outletId !== outletId) {
      throw new Error("Inventory item not found for this outlet.");
    }

    const prevStock = item.quantity;
    const newStock = prevStock + quantityReceived;

    // Weighted average purchase price calculation
    const existingVal = prevStock * (item.purchasePricePerUnit || 0);
    const addedVal = quantityReceived * costPerUnit;
    const newAvgPrice = newStock > 0 ? Math.round(((existingVal + addedVal) / newStock) * 100) / 100 : costPerUnit;

    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: newStock,
        purchasePricePerUnit: newAvgPrice,
        supplier: supplier || item.supplier,
        batchNumber: batchNumber || item.batchNumber,
        expiryDate: parsedExpiry || item.expiryDate,
      },
      include: { ingredient: true },
    });

    // Create Purchase Receipt
    const receipt = await tx.kitchenPurchaseReceipt.create({
      data: {
        outletId,
        receiptNumber,
        supplier: supplier || "Direct Supplier",
        totalCost,
        notes: notes || `Restocked ${quantityReceived} ${item.unit} of ${item.ingredient.name}`,
        receivedById: userId || null,
        items: {
          create: {
            inventoryItemId: item.id,
            ingredientId: item.ingredientId,
            quantity: quantityReceived,
            unit: item.unit,
            costPerUnit,
            totalCost,
            batchNumber: batchNumber || null,
            expiryDate: parsedExpiry || null,
          },
        },
      },
    });

    // Create stock movement
    await tx.kitchenInventoryMovement.create({
      data: {
        outletId,
        inventoryItemId: item.id,
        ingredientId: item.ingredientId,
        movementType: KitchenMovementType.STOCK_RECEIVED,
        quantity: quantityReceived,
        previousStock: prevStock,
        newStock,
        reason: `Stock receipt #${receiptNumber} from ${supplier || "Supplier"}`,
        userId: userId || null,
        batchNumber: batchNumber || null,
        cost: totalCost,
      },
    });

    return {
      success: true,
      updatedItem,
      receiptNumber,
      newStock,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Adjusts inventory stock for damage, spoilage, manual corrections, or returns.
 */
export async function adjustKitchenStock(params: {
  outletId: string;
  inventoryItemId: string;
  adjustmentType: "ADD" | "DEDUCT" | "SET";
  quantity: number;
  reason: string;
  userId?: string;
}) {
  const { outletId, inventoryItemId, adjustmentType, quantity, reason, userId } = params;

  if (quantity < 0) {
    throw new Error("Quantity value must be non-negative.");
  }
  if (!reason || !reason.trim()) {
    throw new Error("A specific adjustment reason is strictly required for audit trails.");
  }

  return await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { ingredient: true },
    });

    if (!item || item.outletId !== outletId) {
      throw new Error("Inventory item not found for this outlet.");
    }

    const prevStock = item.quantity;
    let newStock = prevStock;

    if (adjustmentType === "ADD") {
      newStock = prevStock + quantity;
    } else if (adjustmentType === "DEDUCT") {
      newStock = Math.max(0, prevStock - quantity);
    } else if (adjustmentType === "SET") {
      newStock = quantity;
    }

    const delta = Math.abs(newStock - prevStock);

    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newStock },
      include: { ingredient: true },
    });

    await tx.kitchenInventoryMovement.create({
      data: {
        outletId,
        inventoryItemId: item.id,
        ingredientId: item.ingredientId,
        movementType: KitchenMovementType.MANUAL_ADJUSTMENT,
        quantity: delta,
        previousStock: prevStock,
        newStock,
        reason: reason.trim(),
        userId: userId || null,
      },
    });

    return {
      success: true,
      updatedItem,
      previousStock: prevStock,
      newStock,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Records wastage for an ingredient (spoilage, dropped, expired).
 */
export async function recordKitchenWastage(params: {
  outletId: string;
  inventoryItemId: string;
  quantityWasted: number;
  reason: string;
  notes?: string | null;
  userId?: string;
}) {
  const { outletId, inventoryItemId, quantityWasted, reason, notes, userId } = params;

  if (quantityWasted <= 0) {
    throw new Error("Quantity wasted must be greater than zero.");
  }
  if (!reason || !reason.trim()) {
    throw new Error("A wastage reason (e.g. Expired, Spoiled, Damaged) is required.");
  }

  return await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { ingredient: true },
    });

    if (!item || item.outletId !== outletId) {
      throw new Error("Inventory item not found for this outlet.");
    }

    const prevStock = item.quantity;
    const actualDeduct = Math.min(prevStock, quantityWasted);
    const newStock = Math.max(0, prevStock - actualDeduct);
    const cost = Math.round(actualDeduct * (item.purchasePricePerUnit || 0) * 100) / 100;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newStock },
    });

    const wastage = await tx.kitchenWastage.create({
      data: {
        outletId,
        inventoryItemId: item.id,
        ingredientId: item.ingredientId,
        quantity: actualDeduct,
        unit: item.unit,
        reason: reason.trim(),
        cost,
        notes: notes || null,
        recordedById: userId || null,
      },
    });

    await tx.kitchenInventoryMovement.create({
      data: {
        outletId,
        inventoryItemId: item.id,
        ingredientId: item.ingredientId,
        movementType: KitchenMovementType.WASTAGE,
        quantity: actualDeduct,
        previousStock: prevStock,
        newStock,
        reason: `Wastage recorded: ${reason.trim()}`,
        userId: userId || null,
        cost,
      },
    });

    return {
      success: true,
      wastage,
      previousStock: prevStock,
      newStock,
    };
  }, { maxWait: 15000, timeout: 30000 });
}

/**
 * Returns historical stock movements for an outlet.
 */
export async function getKitchenMovements(params: {
  outletId: string;
  movementType?: string;
  ingredientId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const { outletId, movementType, ingredientId, startDate, endDate, page = 1, limit = 50 } = params;

  const where: any = { outletId };

  if (movementType && movementType !== "ALL") {
    where.movementType = movementType as KitchenMovementType;
  }

  if (ingredientId && ingredientId !== "ALL") {
    where.ingredientId = ingredientId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [total, movements] = await Promise.all([
    prisma.kitchenInventoryMovement.count({ where }),
    prisma.kitchenInventoryMovement.findMany({
      where,
      include: {
        ingredient: true,
        user: { select: { id: true, name: true, email: true } },
        order: { select: { id: true, orderNumber: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  return {
    movements: movements.map((m) => ({
      id: m.id,
      ingredientName: m.ingredient.name,
      movementType: m.movementType,
      quantity: Math.round(m.quantity * 100) / 100,
      previousStock: Math.round(m.previousStock * 100) / 100,
      newStock: Math.round(m.newStock * 100) / 100,
      orderNumber: m.order?.orderNumber || null,
      reason: m.reason || "",
      userName: m.user?.name || "Kitchen Staff",
      cost: m.cost ? Math.round(m.cost * 100) / 100 : null,
      createdAt: m.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

/**
 * Returns wastage history and analytics for an outlet.
 */
export async function getKitchenWastages(params: {
  outletId: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}) {
  const { outletId, startDate, endDate, page = 1, limit = 50 } = params;

  const where: any = { outletId };

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }

  const [total, wastages] = await Promise.all([
    prisma.kitchenWastage.count({ where }),
    prisma.kitchenWastage.findMany({
      where,
      include: {
        ingredient: true,
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
  ]);

  // Aggregate today and month totals
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [todayWastage, monthWastage] = await Promise.all([
    prisma.kitchenWastage.findMany({
      where: { outletId, createdAt: { gte: startOfDay } },
      select: { cost: true, quantity: true },
    }),
    prisma.kitchenWastage.findMany({
      where: { outletId, createdAt: { gte: startOfMonth } },
      select: { cost: true, quantity: true },
    }),
  ]);

  const todayCost = todayWastage.reduce((sum, w) => sum + (w.cost || 0), 0);
  const monthCost = monthWastage.reduce((sum, w) => sum + (w.cost || 0), 0);

  return {
    wastages: wastages.map((w) => ({
      id: w.id,
      ingredientName: w.ingredient.name,
      quantity: w.quantity,
      unit: w.unit,
      reason: w.reason,
      cost: w.cost || 0,
      notes: w.notes,
      recordedBy: w.recordedBy?.name || "Kitchen Staff",
      createdAt: w.createdAt,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    summary: {
      todayCount: todayWastage.length,
      todayCost: Math.round(todayCost * 100) / 100,
      monthCount: monthWastage.length,
      monthCost: Math.round(monthCost * 100) / 100,
    },
  };
}

/**
 * Returns comprehensive reports: order volume, consumption, purchase, wastage, and valuation.
 */
export async function getKitchenReports(outletId: string) {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  // 1. Orders today
  const ordersToday = await prisma.order.findMany({
    where: { outletId, createdAt: { gte: startOfDay } },
    select: { status: true, totalAmount: true },
  });

  const completedToday = ordersToday.filter((o) => o.status === "COMPLETED");
  const revenueToday = completedToday.reduce((sum, o) => sum + o.totalAmount, 0);

  // 2. Ingredients consumption past 7 days
  const consumptionMovements = await prisma.kitchenInventoryMovement.findMany({
    where: {
      outletId,
      movementType: KitchenMovementType.ORDER_CONSUMED,
      createdAt: { gte: sevenDaysAgo },
    },
    include: { ingredient: true },
  });

  const consumptionMap: Record<string, { name: string; quantity: number }> = {};
  for (const m of consumptionMovements) {
    const key = m.ingredientId;
    if (!consumptionMap[key]) {
      consumptionMap[key] = { name: m.ingredient.name, quantity: 0 };
    }
    consumptionMap[key].quantity += m.quantity;
  }

  const topConsumed = Object.values(consumptionMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8);

  // 3. Purchase receipts past 7 days
  const recentReceipts = await prisma.kitchenPurchaseReceipt.findMany({
    where: { outletId, createdAt: { gte: sevenDaysAgo } },
    select: { totalCost: true },
  });
  const recentPurchaseTotal = recentReceipts.reduce((sum, r) => sum + r.totalCost, 0);

  // 4. Wastage past 7 days
  const recentWastages = await prisma.kitchenWastage.findMany({
    where: { outletId, createdAt: { gte: sevenDaysAgo } },
    select: { cost: true },
  });
  const recentWastageTotal = recentWastages.reduce((sum, w) => sum + (w.cost || 0), 0);

  // 5. Current inventory valuation
  const inventoryOverview = await getKitchenInventoryOverview(outletId);

  return {
    today: {
      totalOrders: ordersToday.length,
      completedOrders: completedToday.length,
      revenue: Math.round(revenueToday),
    },
    pastSevenDays: {
      purchasesTotal: Math.round(recentPurchaseTotal),
      wastageTotal: Math.round(recentWastageTotal),
      topConsumed,
    },
    inventoryOverview,
  };
}
