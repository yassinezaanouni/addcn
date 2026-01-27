"use client";

import { useState, useCallback } from "react";
import { useUploadFile } from "@convex-dev/r2/react";
import { api } from "@/convex/_generated/api";
import {
  validateFile,
  isImageType,
  R2_PUBLIC_URL,
} from "@/lib/upload-constants";

export type MediaType = "image" | "video";

export interface UploadResult {
  url: string;
  key: string;
  type: MediaType;
}

export interface UseUploadOptions {
  onSuccess?: (result: UploadResult) => void;
  onError?: (error: Error) => void;
}

export function useUpload(options: UseUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  const uploadFile = useUploadFile(api.r2);

  const upload = useCallback(
    async (file: File): Promise<UploadResult | null> => {
      // Validate file type and size using shared validation
      const validation = validateFile(file);
      if (!validation.valid) {
        const err = new Error(validation.error);
        setError(err);
        options.onError?.(err);
        return null;
      }

      setIsUploading(true);
      setProgress(0);
      setError(null);

      try {
        // Upload file using Convex R2 component
        const key = await uploadFile(file);

        setProgress(100);

        // Construct the public URL from the key
        const publicUrl = `${R2_PUBLIC_URL}/${key}`;

        const result: UploadResult = {
          url: publicUrl,
          key,
          type: isImageType(file.type) ? "image" : "video",
        };

        options.onSuccess?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Upload failed");
        setError(error);
        options.onError?.(error);
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [uploadFile, options]
  );

  return {
    upload,
    isUploading,
    progress,
    error,
  };
}
