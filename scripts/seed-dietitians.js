const { PrismaClient, Role, DietitianVerificationStatus, ConsultationType } = require("@prisma/client");
const { scryptSync, randomBytes } = require("crypto");

const prisma = new PrismaClient();

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

async function withRetry(fn, maxRetries = 4, delayMs = 1500) {
  let attempt = 0;
  while (attempt < maxRetries) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      console.warn(`[Retry ${attempt}/${maxRetries}] Database operation failed, retrying in ${delayMs}ms:`, err.message);
      if (attempt >= maxRetries) throw err;
      await new Promise((r) => setTimeout(r, delayMs));
      delayMs *= 1.5;
    }
  }
}

async function seed() {
  console.log("=== SEEDING DIETITIAN PROFILES IN POSTGRESQL ===");

  const dietitiansData = [
    {
      email: "ananya.dietitian@nutriflexs.com",
      name: "Dr. Ananya Sharma",
      qualifications: "M.Sc Clinical Nutrition, Registered Dietitian (RD), PhD Sports Metabolism",
      bio: "Registered Clinical Dietitian with 8+ years specializing in evidence-based body recomposition, metabolic health, and athletic nutrition. Former nutrition consultant for Cult.fit and elite national athletes.",
      experienceYears: 8,
      consultationFee: 799,
      rating: 4.95,
      reviewCount: 124,
      isVerified: true,
      verificationStatus: DietitianVerificationStatus.APPROVED,
      verifiedAt: new Date(),
      languages: ["English", "Hindi"],
      specializations: ["Weight Management", "Sports Nutrition", "PCOS / Hormonal Health", "Metabolic Reset"],
      availableFormats: [ConsultationType.ONLINE, ConsultationType.IN_PERSON],
      profileImageUrl: "https://images.unsplash.com/photo-1594824813511-236be048b64a?auto=format&fit=crop&w=600&q=80",
      availabilities: [
        { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 },
        { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 },
        { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 },
        { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 },
        { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30 },
      ],
    },
    {
      email: "kavita.dietitian@nutriflexs.com",
      name: "Kavita Reddy",
      qualifications: "M.Sc Foods & Nutrition, Certified Diabetes Educator (CDE)",
      bio: "Specializing in medical nutrition therapy for pre-diabetes, insulin resistance, PCOS, and gut health optimization through customized Indian whole-food meal plans.",
      experienceYears: 6,
      consultationFee: 599,
      rating: 4.88,
      reviewCount: 88,
      isVerified: true,
      verificationStatus: DietitianVerificationStatus.APPROVED,
      verifiedAt: new Date(),
      languages: ["English", "Telugu", "Hindi"],
      specializations: ["Diabetes & Gut Health", "Weight Loss", "Plant-Based & Vegetarian Diets"],
      availableFormats: [ConsultationType.ONLINE],
      profileImageUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=600&q=80",
      availabilities: [
        { dayOfWeek: 2, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 3, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 4, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 5, startTime: "10:00", endTime: "18:00", slotDurationMinutes: 30 },
        { dayOfWeek: 6, startTime: "10:00", endTime: "16:00", slotDurationMinutes: 30 },
      ],
    },
    {
      email: "rohan.dietitian@nutriflexs.com",
      name: "Rohan Mehta",
      qualifications: "B.Sc Nutrition & Dietetics, Certified Sports Nutritionist (CSN)",
      bio: "Specializes in hypertrophy nutrition, protein synthesis timing, and lean bulking plans for athletes and strength trainees looking to optimize physical performance.",
      experienceYears: 4,
      consultationFee: 499,
      rating: 5.0,
      reviewCount: 0,
      isVerified: false,
      verificationStatus: DietitianVerificationStatus.PENDING,
      verifiedAt: null,
      languages: ["English", "Hindi", "Gujarati"],
      specializations: ["Hypertrophy & Muscle Gain", "Athletic Performance", "Weight Gain"],
      availableFormats: [ConsultationType.ONLINE, ConsultationType.IN_PERSON],
      profileImageUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=600&q=80",
      availabilities: [
        { dayOfWeek: 1, startTime: "14:00", endTime: "20:00", slotDurationMinutes: 30 },
        { dayOfWeek: 3, startTime: "14:00", endTime: "20:00", slotDurationMinutes: 30 },
        { dayOfWeek: 5, startTime: "14:00", endTime: "20:00", slotDurationMinutes: 30 },
      ],
    },
  ];

  for (const d of dietitiansData) {
    await withRetry(async () => {
      // Find or create user
      let user = await prisma.user.findUnique({
        where: { email: d.email },
      });

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: d.name,
            email: d.email,
            passwordHash: hashPassword("Dietitian@NutriFlexs2026!"),
            role: Role.DIETITIAN,
            avatar: d.profileImageUrl,
          },
        });
        console.log(`Created user account for ${d.name} (${d.email})`);
      } else {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: Role.DIETITIAN, avatar: d.profileImageUrl },
        });
      }

      // Upsert DietitianProfile
      const profile = await prisma.dietitianProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: d.name,
          bio: d.bio,
          qualifications: d.qualifications,
          experienceYears: d.experienceYears,
          consultationFee: d.consultationFee,
          rating: d.rating,
          reviewCount: d.reviewCount,
          isVerified: d.isVerified,
          verificationStatus: d.verificationStatus,
          verifiedAt: d.verifiedAt,
          languages: d.languages,
          specializations: d.specializations,
          availableFormats: d.availableFormats,
          profileImageUrl: d.profileImageUrl,
        },
        create: {
          userId: user.id,
          fullName: d.name,
          bio: d.bio,
          qualifications: d.qualifications,
          experienceYears: d.experienceYears,
          consultationFee: d.consultationFee,
          rating: d.rating,
          reviewCount: d.reviewCount,
          isVerified: d.isVerified,
          verificationStatus: d.verificationStatus,
          verifiedAt: d.verifiedAt,
          languages: d.languages,
          specializations: d.specializations,
          availableFormats: d.availableFormats,
          profileImageUrl: d.profileImageUrl,
        },
      });

      // Clear & set availabilities
      await prisma.dietitianAvailability.deleteMany({
        where: { dietitianProfileId: profile.id },
      });

      for (const slot of d.availabilities) {
        await prisma.dietitianAvailability.create({
          data: {
            dietitianProfileId: profile.id,
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            slotDurationMinutes: slot.slotDurationMinutes,
            isAvailable: true,
          },
        });
      }

      console.log(`✓ Seeded profile & availability for ${d.name} (verified=${d.isVerified})`);
    });
  }

  await prisma.$disconnect();
  console.log("=== SEEDING COMPLETED SUCCESSFULLY ===");
}

seed().catch((e) => {
  console.error("Seed error:", e);
  process.exit(1);
});
