-- AlterTable
ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "area" TEXT,
ADD COLUMN IF NOT EXISTS "imageUrl" TEXT,
ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "operatingHours" TEXT DEFAULT '6:00 AM – 10:00 PM',
ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- AlterTable
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS "operatingHours" TEXT DEFAULT '6:00 AM – 10:00 PM';

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Gym_city_isActive_idx" ON "Gym"("city", "isActive");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Gym_name_idx" ON "Gym"("name");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Outlet_gymId_isAvailable_idx" ON "Outlet"("gymId", "isAvailable");

