const { PrismaClient, Role, DietitianVerificationStatus, ConsultationType } = require("@prisma/client");
const { randomBytes, scryptSync } = require("crypto");

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = scryptSync(password, salt, 64);
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding additional certified fitness & lifestyle coaches...");

  const coaches = [
    {
      email: "coach.vikram@nutriflexs.com",
      name: "Vikram Rao",
      fullName: "Vikram Rao",
      bio: "Former national decathlete and NSCA-certified Strength & Conditioning Coach (CSCS). Over the past 7 years, I've mentored 400+ gym members and athletes to break through strength plateaus, master compound lifts, build dense functional muscle, and stay injury-free.",
      qualifications: "Certified Strength & Conditioning Specialist (CSCS), Kettlebell Master Instructor",
      experienceYears: 7,
      consultationFee: 649,
      rating: 4.9,
      reviewCount: 38,
      isVerified: true,
      verificationStatus: DietitianVerificationStatus.APPROVED,
      languages: ["English", "Hindi", "Kannada"],
      specializations: [
        "Build Muscle",
        "Improve Strength",
        "Improve Athletic Performance",
        "Hypertrophy",
        "Workout Consistency",
      ],
      availableFormats: [ConsultationType.ONLINE, ConsultationType.IN_PERSON],
      profileImageUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    },
    {
      email: "coach.priya@nutriflexs.com",
      name: "Priya Nair",
      fullName: "Priya Nair",
      bio: "Certified Fitness & Lifestyle Habit Mentor specializing in sustainable body recomposition and fat loss for busy professionals. I focus on mindset, progressive gym training, stress management, and realistic daily nutritional habits that don't cut out your social life.",
      qualifications: "ACE Certified Personal Trainer, PN Level 1 Nutrition Coach",
      experienceYears: 5,
      consultationFee: 499,
      rating: 4.8,
      reviewCount: 29,
      isVerified: true,
      verificationStatus: DietitianVerificationStatus.APPROVED,
      languages: ["English", "Hindi", "Malayalam"],
      specializations: [
        "Lose Weight",
        "Build Healthy Habits",
        "Fat Loss",
        "Workout Consistency",
        "Lifestyle Improvement",
      ],
      availableFormats: [ConsultationType.ONLINE, ConsultationType.IN_PERSON],
      profileImageUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    },
  ];

  const passwordHash = hashPassword("NutriFlexsCoach2026!");

  for (const c of coaches) {
    let user = await prisma.user.findUnique({ where: { email: c.email } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: c.email,
          name: c.name,
          passwordHash,
          role: Role.DIETITIAN,
          avatar: c.profileImageUrl,
        },
      });
      console.log(`Created user ${c.email}`);
    }

    let profile = await prisma.dietitianProfile.findUnique({ where: { userId: user.id } });
    if (!profile) {
      profile = await prisma.dietitianProfile.create({
        data: {
          userId: user.id,
          fullName: c.fullName,
          bio: c.bio,
          qualifications: c.qualifications,
          experienceYears: c.experienceYears,
          consultationFee: c.consultationFee,
          rating: c.rating,
          reviewCount: c.reviewCount,
          isVerified: c.isVerified,
          verificationStatus: c.verificationStatus,
          languages: c.languages,
          specializations: c.specializations,
          availableFormats: c.availableFormats,
          profileImageUrl: c.profileImageUrl,
        },
      });
      console.log(`Created profile for ${c.fullName}`);

      // Seed standard availability slots (Mon-Sat, 10am to 6pm)
      for (let day = 1; day <= 6; day++) {
        await prisma.dietitianAvailability.createMany({
          data: [
            { dietitianProfileId: profile.id, dayOfWeek: day, startTime: "10:00", endTime: "10:45", slotDurationMinutes: 45, isAvailable: true },
            { dietitianProfileId: profile.id, dayOfWeek: day, startTime: "11:30", endTime: "12:15", slotDurationMinutes: 45, isAvailable: true },
            { dietitianProfileId: profile.id, dayOfWeek: day, startTime: "15:00", endTime: "15:45", slotDurationMinutes: 45, isAvailable: true },
            { dietitianProfileId: profile.id, dayOfWeek: day, startTime: "17:00", endTime: "17:45", slotDurationMinutes: 45, isAvailable: true },
          ],
        });
      }
      console.log(`Seeded slots for ${c.fullName}`);
    }
  }

  // Also ensure existing 3 coaches have standard goal specializations matching the 6 cards:
  // "Lose Weight", "Build Muscle", "Gain Weight", "Improve Strength", "Improve Athletic Performance", "Build Healthy Habits"
  const existingProfiles = await prisma.dietitianProfile.findMany();
  for (const p of existingProfiles) {
    const specs = new Set(p.specializations);
    if (p.fullName.includes("Ananya")) {
      specs.add("Lose Weight");
      specs.add("Build Healthy Habits");
      specs.add("Improve Athletic Performance");
    } else if (p.fullName.includes("Kavita")) {
      specs.add("Lose Weight");
      specs.add("Build Healthy Habits");
    } else if (p.fullName.includes("Rohan")) {
      specs.add("Build Muscle");
      specs.add("Gain Weight");
      specs.add("Improve Strength");
      specs.add("Improve Athletic Performance");
    }
    await prisma.dietitianProfile.update({
      where: { id: p.id },
      data: { specializations: Array.from(specs) },
    });
  }

  console.log("Successfully seeded coaches and standardized goal specializations!");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
