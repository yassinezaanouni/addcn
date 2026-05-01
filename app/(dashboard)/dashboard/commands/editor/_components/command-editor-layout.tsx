"use client";

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { LayoutGroup } from "motion/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { TagInput as SharedTagInput } from "@/components/shared/tag-input";
import { Skeleton } from "@/components/ui/skeleton";

import { Toolbar } from "./toolbar";
import { CommandMetaForm } from "./command-meta-form";
import { StepList } from "./step-list";
import { WorkflowPreview } from "./workflow-preview";

const PANEL_BASE =
  "overflow-hidden rounded-xl border border-border/50 shadow-lg shadow-black/5";
const PANEL_BG = "bg-card/80 backdrop-blur-sm dark:bg-card/60";
const PANEL_SOLID = "bg-card shadow-xl dark:shadow-black/20";

function TagsSection() {
  const tags = useCommandEditorStore((s) => s.tags);
  const addTag = useCommandEditorStore((s) => s.addTag);
  const removeTag = useCommandEditorStore((s) => s.removeTag);

  const { data: knownTags = [] } = useQuery(
    convexQuery(api.commands.getMyCommandTags, {}),
  );

  return (
    <SharedTagInput
      tags={tags}
      knownTags={knownTags}
      onAdd={addTag}
      onRemove={removeTag}
    />
  );
}

interface CommandEditorLayoutProps {
  onClose: () => void;
  isLoading?: boolean;
}

export function CommandEditorLayout({
  onClose,
  isLoading = false,
}: CommandEditorLayoutProps) {
  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-3 p-4">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <LayoutGroup>
      <div className="@container relative flex h-full flex-col gap-3 bg-linear-to-br from-background via-background to-muted/30 p-3">
        <Toolbar onClose={onClose} />

        <div className="flex h-full flex-1 flex-col gap-2 overflow-hidden @4xl:flex-row">
          {/* Left pane: preview + step list */}
          <div
            className={cn(
              PANEL_BASE,
              PANEL_SOLID,
              "flex flex-1 flex-col overflow-y-auto",
            )}
          >
            <WorkflowPreview />
            <StepList />
          </div>

          {/* Right sidebar */}
          <div className="flex shrink-0 flex-col gap-3 overflow-y-auto @4xl:w-[min(100%,18rem)]">
            <div className={cn(PANEL_BASE, PANEL_BG)}>
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Command
                </span>
              </div>
              <CommandMetaForm />
            </div>

            <div className={cn(PANEL_BASE, PANEL_BG)}>
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags
                </span>
              </div>
              <div className="px-4 pb-4">
                <TagsSection />
              </div>
            </div>
          </div>
        </div>
      </div>
    </LayoutGroup>
  );
}
