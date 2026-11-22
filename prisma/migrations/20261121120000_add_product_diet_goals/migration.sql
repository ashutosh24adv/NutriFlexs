-- CreateEnum
CREATE TYPE "DietGoal" AS ENUM ('WEIGHT_LOSS', 'WEIGHT_GAIN', 'WEIGHT_MAINTENANCE');

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductDietGoal" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "goal" "DietGoal" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductDietGoal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProductDietGoal_productId_goal_key" ON "ProductDietGoal"("productId", "goal");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductDietGoal_goal_idx" ON "ProductDietGoal"("goal");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProductDietGoal_productId_idx" ON "ProductDietGoal"("productId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProductDietGoal_productId_fkey'
    ) THEN
        ALTER TABLE "ProductDietGoal" ADD CONSTRAINT "ProductDietGoal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
