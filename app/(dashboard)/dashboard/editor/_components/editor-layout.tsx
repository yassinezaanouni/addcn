"use client";

import { useState, useCallback } from "react";
import { Toolbar } from "./toolbar";
import { FileTree } from "./file-tree";
import { MonacoEditor } from "./monaco-editor";
import { PreviewPanel } from "./preview-panel";
import { ComponentMetaForm } from "./component-meta-form";
import { DependencyManager } from "./dependency-manager";

export function EditorLayout() {
  const [previewVisible, setPreviewVisible] = useState(true);

  const handleTogglePreview = useCallback(() => {
    setPreviewVisible((prev) => !prev);
  }, []);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] flex-col">
      <Toolbar previewVisible={previewVisible} onTogglePreview={handleTogglePreview} />

      <div className="flex flex-1 overflow-hidden">
        {/* File Tree */}
        <div className="w-48 shrink-0 border-r">
          <FileTree />
        </div>

        {/* Editor + Preview */}
        <div className="flex flex-1 overflow-hidden">
          {/* Monaco Editor */}
          <div className={previewVisible ? "w-[55%]" : "flex-1"}>
            <MonacoEditor />
          </div>

          {/* Preview Panel */}
          {previewVisible && (
            <div className="w-[45%] border-l">
              <PreviewPanel />
            </div>
          )}
        </div>

        {/* Right Sidebar - Meta + Dependencies */}
        <div className="w-72 shrink-0 overflow-auto border-l">
          <div className="border-b">
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">
                Component Info
              </span>
            </div>
            <ComponentMetaForm />
          </div>
          <div>
            <div className="px-4 py-2">
              <span className="text-xs font-medium text-muted-foreground">
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
