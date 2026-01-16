"use client";

import { useComponentsStore } from "@/stores/components-store";
import { ComponentGrid } from "./_components/component-grid";

export default function Home() {
  const components = useComponentsStore((state) => state.components);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Components</h1>
        <p className="mt-2 text-muted-foreground">
          Build, edit, and export React components as shadcn registry-compatible
          JSON files
        </p>
      </div>
      <ComponentGrid components={components} />
    </main>
  );
}
