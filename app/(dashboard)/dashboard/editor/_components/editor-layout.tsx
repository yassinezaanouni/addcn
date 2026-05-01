"use client";

import { LayoutGroup } from "motion/react";
import { cn } from "@/lib/utils";
import { Toolbar } from "./toolbar";
import { FileTree } from "./file-tree";
import { MonacoEditor } from "./monaco-editor";
import { SnippetMetaForm } from "./snippet-meta-form";
import { DependencyManager } from "./dependency-manager";
import { PreviewMediaSection } from "./preview-media-section";
import { TagInput } from "./tag-input";

// Shared panel styles
const PANEL_BASE =
  "overflow-hidden rounded-xl border border-border/50 shadow-lg shadow-black/5";
const PANEL_BG = "bg-card/80 backdrop-blur-sm dark:bg-card/60";
const PANEL_SOLID = "bg-card shadow-xl dark:shadow-black/20";

export function EditorLayout() {
  return (
    <LayoutGroup>
      <div className="@container relative flex h-full flex-col bg-linear-to-br from-background via-background to-muted/30">
        <Toolbar />

        {/* Main content area with container queries (mobile-first) */}
        <div className="flex h-full flex-1 flex-col gap-2 @4xl:flex-row">
          {/* File Tree */}
          <div
            className={cn(
              PANEL_BASE,
              PANEL_BG,
              "h-[min(100%,20rem)] shrink-0 @4xl:h-full",
            )}
          >
            <FileTree />
          </div>

          {/* Monaco Editor */}
          <div className={cn(PANEL_BASE, PANEL_SOLID, "min-h-32 flex-1")}>
            <MonacoEditor />
          </div>

          {/* Right Sidebar */}
          <div className="flex shrink-0 flex-col gap-3 overflow-y-auto @4xl:w-[min(100%,20rem)]">
            {/* Snippet Info Section */}
            <div className={cn(PANEL_BASE, PANEL_BG)}>
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Snippet
                </span>
              </div>
              <SnippetMetaForm />
            </div>

            {/* Tags Section */}
            <div className={cn(PANEL_BASE, PANEL_BG)}>
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tags
                </span>
              </div>
              <div className="px-4 pb-4">
                <TagInput />
              </div>
            </div>

            {/* Preview Media Section */}
            <div className={cn(PANEL_BASE, PANEL_BG)}>
              <div className="flex items-center justify-between gap-2 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Preview
                  </span>
                </div>
                <span className="rounded-full border border-border/50 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Optional
                </span>
              </div>
              <PreviewMediaSection />
            </div>

            {/* Dependencies Section */}
            <div className={cn(PANEL_BASE, PANEL_BG, "flex-1")}>
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="h-1.5 w-1.5 rounded-full bg-chart-2" />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Dependencies
                </span>
              </div>
              <DependencyManager />
            </div>
          </div>
        </div>
      </div>
    </LayoutGroup>
  );
}
