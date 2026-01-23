/**
 * Constants and utilities for file uploads.
 * Shared between browser and server code.
 */

// Supported MIME types
export const SUPPORTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
];

export const SUPPORTED_VIDEO_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
];

export const ALL_SUPPORTED_TYPES = [
  ...SUPPORTED_IMAGE_TYPES,
  ...SUPPORTED_VIDEO_TYPES,
];

// Size limits
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB
export const MAX_VIDEO_SIZE = 20 * 1024 * 1024; // 20MB

// Public URL for R2 bucket (must be set in environment)
export const R2_PUBLIC_URL =
  process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "https://r2.example.com";

// Helper functions
export function isImageType(mimeType: string): boolean {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType);
}

export function isVideoType(mimeType: string): boolean {
  return SUPPORTED_VIDEO_TYPES.includes(mimeType);
}

export function isSupportedType(mimeType: string): boolean {
  return ALL_SUPPORTED_TYPES.includes(mimeType);
}

export function getMaxSizeForType(mimeType: string): number {
  if (isImageType(mimeType)) return MAX_IMAGE_SIZE;
  if (isVideoType(mimeType)) return MAX_VIDEO_SIZE;
  return 0; // Unsupported type
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  mediaType?: "image" | "video";
}

export function validateFile(file: File): FileValidationResult {
  const { type, size } = file;

  // Check if type is supported
  if (!isSupportedType(type)) {
    return {
      valid: false,
      error: `Unsupported file type: ${type}. Supported: ${ALL_SUPPORTED_TYPES.join(", ")}`,
    };
  }

  // Check size based on type
  const maxSize = getMaxSizeForType(type);
  if (size > maxSize) {
    const typeLabel = isImageType(type) ? "Images" : "Videos";
    return {
      valid: false,
      error: `${typeLabel} must be under ${formatFileSize(maxSize)}. Your file is ${formatFileSize(size)}.`,
    };
  }

  return {
    valid: true,
    mediaType: isImageType(type) ? "image" : "video",
  };
}
