/**
 * Authentication and User Domain Types
 */

export type Role = "CUSTOMER" | "TRAINER" | "KITCHEN" | "ADMIN";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatar?: string | null;
  phone?: string | null;
  selectedGymId?: string | null;
  selectedOutletId?: string | null;
  streakDays: number;
  proteinGoalGrams: number;
  weightKg?: number | null;
  customDailyProteinGoal?: number | null;
  isVegetarian: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
  tokenType: "Bearer";
}

export interface AuthResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenId: string;
  version?: number;
}

export interface AccessTokenPayload {
  userId: string;
  email: string;
  role: Role;
}

export interface OtpRequestResult {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  providerRef?: string;
}
