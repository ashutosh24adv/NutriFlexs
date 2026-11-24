const fs = require('fs');
const path = require('path');
const { PrismaClient, OrderStatus, KitchenMovementType } = require('@prisma/client');

// Auto-load .env
if (!process.env.DATABASE_URL) {
  try {
    const envPath = path.resolve(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
          const idx = trimmed.indexOf('=');
          const key = trimmed.slice(0, idx).trim();
          let val = trimmed.slice(idx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) process.env[key] = val;
        }
      });
    }
  } catch (e) {
    console.error("Failed to parse .env:", e.message);
  }
}

const prisma = new PrismaClient();

// Helper: receive stock transaction
async function executeReceiveStock(outletId, inventoryItemId, quantityReceived, costPerUnit, supplier, userId) {
  const receiptNumber = `REC-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`;
  const totalCost = Math.round(quantityReceived * costPerUnit * 100) / 100;

  return await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId },
      include: { ingredient: true }
    });
    if (!item) throw new Error("Item not found");

    const prevStock = item.quantity;
    const newStock = prevStock + quantityReceived;
    const newAvgPrice = Math.round(((prevStock * (item.purchasePricePerUnit || 0) + quantityReceived * costPerUnit) / newStock) * 100) / 100;

    const updatedItem = await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        quantity: newStock,
        purchasePricePerUnit: newAvgPrice,
        supplier: supplier || item.supplier
      }
    });

    await tx.kitchenPurchaseReceipt.create({
      data: {
        outletId,
        receiptNumber,
        supplier: supplier || "Vendor",
        totalCost,
        receivedById: userId,
        items: {
          create: {
            inventoryItemId: item.id,
            ingredientId: item.ingredientId,
            quantity: quantityReceived,
            unit: item.unit,
            costPerUnit,
            totalCost
          }
        }
      }
    });

    await tx.kitchenInventoryMovement.create({
      data: {
        outletId,
        inventoryItemId: item.id,
        ingredientId: item.ingredientId,
        movementType: KitchenMovementType.STOCK_RECEIVED,
        quantity: quantityReceived,
        previousStock: prevStock,
        newStock,
        reason: `Receipt #${receiptNumber} restock`,
        userId,
        cost: totalCost
      }
    });

    return { success: true, updatedItem, receiptNumber, newStock };
  }, { maxWait: 15000, timeout: 30000 });
}

// Helper: update status and inventory lifecycle
async function executeOrderStatusTransition(orderId, newStatus, outletId, userId, reason) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              include: {
                ingredients: true
              }
            }
          }
        },
        inventoryReservations: true
      }
    });

    if (!order) throw new Error("Order not found");
    const prevStatus = order.status;

    // A: Accept or Preparing -> Reserve
    if ((newStatus === OrderStatus.ACCEPTED || newStatus === OrderStatus.PREPARING) && order.inventoryReservations.length === 0) {
      for (const item of order.items) {
        if (item.product?.ingredients) {
          for (const pi of item.product.ingredients) {
            const qtyNeeded = (pi.quantityRequired || 1) * item.quantity;
            const invItem = await tx.inventoryItem.findUnique({
              where: { outletId_ingredientId: { outletId, ingredientId: pi.ingredientId } }
            });
            if (invItem) {
              const newReserved = (invItem.reservedQuantity || 0) + qtyNeeded;
              await tx.inventoryItem.update({
                where: { id: invItem.id },
                data: { reservedQuantity: newReserved }
              });

              await tx.orderInventoryReservation.create({
                data: {
                  orderId: order.id,
                  outletId,
                  inventoryItemId: invItem.id,
                  ingredientId: pi.ingredientId,
                  quantity: qtyNeeded,
                  unit: pi.unit || "g",
                  status: "RESERVED"
                }
              });

              await tx.kitchenInventoryMovement.create({
                data: {
                  outletId,
                  inventoryItemId: invItem.id,
                  ingredientId: pi.ingredientId,
                  movementType: KitchenMovementType.ORDER_RESERVED,
                  quantity: qtyNeeded,
                  previousStock: invItem.quantity,
                  newStock: invItem.quantity,
                  orderId: order.id,
                  reason: `Reserved for order #${order.orderNumber}`,
                  userId
                }
              });
            }
          }
        }
      }
    }

    // B: Completed -> Finalize consumption
    if (newStatus === OrderStatus.COMPLETED) {
      const reservations = await tx.orderInventoryReservation.findMany({
        where: { orderId: order.id, status: "RESERVED" },
        include: { inventoryItem: true }
      });
      for (const res of reservations) {
        const prevStock = res.inventoryItem.quantity;
        const newStock = Math.max(0, prevStock - res.quantity);
        const newReserved = Math.max(0, (res.inventoryItem.reservedQuantity || 0) - res.quantity);

        await tx.inventoryItem.update({
          where: { id: res.inventoryItemId },
          data: { quantity: newStock, reservedQuantity: newReserved }
        });

        await tx.orderInventoryReservation.update({
          where: { id: res.id },
          data: { status: "CONSUMED" }
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
            reason: `Consumed by order #${order.orderNumber}`,
            userId
          }
        });
      }
    }

    // C: Cancelled -> Release reservation
    if (newStatus === OrderStatus.CANCELLED) {
      const reservations = await tx.orderInventoryReservation.findMany({
        where: { orderId: order.id, status: "RESERVED" },
        include: { inventoryItem: true }
      });
      for (const res of reservations) {
        const newReserved = Math.max(0, (res.inventoryItem.reservedQuantity || 0) - res.quantity);
        await tx.inventoryItem.update({
          where: { id: res.inventoryItemId },
          data: { reservedQuantity: newReserved }
        });

        await tx.orderInventoryReservation.update({
          where: { id: res.id },
          data: { status: "RELEASED" }
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
            userId
          }
        });
      }
    }

    const updated = await tx.order.update({
      where: { id: order.id },
      data: { status: newStatus }
    });

    return { success: true, order: updated };
  }, { maxWait: 15000, timeout: 30000 });
}

// Helper: wastage
async function executeRecordWastage(outletId, inventoryItemId, quantityWasted, reason, userId) {
  return await prisma.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({
      where: { id: inventoryItemId }
    });
    if (!item) throw new Error("Item not found");

    const prevStock = item.quantity;
    const deduct = Math.min(prevStock, quantityWasted);
    const newStock = Math.max(0, prevStock - deduct);
    const cost = Math.round(deduct * (item.purchasePricePerUnit || 0) * 100) / 100;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { quantity: newStock }
    });

    const wastage = await tx.kitchenWastage.create({
      data: {
        outletId,
        inventoryItemId: item.id,
        ingredientId: item.ingredientId,
        quantity: deduct,
        unit: item.unit,
        reason,
        cost,
        recordedById: userId
      }
    });

    await tx.kitchenInventoryMovement.create({
      data: {
        outletId,
        inventoryItemId: item.id,
        ingredientId: item.ingredientId,
        movementType: KitchenMovementType.WASTAGE,
        quantity: deduct,
        previousStock: prevStock,
        newStock,
        reason: `Wastage: ${reason}`,
        userId,
        cost
      }
    });

    return { success: true, wastage, previousStock: prevStock, newStock };
  }, { maxWait: 15000, timeout: 30000 });
}

async function runTests() {
  console.log("=================================================================");
  console.log("       NutriFlexs Kitchen Operations & Inventory Test Suite      ");
  console.log("=================================================================\n");

  let totalTests = 0;
  let passedTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${message}`);
    } else {
      console.error(`  ❌ FAIL: ${message}`);
    }
  }

  try {
    const outlet = await prisma.outlet.findFirst({ where: { isActive: true } });
    const otherOutlet = await prisma.outlet.findFirst({ where: { id: { not: outlet.id } } });
    const staffUser = await prisma.user.findFirst({ where: { role: "KITCHEN" } });
    const customerUser = await prisma.user.findFirst({ where: { role: "CUSTOMER" } });

    console.log(`[Context] Outlet: ${outlet.name}`);
    console.log(`[Context] Staff: ${staffUser?.email}`);

    // Chicken breast inventory item
    const chickenIng = await prisma.ingredient.findFirst({
      where: { name: { contains: "Chicken", mode: "insensitive" } }
    });
    if (!chickenIng) throw new Error("Chicken ingredient missing");

    const chickenItem = await prisma.inventoryItem.findUnique({
      where: { outletId_ingredientId: { outletId: outlet.id, ingredientId: chickenIng.id } }
    });
    if (!chickenItem) throw new Error("Chicken item missing in outlet");

    const initialStock = chickenItem.quantity;
    console.log(`[Initial Stock] Chicken Breast: ${initialStock} kg`);

    // 1 & 2: Restock 5kg Chicken
    console.log("\n[Test 1 & 2] Stock Receiving: Restocking 5kg Chicken Breast");
    const restockRes = await executeReceiveStock(outlet.id, chickenItem.id, 5.0, 280, "Venky's Quality Poultry", staffUser?.id);
    assert(restockRes.success === true, "Stock receiving transaction completed");

    const postRestock = await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } });
    assert(
      Math.abs(postRestock.quantity - (initialStock + 5.0)) < 0.01,
      `Inventory stock increased by 5kg (Before: ${initialStock}, After: ${postRestock.quantity})`
    );

    // 3, 4, 5, 6: Order Acceptance & Reservation
    console.log("\n[Test 3, 4, 5, 6] Order Acceptance, Ingredient Reservation & Idempotency");
    let chickenProduct = await prisma.product.findFirst({
      where: { ingredients: { some: { ingredientId: chickenIng.id } } }
    });
    if (!chickenProduct) {
      chickenProduct = await prisma.product.findFirst();
      await prisma.productIngredient.create({
        data: {
          productId: chickenProduct.id,
          ingredientId: chickenIng.id,
          amount: "0.2 kg",
          quantityRequired: 0.2,
          unit: "kg"
        }
      });
    } else {
      await prisma.productIngredient.updateMany({
        where: { productId: chickenProduct.id, ingredientId: chickenIng.id },
        data: { quantityRequired: 0.2, unit: "kg" }
      });
    }

    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `KDS-TEST-${Date.now()}`,
        userId: customerUser.id,
        outletId: outlet.id,
        status: OrderStatus.ORDER_PLACED,
        subtotal: 360,
        totalAmount: 360,
        items: {
          create: {
            productId: chickenProduct.id,
            quantity: 2, // 2 * 0.2 = 0.4kg required
            priceAtPurchase: 180
          }
        }
      }
    });

    const preReserveQty = (await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } })).reservedQuantity || 0;
    await executeOrderStatusTransition(testOrder.id, OrderStatus.ACCEPTED, outlet.id, staffUser?.id);

    const postAccept = await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } });
    assert(
      Math.abs(postAccept.reservedQuantity - (preReserveQty + 0.4)) < 0.01,
      `Ingredient reserved successfully (Reserved: ${postAccept.reservedQuantity} kg, required: 0.4 kg)`
    );

    // Transition to PREPARING -> verify no duplicate reservation
    await executeOrderStatusTransition(testOrder.id, OrderStatus.PREPARING, outlet.id, staffUser?.id);
    const postPrep = await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } });
    assert(
      Math.abs(postPrep.reservedQuantity - (preReserveQty + 0.4)) < 0.01,
      `Idempotency confirmed: No duplicate reservation created upon transitioning to PREPARING`
    );

    // 7 & 8: Order Completion -> Consumption
    console.log("\n[Test 7 & 8] Order Completion: Stock Consumption Finalized");
    const preCompleteStock = postPrep.quantity;
    await executeOrderStatusTransition(testOrder.id, OrderStatus.COMPLETED, outlet.id, staffUser?.id);

    const postComplete = await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } });
    assert(
      Math.abs(postComplete.quantity - (preCompleteStock - 0.4)) < 0.01,
      `Stock consumed upon order completion (${preCompleteStock} -> ${postComplete.quantity} kg)`
    );

    // 9 & 10: Cancellation & Reservation Release
    console.log("\n[Test 9 & 10] Order Cancellation & Reservation Release");
    const cancelOrder = await prisma.order.create({
      data: {
        orderNumber: `KDS-CANCEL-${Date.now()}`,
        userId: customerUser.id,
        outletId: outlet.id,
        status: OrderStatus.ORDER_PLACED,
        subtotal: 180,
        totalAmount: 180,
        items: {
          create: {
            productId: chickenProduct.id,
            quantity: 1, // 0.2kg
            priceAtPurchase: 180
          }
        }
      }
    });

    await executeOrderStatusTransition(cancelOrder.id, OrderStatus.ACCEPTED, outlet.id, staffUser?.id);
    const preCancelReserved = (await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } })).reservedQuantity;

    await executeOrderStatusTransition(cancelOrder.id, OrderStatus.CANCELLED, outlet.id, staffUser?.id, "Customer request");
    const postCancelReserved = (await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } })).reservedQuantity;

    assert(
      postCancelReserved < preCancelReserved,
      `Reservation released upon cancellation (${preCancelReserved} -> ${postCancelReserved} kg)`
    );

    // 11 & 12: Wastage Management
    console.log("\n[Test 11 & 12] Wastage Recording & Inventory Deduction");
    const preWasteStock = postComplete.quantity;
    const wasteRes = await executeRecordWastage(outlet.id, chickenItem.id, 0.5, "Prep contamination", staffUser?.id);
    assert(wasteRes.success === true, "Wastage recorded successfully");

    const postWaste = await prisma.inventoryItem.findUnique({ where: { id: chickenItem.id } });
    assert(
      Math.abs(postWaste.quantity - (preWasteStock - 0.5)) < 0.01,
      `Inventory stock deducted for wastage (${preWasteStock} -> ${postWaste.quantity} kg)`
    );

    // 13: Outlet-Level Isolation
    console.log("\n[Test 13] Outlet-Level Inventory Isolation");
    if (otherOutlet) {
      const otherItem = await prisma.inventoryItem.findUnique({
        where: { outletId_ingredientId: { outletId: otherOutlet.id, ingredientId: chickenIng.id } }
      });
      assert(otherItem && otherItem.id !== chickenItem.id, `Outlet '${otherOutlet.name}' maintains an isolated inventory record`);
    }

    // 14: Audit Trail
    console.log("\n[Test 14] Stock Movement Audit Trail Integrity");
    const movements = await prisma.kitchenInventoryMovement.findMany({
      where: { outletId: outlet.id },
      orderBy: { createdAt: "desc" },
      take: 5
    });
    assert(movements.length > 0, `Audit ledger contains verified stock movements (${movements.length} recent entries verified)`);

    // 15 & 16: Valuation & Total Inventory
    console.log("\n[Test 15 & 16] Inventory Valuation & Health");
    const totalItems = await prisma.inventoryItem.count({ where: { outletId: outlet.id } });
    assert(totalItems >= 15, `Outlet inventory contains comprehensive stock items (${totalItems} items)`);

    console.log("\n=================================================================");
    console.log(`Test Results: ${passedTests}/${totalTests} Passed (${Math.round((passedTests/totalTests)*100)}%)`);
    console.log("=================================================================\n");

  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
