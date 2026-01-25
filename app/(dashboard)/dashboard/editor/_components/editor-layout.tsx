"use client";

import { cn } from "@/lib/utils";
import { Toolbar } from "./toolbar";
import { FileTree } from "./file-tree";
import { MonacoEditor } from "./monaco-editor";
import { PreviewPanel } from "./preview-panel";
import { ComponentMetaForm } from "./component-meta-form";
import { DependencyManager } from "./dependency-manager";

// Shared panel styles
const PANEL_BASE = "overflow-hidden rounded-xl border border-border/50 shadow-lg shadow-black/5";
const PANEL_BG = "bg-card/80 backdrop-blur-sm dark:bg-card/60";
const PANEL_SOLID = "bg-card shadow-xl dark:shadow-black/20";

export function EditorLayout() {
  return (
    <div className="@container relative flex h-full flex-col bg-linear-to-br from-background via-background to-muted/30">
     

      <Toolbar />

      {/* Main content area with container queries (mobile-first) */}
      <div className="flex flex-1 flex-col gap-2 h-full @4xl:flex-row">
        {/* File Tree */}
        <div className={cn(PANEL_BASE, PANEL_BG, "h-[min(100%,20rem)]  @4xl:h-full shrink-0")}>
          <FileTree />
        </div>

        {/* Editor + Preview wrapper - they wrap together */}
        <div className="flex flex-1 flex-col gap-2 @6xl:flex-row">
          {/* Monaco Editor */}
          <div className={cn(PANEL_BASE, PANEL_SOLID, "min-h-32 flex-1")}>
            <MonacoEditor />
          </div>

          {/* Preview Panel */}
          <div className={cn(PANEL_BASE, PANEL_SOLID, "min-h-32 flex-1")}>
            <PreviewPanel />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="flex @4xl:w-[min(100%,20rem)] shrink-0 flex-col gap-3">
          {/* Component Info Section */}
          <div className={cn(PANEL_BASE, PANEL_BG)}>
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Component
              </span>
            </div>
            <ComponentMetaForm />
          </div>

          {/* Dependencies Section */}
          <div className={cn(PANEL_BASE, PANEL_BG, "flex-1 overflow-auto")}>
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
  );
}
