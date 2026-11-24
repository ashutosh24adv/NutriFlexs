import { prisma, withDbRetry } from "@/lib/prisma";
import { OrderStatus, KitchenMovementType } from "@prisma/client";
import { syncCompletedOrderToNutritionDiary } from "@/services/nutrition.service";

export interface KitchenOrderCardDTO {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone?: string | null;
  status: OrderStatus;
  totalAmount: number;
  totalProtein: number;
  totalCalories: number;
  createdAt: Date;
  elapsedMinutes: number;
  isDelayed: boolean;
  specialInstructions?: string | null;
  items: Array<{
    id: string;
    productName: string;
    quantity: number;
    price: number;
    protein: number;
    calories: number;
    imageUrl?: string | null;
    isRecipeMapped: boolean;
    recipeIngredients: Array<{
      ingredientName: string;
      requiredAmount: string;
      prepNotes?: string | null;
    }>;
  }>;
  hasInsufficientStockWarning?: boolean;
}

/**
 * Returns kitchen orders grouped and formatted for the KDS operations board.
 */
export async function getKitchenKdsOrders(outletId?: string) {
  const where: any = {};
  if (outletId) {
    where.outletId = outletId;
  }

  const rawOrders = await withDbRetry(() =>
    prisma.order.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, phone: true } },
        outlet: { select: { id: true, name: true } },
        items: {
          include: {
            product: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        },
        inventoryReservations: {
          include: {
            ingredient: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    })
  );

  const now = Date.now();

  const formatted: KitchenOrderCardDTO[] = rawOrders.map((ord) => {
    const elapsedMinutes = Math.floor((now - new Date(ord.createdAt).getTime()) / 60000);
    const isDelayed = ord.status !== OrderStatus.COMPLETED && ord.status !== OrderStatus.CANCELLED && elapsedMinutes > 15;

    const items = ord.items.map((item) => {
      const prod = item.product;
      const isRecipeMapped = Boolean(prod?.ingredients && prod.ingredients.length > 0);
      const recipeIngredients = (prod?.ingredients || []).map((pi) => ({
        ingredientName: pi.ingredient.name,
        requiredAmount: pi.amount || `${pi.quantityRequired || 1} ${pi.unit || "g"}`,
        prepNotes: pi.prepNotes,
      }));

      return {
        id: item.id,
        productName: prod?.name || "Item",
        quantity: item.quantity,
        price: item.priceAtPurchase || prod?.price || 0,
        protein: prod?.protein || 0,
        calories: prod?.calories || 0,
        imageUrl: prod?.imageUrl || null,
        isRecipeMapped,
        recipeIngredients,
      };
    });

    return {
      id: ord.id,
      orderNumber: ord.orderNumber,
      customerName: ord.user?.name || "Kiosk Guest",
      customerPhone: ord.user?.phone || null,
      status: ord.status,
      totalAmount: ord.totalAmount,
      totalProtein: ord.totalProtein,
      totalCalories: ord.totalCalories,
      createdAt: ord.createdAt,
      elapsedMinutes,
      isDelayed,
      specialInstructions: (ord as any).specialInstructions || null,
      items,
      hasInsufficientStockWarning: false,
    };
  });

  // Calculate overview counts
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const newOrders = formatted.filter((o) => o.status === OrderStatus.ORDER_PLACED);
  const acceptedOrders = formatted.filter((o) => o.status === OrderStatus.ACCEPTED || (o.status as any) === "CONFIRMED");
  const preparingOrders = formatted.filter((o) => o.status === OrderStatus.PREPARING);
  const readyOrders = formatted.filter((o) => o.status === OrderStatus.READY_FOR_PICKUP);
  const completedToday = formatted.filter(
    (o) => o.status === OrderStatus.COMPLETED && new Date(o.createdAt) >= startOfDay
  );

  return {
    orders: formatted,
    kpi: {
      newOrdersCount: newOrders.length,
      acceptedOrdersCount: acceptedOrders.length,
      preparingOrdersCount: preparingOrders.length,
      readyOrdersCount: readyOrders.length,
      completedTodayCount: completedToday.length,
      totalDelayedCount: formatted.filter((o) => o.isDelayed).length,
    },
  };
}

/**
 * Updates order status and executes idempotent inventory reservation / consumption lifecycle.
 */
export async function updateKitchenOrderStatusWithInventory(params: {
  orderId: string;
  newStatus: OrderStatus;
  outletId: string;
  userId?: string;
  reason?: string;
}) {
  const { orderId, newStatus, outletId, userId, reason } = params;

  return await prisma.$transaction(
    async (tx) => {
    // 1. Fetch current order with its items & recipe ingredients
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                ingredients: {
                  include: {
                    ingredient: true,
                  },
                },
              },
            },
          },
        },
        inventoryReservations: true,
      },
    });

    if (!order) {
      throw new Error("Order not found.");
    }
    if (order.outletId !== outletId) {
      throw new Error("Unauthorized: Order does not belong to this kitchen outlet.");
    }

    const prevStatus = order.status;

    // Check for duplicate transitions
    if (prevStatus === newStatus) {
      return { success: true, order, alreadyInStatus: true };
    }

    // 2. INVENTORY LIFECYCLE MANAGEMENT

    // CASE A: Order is being ACCEPTED or PREPARING -> Reserve ingredients if not already reserved
    if (
      (newStatus === OrderStatus.ACCEPTED || newStatus === OrderStatus.PREPARING) &&
      order.inventoryReservations.length === 0
    ) {
      // Calculate total ingredient requirements across all items
      const ingredientNeeds: Map<string, { ingredientId: string; required: number; unit: string; ingredientName: string }> = new Map();

      for (const item of order.items) {
        if (item.product?.ingredients) {
          for (const pi of item.product.ingredients) {
            const qtyNeeded = (pi.quantityRequired || 1) * item.quantity;
            const existing = ingredientNeeds.get(pi.ingredientId);
            if (existing) {
              existing.required += qtyNeeded;
            } else {
              ingredientNeeds.set(pi.ingredientId, {
                ingredientId: pi.ingredientId,
                required: qtyNeeded,
                unit: pi.unit || "g",
                ingredientName: pi.ingredient.name,
              });
            }
          }
        }
      }

      // Check and reserve for each ingredient
      for (const [ingId, need] of ingredientNeeds.entries()) {
        const invItem = await tx.inventoryItem.findUnique({
          where: {
            outletId_ingredientId: {
              outletId,
              ingredientId: ingId,
            },
          },
        });

        if (invItem) {
          // Reserve the stock
          const newReserved = (invItem.reservedQuantity || 0) + need.required;

          await tx.inventoryItem.update({
            where: { id: invItem.id },
            data: { reservedQuantity: newReserved },
          });

          // Create Order Reservation record
          await tx.orderInventoryReservation.create({
            data: {
              orderId: order.id,
              outletId,
              inventoryItemId: invItem.id,
              ingredientId: ingId,
              quantity: need.required,
              unit: need.unit,
              status: "RESERVED",
            },
          });

          // Log stock movement
          await tx.kitchenInventoryMovement.create({
            data: {
              outletId,
              inventoryItemId: invItem.id,
              ingredientId: ingId,
              movementType: KitchenMovementType.ORDER_RESERVED,
              quantity: need.required,
              previousStock: invItem.quantity,
              newStock: invItem.quantity, // Stock is reserved, not yet consumed
              orderId: order.id,
              reason: `Reserved for order #${order.orderNumber}`,
              userId: userId || null,
            },
          });
        }
      }
    }

    // CASE B: Order reaches COMPLETED -> Finalize consumption
    if (newStatus === OrderStatus.COMPLETED) {
      const activeReservations = await tx.orderInventoryReservation.findMany({
        where: { orderId: order.id, status: "RESERVED" },
        include: { inventoryItem: true },
      });

      for (const res of activeReservations) {
        const prevStock = res.inventoryItem.quantity;
        const newStock = Math.max(0, prevStock - res.quantity);
        const newReserved = Math.max(0, (res.inventoryItem.reservedQuantity || 0) - res.quantity);

        await tx.inventoryItem.update({
          where: { id: res.inventoryItemId },
          data: {
            quantity: newStock,
            reservedQuantity: newReserved,
          },
        });

        await tx.orderInventoryReservation.update({
          where: { id: res.id },
          data: { status: "CONSUMED" },
        });

        await tx.kitchenInventoryMovement.create({
          data: {
            outletId,
            inventoryItemId: res.inventoryItemId,
            ingredientId: res.ingredientId,
            movementType: KitchenMovementType.ORDER_CONSUMED,
            quantity: res.quantity,
            previousStock: prevStock,
            newStock,
            orderId: order.id,
            reason: `Consumed by completed order #${order.orderNumber}`,
            userId: userId || null,
          },
        });
      }
    }

    // CASE C: Order is CANCELLED -> Release reservations
    if (newStatus === OrderStatus.CANCELLED) {
      const activeReservations = await tx.orderInventoryReservation.findMany({
        where: { orderId: order.id, status: "RESERVED" },
        include: { inventoryItem: true },
      });

      for (const res of activeReservations) {
        const newReserved = Math.max(0, (res.inventoryItem.reservedQuantity || 0) - res.quantity);

        await tx.inventoryItem.update({
          where: { id: res.inventoryItemId },
          data: { reservedQuantity: newReserved },
        });

        await tx.orderInventoryReservation.update({
          where: { id: res.id },
          data: { status: "RELEASED" },
        });

        await tx.kitchenInventoryMovement.create({
          data: {
            outletId,
            inventoryItemId: res.inventoryItemId,
            ingredientId: res.ingredientId,
            movementType: KitchenMovementType.RESERVATION_RELEASED,
            quantity: res.quantity,
            previousStock: res.inventoryItem.quantity,
            newStock: res.inventoryItem.quantity,
            orderId: order.id,
            reason: `Order #${order.orderNumber} cancelled${reason ? ` - ${reason}` : ""}`,
            userId: userId || null,
          },
        });
      }
    }

    // 3. Update the Order record
    const updatedOrder = await tx.order.update({
      where: { id: order.id },
      data: { status: newStatus },
      include: {
        items: { include: { product: true } },
        user: { select: { id: true, name: true, email: true, phone: true } },
        outlet: true,
      },
    });

    return {
      success: true,
      order: updatedOrder,
      previousStatus: prevStatus,
      newStatus,
    };
  }, { maxWait: 15000, timeout: 30000 });
}
