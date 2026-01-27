"use client";

import { useEffect, use } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEditorStore } from "@/stores/editor-store";
import { EditorLayout } from "../_components/editor-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const PANEL_BASE = "overflow-hidden rounded-xl border border-border/50 shadow-lg shadow-black/5";
const PANEL_BG = "bg-card/80 backdrop-blur-sm dark:bg-card/60";
const PANEL_SOLID = "bg-card shadow-xl dark:shadow-black/20";

function EditorSkeleton() {
  return (
    <div className="@container relative flex h-full flex-col bg-linear-to-br from-background via-background to-muted/30">
      {/* Toolbar skeleton */}
      <div className="relative z-10 flex h-14 items-center justify-between">
        <div className="flex items-center gap-4">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col gap-2 h-full @4xl:flex-row">
        {/* File Tree skeleton */}
        <div className={cn(PANEL_BASE, PANEL_BG, "h-[min(100%,20rem)] @4xl:h-full shrink-0 w-48")}>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Files
              </span>
            </div>
            <Skeleton className="size-7 rounded-md" />
          </div>
          <div className="px-4 space-y-2">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-36 ml-4" />
            <Skeleton className="h-6 w-32 ml-4" />
            <Skeleton className="h-6 w-24" />
          </div>
        </div>

        {/* Editor + Preview wrapper */}
        <div className="flex flex-1 flex-col gap-2 @6xl:flex-row">
          {/* Monaco Editor skeleton */}
          <div className={cn(PANEL_BASE, PANEL_SOLID, "min-h-32 flex-1 p-4")}>
            <div className="space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-4/5" />
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-4 w-3/5" />
              <Skeleton className="h-4 w-2/5" />
            </div>
          </div>

          {/* Preview Panel skeleton */}
          <div className={cn(PANEL_BASE, PANEL_SOLID, "min-h-32 flex-1 flex items-center justify-center")}>
            <Skeleton className="size-16 rounded-xl" />
          </div>
        </div>

        {/* Right Sidebar skeleton */}
        <div className="flex shrink-0 flex-col gap-3 w-64">
          {/* Component Info Section */}
          <div className={cn(PANEL_BASE, PANEL_BG)}>
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="h-1.5 w-1.5 rounded-full bg-primary" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Component
              </span>
            </div>
            <div className="px-4 pb-4 space-y-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-8" />
                <Skeleton className="h-9 w-full rounded-md" />
              </div>
              <div className="space-y-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-20 w-full rounded-md" />
              </div>
            </div>
          </div>

          {/* Dependencies Section */}
          <div className={cn(PANEL_BASE, PANEL_BG, "flex-1")}>
            <div className="flex items-center gap-2 px-4 py-3">
              <div className="h-1.5 w-1.5 rounded-full bg-chart-2" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Dependencies
              </span>
            </div>
            <div className="px-4 pb-4 space-y-2">
              <Skeleton className="h-7 w-full rounded-md" />
              <Skeleton className="h-7 w-full rounded-md" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface EditComponentPageProps {
  params: Promise<{ id: string }>;
}

export default function EditComponentPage({ params }: EditComponentPageProps) {
  const { id } = use(params);
  const componentId = id as Id<"components">;

  const loadComponent = useEditorStore((state) => state.loadComponent);
  const convexId = useEditorStore((state) => state.convexId);

  const { data: component, isLoading } = useQuery(
    convexQuery(api.components.get, { id: componentId })
  );

  useEffect(() => {
    // Only load if we have component data and it's not already loaded
    if (component && convexId !== component._id) {
      loadComponent(component);
    }
  }, [component, convexId, loadComponent]);

  if (isLoading) {
    return <EditorSkeleton />;
  }

  if (!component) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Component not found</h1>
          <p className="mt-2 text-muted-foreground">
            The component you're looking for doesn't exist or you don't have access.
          </p>
        </div>
      </div>
    );
  }

  return <EditorLayout />;
}
