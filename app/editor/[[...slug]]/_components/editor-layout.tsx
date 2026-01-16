"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuid } from "uuid";
import { IconX } from "@tabler/icons-react";
import { Toolbar } from "./toolbar";
import { FileTree } from "./file-tree";
import { MonacoEditor } from "./monaco-editor";
import { PreviewPanel } from "./preview-panel";
import { ComponentMetaForm } from "./component-meta-form";
import { DependencyManager } from "./dependency-manager";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useEditorStore } from "@/stores/editor-store";
import { useComponentsStore } from "@/stores/components-store";
import { useUIStore } from "@/stores/ui-store";
import type { SavedComponent } from "@/types/component";

export function EditorLayout() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const previewVisible = useUIStore((state) => state.previewVisible);

  const {
    componentId,
    name,
    title,
    description,
    files,
    dependencies,
    registryDependencies,
    setMetadata,
  } = useEditorStore();

  const { addComponent, updateComponent } = useComponentsStore();

  const handleSave = useCallback(async () => {
    setError(null);

    if (!name.trim()) {
      setError("Please enter a component name");
      return;
    }
    if (!title.trim()) {
      setError("Please enter a component title");
      return;
    }

    setIsSaving(true);

    try {
      const now = new Date().toISOString();

      if (componentId) {
        // Update existing component
        const updated: Partial<SavedComponent> = {
          name,
          title,
          description,
          files,
          dependencies,
          registryDependencies,
          updatedAt: now,
        };
        updateComponent(componentId, updated);

        // Sync to API
        await fetch("/api/registry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: componentId, ...updated }),
        });
      } else {
        // Create new component
        const newComponent: SavedComponent = {
          id: uuid(),
          name,
          title,
          description,
          files,
          dependencies,
          registryDependencies,
          createdAt: now,
          updatedAt: now,
        };
        addComponent(newComponent);

        // Sync to API
        await fetch("/api/registry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newComponent),
        });

        // Update editor state with the new ID
        setMetadata({ componentId: newComponent.id } as never);
      }

      setMetadata({ isDirty: false } as never);
      router.push("/");
    } catch (err) {
      console.error("Failed to save:", err);
      setError("Failed to save component. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }, [
    componentId,
    name,
    title,
    description,
    files,
    dependencies,
    registryDependencies,
    addComponent,
    updateComponent,
    setMetadata,
    router,
  ]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      {error && (
        <div className="flex items-center justify-between gap-2 border-b border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400">
          <span>{error}</span>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setError(null)}
            className="text-red-600 hover:text-red-700 dark:text-red-400"
          >
            <IconX className="size-4" />
          </Button>
        </div>
      )}
      <Toolbar onSave={handleSave} isSaving={isSaving} />

      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar - File tree */}
        <div className="w-48 shrink-0">
          <FileTree />
        </div>

        {/* Main editor area */}
        <div className="flex flex-1 overflow-hidden">
          {/* Code editor */}
          <div className="flex-1 overflow-hidden">
            <MonacoEditor onSave={handleSave} />
          </div>

          {/* Preview panel */}
          {previewVisible && (
            <div className="w-[45%] shrink-0 border-l border-border p-4">
              <PreviewPanel />
            </div>
          )}
        </div>

        {/* Right sidebar - Meta & Dependencies */}
        <div className="w-72 shrink-0 border-l border-border">
          <ScrollArea className="h-full">
            <ComponentMetaForm />
            <DependencyManager />
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
