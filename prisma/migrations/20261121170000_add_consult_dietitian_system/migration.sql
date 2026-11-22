-- AlterEnum
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'DIETITIAN';

-- CreateEnum
CREATE TYPE "DietitianVerificationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ConsultationType" AS ENUM ('ONLINE', 'IN_PERSON');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DietPlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

-- CreateTable DietitianProfile
CREATE TABLE "DietitianProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "qualifications" TEXT NOT NULL,
    "experienceYears" INTEGER NOT NULL DEFAULT 3,
    "consultationFee" INTEGER NOT NULL DEFAULT 599,
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "verificationStatus" "DietitianVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "languages" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "specializations" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "availableFormats" "ConsultationType"[] NOT NULL DEFAULT ARRAY['ONLINE']::"ConsultationType"[],
    "profileImageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietitianProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable DietitianAvailability
CREATE TABLE "DietitianAvailability" (
    "id" TEXT NOT NULL,
    "dietitianProfileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "slotDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietitianAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable Consultation
CREATE TABLE "Consultation" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "dietitianId" TEXT NOT NULL,
    "scheduledDate" TIMESTAMP(3) NOT NULL,
    "timeSlot" TEXT NOT NULL,
    "consultationType" "ConsultationType" NOT NULL DEFAULT 'ONLINE',
    "status" "ConsultationStatus" NOT NULL DEFAULT 'PENDING',
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "fee" INTEGER NOT NULL,
    "primaryConcern" TEXT NOT NULL,
    "healthNotes" TEXT,
    "meetingLink" TEXT,
    "location" TEXT,
    "cancelledReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consultation_pkey" PRIMARY KEY ("id")
);

-- CreateTable ConsultationMessage
CREATE TABLE "ConsultationMessage" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConsultationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable DietPlan
CREATE TABLE "DietPlan" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT,
    "customerId" TEXT NOT NULL,
    "dietitianId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" "DietPlanStatus" NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "dailyCalorieTarget" INTEGER NOT NULL,
    "proteinTargetGrams" DOUBLE PRECISION NOT NULL,
    "carbsTargetGrams" DOUBLE PRECISION NOT NULL,
    "fatsTargetGrams" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "foodsToLimit" TEXT,
    "weeklyReviewNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DietPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable DietPlanMeal
CREATE TABLE "DietPlanMeal" (
    "id" TEXT NOT NULL,
    "dietPlanId" TEXT NOT NULL,
    "mealType" "MealType" NOT NULL,
    "foodName" TEXT NOT NULL,
    "foodItemId" TEXT,
    "productId" TEXT,
    "servingSize" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "unit" TEXT NOT NULL DEFAULT 'serving',
    "calories" DOUBLE PRECISION NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "carbohydrates" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "dietitianTip" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DietPlanMeal_pkey" PRIMARY KEY ("id")
);

-- CreateTable DietitianReview
CREATE TABLE "DietitianReview" (
    "id" TEXT NOT NULL,
    "consultationId" TEXT NOT NULL,
    "dietitianId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isApproved" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DietitianReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DietitianProfile_userId_key" ON "DietitianProfile"("userId");
CREATE INDEX "DietitianProfile_isVerified_idx" ON "DietitianProfile"("isVerified");
CREATE INDEX "DietitianProfile_verificationStatus_idx" ON "DietitianProfile"("verificationStatus");
CREATE INDEX "DietitianProfile_experienceYears_idx" ON "DietitianProfile"("experienceYears");

-- CreateIndex
CREATE UNIQUE INDEX "DietitianAvailability_dietitianProfileId_dayOfWeek_startTime_key" ON "DietitianAvailability"("dietitianProfileId", "dayOfWeek", "startTime");
CREATE INDEX "DietitianAvailability_dietitianProfileId_dayOfWeek_idx" ON "DietitianAvailability"("dietitianProfileId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "Consultation_customerId_idx" ON "Consultation"("customerId");
CREATE INDEX "Consultation_dietitianId_idx" ON "Consultation"("dietitianId");
CREATE INDEX "Consultation_status_idx" ON "Consultation"("status");
CREATE INDEX "Consultation_scheduledDate_timeSlot_idx" ON "Consultation"("scheduledDate", "timeSlot");

-- CreateIndex
CREATE INDEX "ConsultationMessage_consultationId_createdAt_idx" ON "ConsultationMessage"("consultationId", "createdAt");
CREATE INDEX "ConsultationMessage_senderId_idx" ON "ConsultationMessage"("senderId");

-- CreateIndex
CREATE UNIQUE INDEX "DietPlan_consultationId_key" ON "DietPlan"("consultationId");
CREATE INDEX "DietPlan_customerId_status_idx" ON "DietPlan"("customerId", "status");
CREATE INDEX "DietPlan_dietitianId_idx" ON "DietPlan"("dietitianId");

-- CreateIndex
CREATE INDEX "DietPlanMeal_dietPlanId_mealType_idx" ON "DietPlanMeal"("dietPlanId", "mealType");

-- CreateIndex
CREATE UNIQUE INDEX "DietitianReview_consultationId_key" ON "DietitianReview"("consultationId");
CREATE INDEX "DietitianReview_dietitianId_idx" ON "DietitianReview"("dietitianId");
CREATE INDEX "DietitianReview_customerId_idx" ON "DietitianReview"("customerId");

-- AddForeignKey
ALTER TABLE "DietitianProfile" ADD CONSTRAINT "DietitianProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietitianAvailability" ADD CONSTRAINT "DietitianAvailability_dietitianProfileId_fkey" FOREIGN KEY ("dietitianProfileId") REFERENCES "DietitianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Consultation" ADD CONSTRAINT "Consultation_dietitianId_fkey" FOREIGN KEY ("dietitianId") REFERENCES "DietitianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultationMessage" ADD CONSTRAINT "ConsultationMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlan" ADD CONSTRAINT "DietPlan_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlan" ADD CONSTRAINT "DietPlan_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlan" ADD CONSTRAINT "DietPlan_dietitianId_fkey" FOREIGN KEY ("dietitianId") REFERENCES "DietitianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlanMeal" ADD CONSTRAINT "DietPlanMeal_dietPlanId_fkey" FOREIGN KEY ("dietPlanId") REFERENCES "DietPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlanMeal" ADD CONSTRAINT "DietPlanMeal_foodItemId_fkey" FOREIGN KEY ("foodItemId") REFERENCES "FoodItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietPlanMeal" ADD CONSTRAINT "DietPlanMeal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietitianReview" ADD CONSTRAINT "DietitianReview_consultationId_fkey" FOREIGN KEY ("consultationId") REFERENCES "Consultation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietitianReview" ADD CONSTRAINT "DietitianReview_dietitianId_fkey" FOREIGN KEY ("dietitianId") REFERENCES "DietitianProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DietitianReview" ADD CONSTRAINT "DietitianReview_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
