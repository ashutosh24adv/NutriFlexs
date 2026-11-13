import { z } from "zod";

export const RoleEnum = z.enum(["CUSTOMER", "TRAINER", "KITCHEN", "ADMIN"]);

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

export const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").toLowerCase(),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(10, "Valid refresh token is required"),
});

export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;

export const phoneOtpRequestSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
});

export type PhoneOtpRequestInput = z.infer<typeof phoneOtpRequestSchema>;

export const phoneOtpVerifySchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^(\+91)?[6-9]\d{9}$/, "Please enter a valid 10-digit Indian mobile number"),
  otp: z.string().trim().regex(/^\d{4,6}$/, "OTP must be 4 to 6 digits"),
  name: z.string().trim().min(2).max(100).optional(),
});

export type PhoneOtpVerifyInput = z.infer<typeof phoneOtpVerifySchema>;

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google ID Token is required"),
});

export type GoogleAuthInput = z.infer<typeof googleAuthSchema>;

export const appleAuthSchema = z.object({
  identityToken: z.string().min(1, "Apple Identity Token is required"),
  authorizationCode: z.string().optional(),
  user: z
    .object({
      name: z.string().optional(),
      email: z.string().email().optional(),
    })
    .optional(),
});

export type AppleAuthInput = z.infer<typeof appleAuthSchema>;

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
