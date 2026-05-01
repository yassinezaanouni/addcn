"use client";

import { useCommandEditorStore } from "@/stores/command-editor-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { COMMAND_NAME_RULES } from "@/lib/validators";

function toCommandSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/--+/g, "-");
}

export function CommandMetaForm() {
  const { name, setMetadata } = useCommandEditorStore();

  return (
    <div className="space-y-1.5">
      <Label htmlFor="command-name" className="text-xs">
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
    </div>
  );
}
