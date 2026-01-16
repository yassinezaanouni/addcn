"use client";

import type { SavedComponent } from "@/types/component";
import { ComponentCard, ComponentCardSkeleton } from "./component-card";
import { EmptyState } from "./empty-state";

interface ComponentGridProps {
  components: SavedComponent[] | undefined;
}

export function ComponentGrid({ components }: ComponentGridProps) {
  if (components === undefined) {
    return <ComponentGridSkeleton />;
  }

  if (components.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {components.map((component) => (
        <ComponentCard key={component.id} component={component} />
      ))}
    </div>
  );
}

export function ComponentGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <ComponentCardSkeleton key={i} />
      ))}
    </div>
  );
}
