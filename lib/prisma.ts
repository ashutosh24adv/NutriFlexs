import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/**
 * Resilient helper for executing database operations with automatic retry
 * on transient Neon compute wake-up or connection timeouts.
 */
export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const errMsg = (err?.message || "").toLowerCase();
      const errCode = err?.code || "";
      const isConnectionError =
        errMsg.includes("can't reach database server") ||
        errMsg.includes("connection refused") ||
        errMsg.includes("connection closed") ||
        errMsg.includes("timed out") ||
        errMsg.includes("closed") ||
        errMsg.includes("econnreset") ||
        errMsg.includes("etimedout") ||
        err?.name === "PrismaClientInitializationError" ||
        errCode === "P1000" ||
        errCode === "P1001" ||
        errCode === "P1002" ||
        errCode === "P1008" ||
        errCode === "P1017" ||
        errCode === "P2024";

      if (isConnectionError && attempt < maxRetries) {
        const backoffMs = delayMs * (attempt + 1);
        console.warn(
          `[Prisma/Neon] Transient compute wake-up / connection pause (attempt ${attempt + 1}/${maxRetries}). Retrying in ${backoffMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

