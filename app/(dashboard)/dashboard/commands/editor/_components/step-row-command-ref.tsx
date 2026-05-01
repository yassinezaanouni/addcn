"use client";

import Link from "next/link";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { Button } from "@/components/ui/button";
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowUpRight,
  IconLink,
  IconLinkOff,
  IconX,
} from "@tabler/icons-react";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";

interface StepRowCommandRefProps {
  index: number;
  refCommandId: Id<"commands">;
  resolved: Doc<"commands"> | null;
  resolvedPreview: string;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
}

export function StepRowCommandRef({
  index,
  refCommandId,
  resolved,
  resolvedPreview,
  isFirst,
  isLast,
  canRemove,
}: StepRowCommandRefProps) {
  const removeStep = useCommandEditorStore((s) => s.removeStep);
  const moveStep = useCommandEditorStore((s) => s.moveStep);

  const isBroken = resolved === null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/50",
        isBroken
          ? "border-destructive/40"
          : "border-violet-500/30",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-1.5">
        <div className="flex items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Step {index + 1}
          </span>
          {isBroken ? (
            <span className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 font-mono text-[11px] text-destructive">
              <IconLinkOff className="size-3" />
              broken reference
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-0.5 font-mono text-[11px] text-violet-600 dark:text-violet-400">
              <IconLink className="size-3" />↪ {resolved!.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {!isBroken && (
            <Link href={`/dashboard/commands?edit=${refCommandId}`}>
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                title="Open referenced command"
                className="size-6"
              >
                <IconArrowUpRight className="size-3.5" />
              </Button>
            </Link>
          )}
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
            className={cn(
              "size-6",
              canRemove && "text-destructive/80 hover:text-destructive",
            )}
          >
            <IconX className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="px-3 py-2">
        <code className="block truncate font-mono text-xs text-muted-foreground">
          {isBroken
            ? "(referenced command no longer exists)"
            : resolvedPreview}
        </code>
      </div>
    </div>
  );
}
