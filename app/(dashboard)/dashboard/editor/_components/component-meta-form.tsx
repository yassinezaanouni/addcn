"use client";

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { useEditorStore } from "@/stores/editor-store";
import { useOrgContext } from "@/components/org-switcher";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RequiredIndicator, SlugLabel } from "./form-elements";

// Filter to valid slug characters while typing (allows trailing dash)
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-");
}

export function ComponentMetaForm() {
  const { name, title, description, setMetadata } = useEditorStore();
  const context = useOrgContext();

  const { data: user } = useQuery(convexQuery(api.users.getMe, {}));
  const { data: orgs } = useQuery(convexQuery(api.organizations.getMyOrgs, {}));

  const namespace =
    context === "personal"
      ? user?.username
      : orgs?.find((org) => org._id === context)?.slug;

  return (
    <div className="space-y-4 px-4 pb-4">
      {/* Name field */}
      <div className="space-y-2">
        <SlugLabel htmlFor="name" />
        <Input
          id="name"
          value={name}
          onChange={(e) => setMetadata({ name: toSlug(e.target.value) })}
          placeholder="my-component"
          className="font-mono"
        />
        <p className="text-[11px] text-muted-foreground">
          URL: /r/{namespace || "namespace"}/
          <span className="text-foreground">{name || "slug"}</span>
        </p>
      </div>

      {/* Title field */}
      <div className="space-y-2">
        <Label htmlFor="title">
          Title
          <RequiredIndicator />
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setMetadata({ title: e.target.value })}
          placeholder="My Component"
        />
      </div>

      {/* Description field */}
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setMetadata({ description: e.target.value })}
          placeholder="A brief description of your component..."
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
}
