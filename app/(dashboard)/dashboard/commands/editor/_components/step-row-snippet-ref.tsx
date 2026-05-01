"use client";

import Link from "next/link";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { Button } from "@/components/ui/button";
import {
  IconArrowDown,
  IconArrowUp,
  IconArrowUpRight,
  IconLinkOff,
  IconPackage,
  IconX,
} from "@tabler/icons-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Doc } from "@/convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { TruncatedCode } from "@/components/shared/truncated-code";

interface StepRowSnippetRefProps {
  index: number;
  resolved: Doc<"snippets"> | null;
  resolvedPreview: string;
  isFirst: boolean;
  isLast: boolean;
  canRemove: boolean;
}

export function StepRowSnippetRef({
  index,
  resolved,
  resolvedPreview,
  isFirst,
  isLast,
  canRemove,
}: StepRowSnippetRefProps) {
  const removeStep = useCommandEditorStore((s) => s.removeStep);
  const moveStep = useCommandEditorStore((s) => s.moveStep);

  const isBroken = resolved === null;

  return (
    <div
      className={cn(
        "rounded-lg border bg-card/50",
        isBroken ? "border-destructive/40" : "border-emerald-500/30",
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/40 px-3 py-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            Step {index + 1}
          </span>
          {isBroken ? (
            <span className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-0.5 font-mono text-[11px] text-destructive">
              <IconLinkOff className="size-3" />
              broken snippet
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400">
              <IconPackage className="size-3" />
              {resolved!.title || resolved!.name}
            </span>
          )}
          {!isBroken && !resolved!.isPublic && (
            <Tooltip>
              <TooltipTrigger
                render={<span />}
                className="rounded-md bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400"
              >
                Private
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[220px] text-xs">
                Anyone running this workflow needs your registry token to
                install a private snippet.
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {!isBroken && (
            <Link
              href={`/dashboard/editor/${resolved!._id}`}
              target="_blank"
              rel="noreferrer"
            >
              <Button
                type="button"
                size="icon-sm"
                variant="ghost"
                title="Open snippet in editor"
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
        {isBroken ? (
          <code className="block truncate font-mono text-xs text-muted-foreground">
            (referenced snippet no longer exists)
          </code>
        ) : (
          <TruncatedCode
            text={resolvedPreview}
            className="text-xs text-muted-foreground"
          />
        )}
      </div>
    </div>
  );
}
