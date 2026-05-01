"use client";

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { LayoutGroup } from "motion/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { TagInput as SharedTagInput } from "@/components/shared/tag-input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";

import { Toolbar } from "./toolbar";
import { CommandMetaForm } from "./command-meta-form";
import { StepList } from "./step-list";
import { WorkflowPreview } from "./workflow-preview";

const PANEL_BASE =
  "overflow-hidden rounded-xl border border-border/50 shadow-lg shadow-black/5";
const PANEL_BG = "bg-card/80 backdrop-blur-sm dark:bg-card/60";
const PANEL_SOLID = "bg-card shadow-xl dark:shadow-black/20";

function TagsField() {
  const tags = useCommandEditorStore((s) => s.tags);
  const addTag = useCommandEditorStore((s) => s.addTag);
  const removeTag = useCommandEditorStore((s) => s.removeTag);

  const { data: knownTags = [] } = useQuery(
    convexQuery(api.commands.getMyCommandTags, {}),
  );

  return (
    <div className="space-y-1.5">
      <Label className="text-xs">Tags</Label>
      <SharedTagInput
        tags={tags}
        knownTags={knownTags}
        onAdd={addTag}
        onRemove={removeTag}
      />
    </div>
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

        {/* Top: name + tags side by side (stacked on narrow widths) */}
        <div className={cn(PANEL_BASE, PANEL_BG, "p-4")}>
          <div className="grid gap-4 @md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <CommandMetaForm />
            <TagsField />
          </div>
        </div>

        {/* Steps + preview, full width */}
        <div className={cn(PANEL_BASE, PANEL_SOLID, "flex flex-1 flex-col overflow-y-auto")}>
          <WorkflowPreview />
          <StepList />
        </div>
      </div>
    </LayoutGroup>
  );
}
