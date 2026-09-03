-- CreateIndex
CREATE INDEX "Product_categoryId_isAvailable_idx" ON "Product"("categoryId", "isAvailable");

-- CreateIndex
CREATE INDEX "Product_isPopular_isAvailable_idx" ON "Product"("isPopular", "isAvailable");

-- CreateIndex
CREATE INDEX "Product_isFeatured_isAvailable_idx" ON "Product"("isFeatured", "isAvailable");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Order_outletId_status_idx" ON "Order"("outletId", "status");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
