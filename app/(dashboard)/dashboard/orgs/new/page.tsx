"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";

const SLUG_RULES = {
  minLength: 3,
  maxLength: 39,
  pattern: /^[a-z0-9-]+$/,
};

/**
 * Converts a name to kebab-case for use as a slug
 */
function toKebabCase(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove non-alphanumeric except spaces and hyphens
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Replace multiple hyphens with single hyphen
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Validates slug format matching server-side validation
 */
function validateSlug(slug: string): string | null {
  if (slug.length < SLUG_RULES.minLength) {
    return `Slug must be at least ${SLUG_RULES.minLength} characters`;
  }
  if (slug.length > SLUG_RULES.maxLength) {
    return `Slug must be at most ${SLUG_RULES.maxLength} characters`;
  }
  if (!SLUG_RULES.pattern.test(slug)) {
    return "Slug can only contain lowercase letters, numbers, and hyphens";
  }
  if (slug.startsWith("-") || slug.endsWith("-")) {
    return "Slug cannot start or end with a hyphen";
  }
  if (slug.includes("--")) {
    return "Slug cannot contain consecutive hyphens";
  }
  return null;
}

export default function NewOrgPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name unless manually edited
  useEffect(() => {
    if (!slugManuallyEdited) {
      setSlug(toKebabCase(name));
    }
  }, [name, slugManuallyEdited]);

  const { mutate: createOrg, isPending } = useMutation({
    mutationFn: useConvexMutation(api.organizations.create),
    onSuccess: () => {
      toast.success("Organization created successfully");
      router.push(`/dashboard/orgs/${slug}`);
    },
    onError: (err) => {
      setError(err.message || "Failed to create organization");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate name
    if (!name.trim()) {
      setError("Name is required");
      return;
    }

    // Validate slug
    const validationError = validateSlug(slug);
    if (validationError) {
      setError(validationError);
      return;
    }

    createOrg({ name: name.trim(), slug });
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(null);
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setSlug(value);
    setSlugManuallyEdited(true);
    setError(null);
  };

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Create organization</CardTitle>
          <CardDescription>
            Organizations let you collaborate on components with your team.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Organization name</Label>
              <Input
                id="name"
                type="text"
                placeholder="My Organization"
                value={name}
                onChange={handleNameChange}
                disabled={isPending}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug">URL slug</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">@</span>
                <Input
                  id="slug"
                  type="text"
                  placeholder="my-organization"
                  value={slug}
                  onChange={handleSlugChange}
                  disabled={isPending}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                3-39 characters, lowercase letters, numbers, and hyphens only
              </p>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                disabled={isPending}
                onClick={() => router.back()}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending}>
                {isPending ? "Creating..." : "Create organization"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
