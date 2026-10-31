import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
  phone: z.string().trim().max(20).optional().nullable(),
  portal: z.string().trim().toLowerCase().optional().nullable(),
  inviteCode: z.string().trim().optional().nullable(),
  accessCode: z.string().trim().optional().nullable(),
  outletId: z.string().trim().optional().nullable(),
  referralCode: z.string().trim().optional().nullable(),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const createStaffAccessCodeSchema = z.object({
  role: z.enum(["KITCHEN", "TRAINER", "ADMIN"], {
    errorMap: () => ({ message: "Role must be KITCHEN, TRAINER, or ADMIN" }),
  }),
  outletId: z.string().trim().optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
  maxUses: z.number().int().min(1, "Maximum uses must be at least 1").default(1),
  description: z.string().trim().max(200).optional().nullable(),
  customCode: z
    .string()
    .trim()
    .min(6, "Custom code must be at least 6 characters")
    .max(50)
    .optional()
    .nullable(),
});

export type CreateStaffAccessCodeInput = z.infer<typeof createStaffAccessCodeSchema>;

export const revokeStaffAccessCodeSchema = z.object({
  id: z.string().min(1, "Access code ID is required"),
  isActive: z.boolean().default(false),
});

export type RevokeStaffAccessCodeInput = z.infer<typeof revokeStaffAccessCodeSchema>;
