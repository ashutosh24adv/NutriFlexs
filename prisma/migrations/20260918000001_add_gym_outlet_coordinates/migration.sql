-- AlterTable Gym
ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Gym" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- AlterTable Outlet
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "Outlet" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

-- Populate approximate coordinates for default seed gyms if NULL
UPDATE "Gym" SET "latitude" = 12.9784, "longitude" = 77.6408 WHERE "name" LIKE '%Indiranagar%' AND "latitude" IS NULL;
UPDATE "Gym" SET "latitude" = 12.9345, "longitude" = 77.6265 WHERE "name" LIKE '%Koramangala%' AND "latitude" IS NULL;
UPDATE "Gym" SET "latitude" = 19.0596, "longitude" = 72.8295 WHERE "name" LIKE '%Bandra%' AND "latitude" IS NULL;

-- Populate approximate coordinates for default seed outlets if NULL
UPDATE "Outlet" SET "latitude" = 12.9788, "longitude" = 77.6412 WHERE "name" LIKE '%Indiranagar%' AND "latitude" IS NULL;
UPDATE "Outlet" SET "latitude" = 12.9350, "longitude" = 77.6270 WHERE "name" LIKE '%Koramangala%' AND "latitude" IS NULL;
UPDATE "Outlet" SET "latitude" = 19.0601, "longitude" = 72.8300 WHERE "name" LIKE '%Bandra%' AND "latitude" IS NULL;
