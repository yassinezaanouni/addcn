"use client";

import { useEffect, useRef } from "react";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MAX_COMMAND_LENGTH } from "@/lib/validators";
import {
  IconArrowDown,
  IconArrowUp,
  IconTerminal,
  IconX,
} from "@tabler/icons-react";

interface StepRowInlineProps {
  index: number;
  value: string;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
  onRequestAddBelow: () => void;
}

export function StepRowInline({
  index,
  value,
  isFirst,
  isLast,
  canRemove,
  onRequestAddBelow,
}: StepRowInlineProps) {
  const updateInlineCommand = useCommandEditorStore(
    (s) => s.updateInlineCommand,
  );
  const removeStep = useCommandEditorStore((s) => s.removeStep);
  const moveStep = useCommandEditorStore((s) => s.moveStep);

  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-grow up to ~6 rows.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 144) + "px";
  }, [value]);

  return (
    <div className="rounded-lg border border-border/50 bg-card/50 transition-colors focus-within:border-primary/40">
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Step {index + 1}
          </span>
          <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
            <IconTerminal className="size-3" />
            Inline
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={isFirst}
            onClick={() => moveStep(index, index - 1)}
            title="Move up"
            className="size-6"
          >
            <IconArrowUp className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={isLast}
            onClick={() => moveStep(index, index + 1)}
            title="Move down"
            className="size-6"
          >
            <IconArrowDown className="size-3.5" />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            disabled={!canRemove}
            onClick={() => removeStep(index)}
            title="Remove step"
            className={cn("size-6", canRemove && "text-destructive/80 hover:text-destructive")}
          >
            <IconX className="size-3.5" />
          </Button>
        </div>
      </div>
      <textarea
        ref={ref}
        value={value}
        maxLength={MAX_COMMAND_LENGTH}
        onChange={(e) => updateInlineCommand(index, e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onRequestAddBelow();
          }
        }}
        placeholder="e.g. pnpm install"
        rows={1}
        className="block w-full resize-none bg-transparent px-3 py-2 font-mono text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />
    </div>
  );
}
