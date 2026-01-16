"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEditorStore } from "@/stores/editor-store";

export function ComponentMetaForm() {
  const { name, title, description, setMetadata } = useEditorStore();

  const handleNameChange = (value: string) => {
    // Convert to kebab-case
    const kebabCase = value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    setMetadata({ name: kebabCase });
  };

  return (
    <div className="space-y-4 border-b border-border p-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">Name</label>
        <Input
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="my-component"
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Used for the registry (kebab-case)
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Title</label>
        <Input
          value={title}
          onChange={(e) => setMetadata({ title: e.target.value })}
          placeholder="My Component"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <Textarea
          value={description}
          onChange={(e) => setMetadata({ description: e.target.value })}
          placeholder="A brief description of your component"
          rows={2}
          className="resize-none"
        />
      </div>
    </div>
  );
}
