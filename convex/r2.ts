import { R2 } from "@convex-dev/r2";
import { components } from "./_generated/api";

/**
 * File size limits (must match lib/upload-constants.ts)
 * - Images: 5MB max
 * - Videos: 20MB max
 *
 * Note: Size validation happens client-side before upload.
 * The R2 component uses presigned URLs, so we can't validate
 * file size server-side before upload. If needed, post-upload
 * validation could be added in onUpload callback.
 */

export const r2 = new R2(components.r2);

// Client-side upload API
export const { generateUploadUrl, syncMetadata } = r2.clientApi({
  checkUpload: async (_ctx, _bucket) => {
    // Auth checks could be added here if needed
    // File metadata is not available at this point
  },
  onUpload: async (_ctx, _bucket, _key) => {
    // Post-upload actions (logging, etc.) could be added here
    // Could also validate file size here and delete if too large
  },
});

// Export for server-side usage
export { r2 as r2Client };
