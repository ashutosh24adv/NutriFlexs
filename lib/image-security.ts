import { randomUUID } from "crypto";

export interface ImageValidationResult {
  valid: boolean;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
  extension?: "jpg" | "png" | "webp";
  error?: string;
  sizeBytes: number;
  serverFilename?: string;
}

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024; // 8MB

/**
 * Validates image buffer using magic bytes (file signature) rather than relying on user MIME type or extension.
 * Supports JPEG, PNG, and WebP.
 */
export function validateImageBuffer(buffer: Buffer): ImageValidationResult {
  const sizeBytes = buffer.length;

  if (sizeBytes === 0) {
    return { valid: false, sizeBytes, error: "Empty file received" };
  }

  if (sizeBytes > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      sizeBytes,
      error: `File size exceeds 8MB limit (${(sizeBytes / 1024 / 1024).toFixed(1)}MB)`,
    };
  }

  // 1. JPEG Magic Bytes: FF D8 FF
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    const serverFilename = `${randomUUID()}.jpg`;
    return {
      valid: true,
      mimeType: "image/jpeg",
      extension: "jpg",
      sizeBytes,
      serverFilename,
    };
  }

  // 2. PNG Magic Bytes: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    const serverFilename = `${randomUUID()}.png`;
    return {
      valid: true,
      mimeType: "image/png",
      extension: "png",
      sizeBytes,
      serverFilename,
    };
  }

  // 3. WebP Magic Bytes: RIFF....WEBP (Bytes 0-3: 52 49 46 46, Bytes 8-11: 57 45 42 50)
  if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    const serverFilename = `${randomUUID()}.webp`;
    return {
      valid: true,
      mimeType: "image/webp",
      extension: "webp",
      sizeBytes,
      serverFilename,
    };
  }

  return {
    valid: false,
    sizeBytes,
    error: "Unsupported image format. Only valid JPEG, PNG, or WebP images are permitted.",
  };
}

/**
 * Sanitizes user-provided filename to prevent path traversal.
 */
export function sanitizeUploadFilename(filename: string): string {
  const baseName = filename.replace(/^.*[\\\/]/, "");
  return baseName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
}

