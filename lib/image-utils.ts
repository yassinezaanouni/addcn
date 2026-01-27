/**
 * Browser-only image utilities for converting images to WebP.
 */

import {
  isImageType,
  MAX_IMAGE_SIZE,
  formatFileSize,
} from "./upload-constants";

export interface ConversionResult {
  file: File;
  wasConverted: boolean;
  originalSize: number;
  newSize: number;
}

// Modern formats that don't need conversion
const MODERN_IMAGE_FORMATS = ["image/webp", "image/avif"];

/**
 * Convert an image file to WebP format.
 * If the image is already WebP/AVIF or conversion fails, returns the original.
 * Also validates size after conversion.
 */
export async function convertToWebP(
  file: File,
  quality = 0.85,
): Promise<ConversionResult> {
  // Skip if not an image or already a modern format
  if (!isImageType(file.type) || MODERN_IMAGE_FORMATS.includes(file.type)) {
    return {
      file,
      wasConverted: false,
      originalSize: file.size,
      newSize: file.size,
    };
  }

  try {
    // Create image element
    const img = await loadImage(file);

    // Create canvas and draw image
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not get canvas context");
    }

    ctx.drawImage(img, 0, 0);

    // Convert to WebP blob
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, "image/webp", quality);
    });

    if (!blob) {
      throw new Error("Could not convert to WebP");
    }

    // Create new file with WebP extension
    const originalName = file.name.replace(/\.[^.]+$/, "");
    const webpFile = new File([blob], `${originalName}.webp`, {
      type: "image/webp",
    });

    return {
      file: webpFile,
      wasConverted: true,
      originalSize: file.size,
      newSize: webpFile.size,
    };
  } catch {
    // If conversion fails, return original
    return {
      file,
      wasConverted: false,
      originalSize: file.size,
      newSize: file.size,
    };
  }
}

/**
 * Load an image file and return an HTMLImageElement.
 */
function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(img.src);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error("Failed to load image"));
    };
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Process an image file: convert to WebP and validate size.
 * Returns the processed file or throws an error.
 */
export async function processImageFile(file: File): Promise<{
  file: File;
  wasConverted: boolean;
}> {
  // Convert to WebP
  const result = await convertToWebP(file);

  // Validate size after conversion
  if (result.file.size > MAX_IMAGE_SIZE) {
    throw new Error(
      `Image is too large after conversion (${formatFileSize(result.file.size)}). ` +
        `Maximum size is ${formatFileSize(MAX_IMAGE_SIZE)}.`,
    );
  }

  return {
    file: result.file,
    wasConverted: result.wasConverted,
  };
}
