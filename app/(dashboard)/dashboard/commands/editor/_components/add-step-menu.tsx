"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { IconPencil, IconPlus } from "@tabler/icons-react";
import { SavedCommandPicker } from "./saved-command-picker";
import { SnippetPicker } from "./snippet-picker";
import type { Id } from "@/convex/_generated/dataModel";

export function AddStepMenu({
  excludeCommandIds,
}: {
  excludeCommandIds: Id<"commands">[];
}) {
  const [open, setOpen] = useState(false);
  const addInlineStep = useCommandEditorStore((s) => s.addInlineStep);
  const addCommandRefStep = useCommandEditorStore((s) => s.addCommandRefStep);
  const addSnippetRefStep = useCommandEditorStore((s) => s.addSnippetRefStep);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2 font-mono text-xs"
          />
        }
      >
        <IconPlus className="size-4" />
        Add step
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-72 gap-0 p-1"
      >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 font-normal"
          onClick={() => {
            addInlineStep();
            setOpen(false);
          }}
        >
          <IconPencil className="size-3.5 text-foreground/70" />
          Write inline
        </Button>
        <SavedCommandPicker
          excludeIds={excludeCommandIds}
          onPick={(id) => {
            addCommandRefStep(id);
            setOpen(false);
          }}
        />
        <SnippetPicker
          onPick={(id) => {
            addSnippetRefStep(id);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
