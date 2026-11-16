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
  maxRetries = 2,
  delayMs = 500
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err: any) {
      lastError = err;
      const isConnectionError =
        err?.message?.includes("Can't reach database server") ||
        err?.message?.includes("Connection refused") ||
        err?.message?.includes("Connection closed") ||
        err?.message?.includes("timed out") ||
        err?.name === "PrismaClientInitializationError" ||
        err?.code === "P1001"; // Prisma connection error code

      if (isConnectionError && attempt < maxRetries) {
        console.warn(
          `[Prisma/Neon] Transient connection issue on attempt ${attempt + 1}. Retrying in ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

