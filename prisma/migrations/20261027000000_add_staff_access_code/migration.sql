-- CreateTable
CREATE TABLE "StaffAccessCode" (
    "id" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "codePrefix" TEXT,
    "role" "Role" NOT NULL,
    "outletId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "maxUses" INTEGER NOT NULL DEFAULT 1,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "isDevSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffAccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StaffAccessCode_codeHash_key" ON "StaffAccessCode"("codeHash");

-- CreateIndex
CREATE INDEX "StaffAccessCode_role_isActive_idx" ON "StaffAccessCode"("role", "isActive");

-- CreateIndex
CREATE INDEX "StaffAccessCode_codeHash_idx" ON "StaffAccessCode"("codeHash");

-- AddForeignKey
ALTER TABLE "StaffAccessCode" ADD CONSTRAINT "StaffAccessCode_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAccessCode" ADD CONSTRAINT "StaffAccessCode_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
