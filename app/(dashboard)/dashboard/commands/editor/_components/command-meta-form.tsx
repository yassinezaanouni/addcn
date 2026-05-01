"use client";

import { useCommandEditorStore } from "@/stores/command-editor-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { COMMAND_DESCRIPTION_MAX_LENGTH, COMMAND_NAME_RULES } from "@/lib/validators";

function toCommandSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-");
}

export function CommandMetaForm() {
  const { name, description, setMetadata } = useCommandEditorStore();

  return (
    <div className="space-y-4 px-4 pb-4">
      <div className="space-y-2">
        <Label htmlFor="command-name">
          Name
          <span className="ml-1 text-destructive">*</span>
        </Label>
        <Input
          id="command-name"
          value={name}
          onChange={(e) => setMetadata({ name: toCommandSlug(e.target.value) })}
          placeholder="my-command"
          maxLength={COMMAND_NAME_RULES.maxLength}
          className="font-mono"
        />
        <p className="text-[11px] text-muted-foreground">
          Lowercase, numbers, and hyphens only.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="command-description">Description</Label>
        <Textarea
          id="command-description"
          value={description}
          onChange={(e) => setMetadata({ description: e.target.value })}
          placeholder="What does this command do?"
          rows={2}
          maxLength={COMMAND_DESCRIPTION_MAX_LENGTH}
          className="resize-none"
        />
      </div>
    </div>
  );
}
