import {
  prisma,
  withDbRetry,
} from "@/lib/prisma";
import {
  ConsultationStatus,
  ConsultationType,
  DietPlanStatus,
  DietitianVerificationStatus,
  MealType,
  PaymentStatus,
  Prisma,
} from "@prisma/client";

export interface DietitianFilterOptions {
  search?: string;
  specialization?: string;
  language?: string;
  maxFee?: number;
  minExperience?: number;
}

export async function getVerifiedDietitians(options?: DietitianFilterOptions) {
  const where: Prisma.DietitianProfileWhereInput = {
    isVerified: true,
    verificationStatus: DietitianVerificationStatus.APPROVED,
  };

  if (options?.search?.trim()) {
    const q = options.search.trim().toLowerCase();
    where.OR = [
      { fullName: { contains: q, mode: "insensitive" } },
      { bio: { contains: q, mode: "insensitive" } },
      { qualifications: { contains: q, mode: "insensitive" } },
    ];
  }

  if (options?.specialization && options.specialization !== "all") {
    where.specializations = {
      has: options.specialization,
    };
  }

  if (options?.language && options.language !== "all") {
    where.languages = {
      has: options.language,
    };
  }

  if (options?.maxFee) {
    where.consultationFee = {
      lte: options.maxFee,
    };
  }

  if (options?.minExperience) {
    where.experienceYears = {
      gte: options.minExperience,
    };
  }

  return await withDbRetry(() =>
    prisma.dietitianProfile.findMany({
      where,
      include: {
        availabilities: {
          where: { isAvailable: true },
        },
        reviews: {
          where: { isApproved: true },
          take: 3,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: [{ rating: "desc" }, { experienceYears: "desc" }],
    })
  );
}

export async function getDietitianById(id: string) {
  return await withDbRetry(() =>
    prisma.dietitianProfile.findUnique({
      where: { id },
      include: {
        availabilities: {
          where: { isAvailable: true },
          orderBy: { dayOfWeek: "asc" },
        },
        reviews: {
          where: { isApproved: true },
          include: {
            customer: {
              select: { name: true, avatar: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })
  );
}

export async function getAvailableSlots(dietitianId: string, targetDate: Date) {
  const dayOfWeek = targetDate.getDay();

  const availabilities = await withDbRetry(() =>
    prisma.dietitianAvailability.findMany({
      where: {
        dietitianProfileId: dietitianId,
        dayOfWeek,
        isAvailable: true,
      },
    })
  );

  if (availabilities.length === 0) {
    return [];
  }

  // Find existing bookings on targetDate
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);

  const bookedConsultations = await withDbRetry(() =>
    prisma.consultation.findMany({
      where: {
        dietitianId,
        scheduledDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [ConsultationStatus.PENDING, ConsultationStatus.CONFIRMED],
        },
      },
      select: {
        timeSlot: true,
      },
    })
  );

  const bookedSlots = new Set(bookedConsultations.map((c) => c.timeSlot));

  // Generate slots for each availability window
  const slots: string[] = [];
  for (const avail of availabilities) {
    const [startH, startM] = avail.startTime.split(":").map(Number);
    const [endH, endM] = avail.endTime.split(":").map(Number);

    let currentMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = avail.slotDurationMinutes || 30;

    while (currentMinutes + duration <= endMinutes) {
      const slotStartH = Math.floor(currentMinutes / 60);
      const slotStartM = currentMinutes % 60;
      const slotEndH = Math.floor((currentMinutes + duration) / 60);
      const slotEndM = (currentMinutes + duration) % 60;

      const formatTime = (h: number, m: number) => {
        const ampm = h >= 12 ? "PM" : "AM";
        const hour12 = h % 12 === 0 ? 12 : h % 12;
        const minStr = m < 10 ? `0${m}` : `${m}`;
        return `${hour12}:${minStr} ${ampm}`;
      };

      const slotStr = `${formatTime(slotStartH, slotStartM)} - ${formatTime(slotEndH, slotEndM)}`;
      if (!bookedSlots.has(slotStr)) {
        slots.push(slotStr);
      }

      currentMinutes += duration;
    }
  }

  return slots;
}

export async function bookConsultation(data: {
  customerId: string;
  dietitianId: string;
  scheduledDate: Date;
  timeSlot: string;
  consultationType: ConsultationType;
  primaryConcern: string;
  healthNotes?: string;
}) {
  const startOfDay = new Date(data.scheduledDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(data.scheduledDate);
  endOfDay.setHours(23, 59, 59, 999);

  return await withDbRetry(async () => {
    return await prisma.$transaction(async (tx) => {
      // 1. Double booking prevention lock
      const existing = await tx.consultation.findFirst({
        where: {
          dietitianId: data.dietitianId,
          scheduledDate: {
            gte: startOfDay,
            lte: endOfDay,
          },
          timeSlot: data.timeSlot,
          status: {
            in: [ConsultationStatus.PENDING, ConsultationStatus.CONFIRMED],
          },
        },
      });

      if (existing) {
        throw new Error(
          "This appointment slot has just been reserved. Please select another available time slot."
        );
      }

      const dietitian = await tx.dietitianProfile.findUnique({
        where: { id: data.dietitianId },
        select: { consultationFee: true, fullName: true, isVerified: true },
      });

      if (!dietitian || !dietitian.isVerified) {
        throw new Error("The selected dietitian profile is currently unavailable for booking.");
      }

      const consultation = await tx.consultation.create({
        data: {
          customerId: data.customerId,
          dietitianId: data.dietitianId,
          scheduledDate: data.scheduledDate,
          timeSlot: data.timeSlot,
          consultationType: data.consultationType,
          status: ConsultationStatus.CONFIRMED,
          paymentStatus: PaymentStatus.PAID,
          fee: dietitian.consultationFee,
          primaryConcern: data.primaryConcern,
          healthNotes: data.healthNotes,
          meetingLink:
            data.consultationType === ConsultationType.ONLINE
              ? `https://meet.nutriflexs.com/c-${Math.random().toString(36).substring(2, 9)}`
              : null,
          location:
            data.consultationType === ConsultationType.IN_PERSON
              ? "Indiranagar Cult Kiosk Wellness Suite, Bengaluru"
              : null,
        },
        include: {
          dietitian: true,
          customer: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      // Send initial welcome message in private chat
      await tx.consultationMessage.create({
        data: {
          consultationId: consultation.id,
          senderId: data.customerId,
          content: `Hello ${dietitian.fullName}, I have booked a ${data.consultationType.toLowerCase()} consultation for ${data.timeSlot}. Primary goal/concern: ${data.primaryConcern}`,
        },
      });

      return consultation;
    });
  });
}

export async function getCustomerConsultations(customerId: string) {
  return await withDbRetry(() =>
    prisma.consultation.findMany({
      where: { customerId },
      include: {
        dietitian: true,
        dietPlan: {
          include: {
            meals: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { scheduledDate: "desc" },
    })
  );
}

export async function getDietitianConsultations(dietitianUserId: string) {
  const profile = await withDbRetry(() =>
    prisma.dietitianProfile.findUnique({
      where: { userId: dietitianUserId },
    })
  );

  if (!profile) return [];

  return await withDbRetry(() =>
    prisma.consultation.findMany({
      where: { dietitianId: profile.id },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
            primaryNutritionGoal: true,
            weightKg: true,
            heightCm: true,
          },
        },
        dietPlan: {
          include: {
            meals: true,
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { scheduledDate: "desc" },
    })
  );
}

export async function getConsultationById(consultationId: string, userId: string, role?: string) {
  const consultation = await withDbRetry(() =>
    prisma.consultation.findUnique({
      where: { id: consultationId },
      include: {
        dietitian: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
        },
        customer: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            phone: true,
            primaryNutritionGoal: true,
            weightKg: true,
            heightCm: true,
          },
        },
        dietPlan: {
          include: {
            meals: {
              orderBy: { displayOrder: "asc" },
            },
          },
        },
      },
    })
  );

  if (!consultation) return null;

  // Authorization check
  const isCustomer = consultation.customerId === userId;
  const isDietitian = consultation.dietitian.userId === userId;
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  if (!isCustomer && !isDietitian && !isAdmin) {
    throw new Error("Unauthorized: You do not have access to this consultation record.");
  }

  return consultation;
}

export async function updateConsultationStatus(
  consultationId: string,
  userId: string,
  role: string,
  status: ConsultationStatus,
  reason?: string
) {
  const consultation = await getConsultationById(consultationId, userId, role);
  if (!consultation) throw new Error("Consultation not found.");

  const updateData: Prisma.ConsultationUpdateInput = { status };
  if (status === ConsultationStatus.CANCELLED) {
    updateData.cancelledAt = new Date();
    updateData.cancelledReason = reason || "Cancelled by user";
  } else if (status === ConsultationStatus.COMPLETED) {
    updateData.completedAt = new Date();
  }

  return await withDbRetry(() =>
    prisma.consultation.update({
      where: { id: consultationId },
      data: updateData,
    })
  );
}

// ----------------------------------------------------
// Private Messaging
// ----------------------------------------------------

export async function getConsultationMessages(consultationId: string, userId: string, role?: string) {
  // Enforce server authorization
  await getConsultationById(consultationId, userId, role);

  return await withDbRetry(() =>
    prisma.consultationMessage.findMany({
      where: { consultationId },
      include: {
        sender: {
          select: { id: true, name: true, role: true, avatar: true },
        },
      },
      orderBy: { createdAt: "asc" },
    })
  );
}

export async function sendConsultationMessage(data: {
  consultationId: string;
  senderId: string;
  senderRole?: string;
  content: string;
  imageUrl?: string;
}) {
  // Enforce authorization
  await getConsultationById(data.consultationId, data.senderId, data.senderRole);

  return await withDbRetry(() =>
    prisma.consultationMessage.create({
      data: {
        consultationId: data.consultationId,
        senderId: data.senderId,
        content: data.content,
        imageUrl: data.imageUrl,
        isRead: false,
      },
      include: {
        sender: {
          select: { id: true, name: true, role: true, avatar: true },
        },
      },
    })
  );
}

// ----------------------------------------------------
// Diet Plan Management
// ----------------------------------------------------

export async function saveDietPlan(data: {
  dietitianUserId: string;
  consultationId?: string;
  customerId: string;
  title: string;
  dailyCalorieTarget: number;
  proteinTargetGrams: number;
  carbsTargetGrams: number;
  fatsTargetGrams: number;
  notes?: string;
  foodsToLimit?: string;
  weeklyReviewNotes?: string;
  meals: Array<{
    mealType: MealType;
    foodName: string;
    foodItemId?: string;
    productId?: string;
    servingSize: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
    dietitianTip?: string;
  }>;
}) {
  const profile = await withDbRetry(() =>
    prisma.dietitianProfile.findUnique({
      where: { userId: data.dietitianUserId },
    })
  );

  if (!profile) {
    throw new Error("Dietitian profile required to author diet plans.");
  }

  return await withDbRetry(async () => {
    return await prisma.$transaction(async (tx) => {
      // Archive any previous active plan for this customer if creating new
      await tx.dietPlan.updateMany({
        where: { customerId: data.customerId, status: DietPlanStatus.ACTIVE },
        data: { status: DietPlanStatus.COMPLETED },
      });

      const plan = await tx.dietPlan.create({
        data: {
          consultationId: data.consultationId,
          customerId: data.customerId,
          dietitianId: profile.id,
          title: data.title,
          status: DietPlanStatus.ACTIVE,
          dailyCalorieTarget: data.dailyCalorieTarget,
          proteinTargetGrams: data.proteinTargetGrams,
          carbsTargetGrams: data.carbsTargetGrams,
          fatsTargetGrams: data.fatsTargetGrams,
          notes: data.notes,
          foodsToLimit: data.foodsToLimit,
          weeklyReviewNotes: data.weeklyReviewNotes,
          meals: {
            create: data.meals.map((m, idx) => ({
              mealType: m.mealType,
              foodName: m.foodName,
              foodItemId: m.foodItemId,
              productId: m.productId,
              servingSize: m.servingSize,
              quantity: m.quantity,
              unit: m.unit,
              calories: m.calories,
              protein: m.protein,
              carbohydrates: m.carbohydrates,
              fat: m.fat,
              dietitianTip: m.dietitianTip,
              displayOrder: idx,
            })),
          },
        },
        include: {
          meals: true,
          dietitian: true,
        },
      });

      return plan;
    });
  });
}

export async function getActiveDietPlanForCustomer(customerId: string) {
  return await withDbRetry(() =>
    prisma.dietPlan.findFirst({
      where: { customerId, status: DietPlanStatus.ACTIVE },
      include: {
        dietitian: true,
        meals: {
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );
}

export async function getAllDietPlansForCustomer(customerId: string) {
  return await withDbRetry(() =>
    prisma.dietPlan.findMany({
      where: { customerId },
      include: {
        dietitian: true,
        meals: {
          orderBy: { displayOrder: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );
}

// ----------------------------------------------------
// Nutrition Tracker Integration
// ----------------------------------------------------

export async function logDietPlanMealToTracker(mealId: string, customerId: string) {
  const meal = await withDbRetry(() =>
    prisma.dietPlanMeal.findUnique({
      where: { id: mealId },
      include: {
        dietPlan: true,
      },
    })
  );

  if (!meal) throw new Error("Diet plan meal not found.");
  if (meal.dietPlan.customerId !== customerId) {
    throw new Error("Unauthorized to log meal from this diet plan.");
  }

  const now = new Date();
  const dateKey = now.toISOString().split("T")[0];

  return await withDbRetry(() =>
    prisma.foodLog.create({
      data: {
        userId: customerId,
        foodItemId: meal.foodItemId,
        productId: meal.productId,
        foodNameSnapshot: meal.foodName,
        mealType: meal.mealType,
        quantity: meal.quantity,
        unit: meal.unit,
        servingUnitSnapshot: meal.servingSize,
        calories: meal.calories,
        protein: meal.protein,
        carbohydrates: meal.carbohydrates,
        fat: meal.fat,
        loggedAt: now,
        dateKey,
      },
    })
  );
}

// ----------------------------------------------------
// Admin Operations
// ----------------------------------------------------

export async function adminGetAllDietitians() {
  return await withDbRetry(() =>
    prisma.dietitianProfile.findMany({
      include: {
        user: {
          select: { email: true, createdAt: true },
        },
        _count: {
          select: {
            consultations: true,
            dietPlans: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  );
}

export async function adminVerifyDietitian(id: string, status: DietitianVerificationStatus) {
  const isVerified = status === DietitianVerificationStatus.APPROVED;
  return await withDbRetry(() =>
    prisma.dietitianProfile.update({
      where: { id },
      data: {
        verificationStatus: status,
        isVerified,
        verifiedAt: isVerified ? new Date() : null,
      },
    })
  );
}
