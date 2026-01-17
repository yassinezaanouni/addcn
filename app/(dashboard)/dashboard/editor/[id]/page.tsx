"use client";

import { useEffect, use } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useEditorStore } from "@/stores/editor-store";
import { EditorLayout } from "../_components/editor-layout";
import { Skeleton } from "@/components/ui/skeleton";

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
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div className="flex h-12 items-center justify-between border-b px-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex flex-1">
          <div className="w-48 border-r p-4">
            <Skeleton className="h-4 w-24 mb-4" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex-1 p-4">
            <Skeleton className="h-full" />
          </div>
        </div>
      </div>
    );
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
