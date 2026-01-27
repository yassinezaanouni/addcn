import { z } from "zod";

export const componentMetadataSchema = z.object({
  name: z
    .string()
    .min(1, "Slug is required")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export type ComponentMetadata = z.infer<typeof componentMetadataSchema>;

export type ComponentMetadataErrors = {
  [K in keyof ComponentMetadata]?: string;
};

export function validateComponentMetadata(data: ComponentMetadata): {
  success: boolean;
  errors: ComponentMetadataErrors;
} {
  const result = componentMetadataSchema.safeParse(data);

  if (result.success) {
    return { success: true, errors: {} };
  }

  const errors: ComponentMetadataErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof ComponentMetadata;
    if (!errors[field]) {
      errors[field] = issue.message;
    }
  }

  return { success: false, errors };
}
