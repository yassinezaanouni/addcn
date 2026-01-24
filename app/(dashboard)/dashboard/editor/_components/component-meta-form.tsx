"use client";

import { useEditorStore } from "@/stores/editor-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Convert to kebab-case
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function ComponentMetaForm() {
  const { name, title, description, setMetadata } = useEditorStore();

  return (
    <div className="space-y-4 px-4 pb-4">
      {/* Name field */}
      <div className="space-y-2">
        <Label htmlFor="name">Slug</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setMetadata({ name: toKebabCase(e.target.value) })}
          placeholder="my-component"
          className="font-mono"
        />
        <p className="text-[11px] text-muted-foreground">
          URL: /r/namespace/<span className="text-foreground">{name || "slug"}</span>
        </p>
      </div>

      {/* Title field */}
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
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
