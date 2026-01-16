"use client";

import { useCallback, useEffect } from "react";
import Editor, { type OnMount } from "@monaco-editor/react";
import { useUIStore } from "@/stores/ui-store";
import { useEditorStore } from "@/stores/editor-store";

interface MonacoEditorProps {
  onSave?: () => void;
}

export function MonacoEditor({ onSave }: MonacoEditorProps) {
  const theme = useUIStore((state) => state.theme);
  const { files, activeFileId, updateFileContent } = useEditorStore();

  const activeFile = files.find((f) => f.id === activeFileId);

  const getMonacoTheme = () => {
    if (theme === "dark") return "vs-dark";
    if (theme === "light") return "light";
    if (typeof window !== "undefined") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "vs-dark"
        : "light";
    }
    return "light";
  };

  const getLanguage = (filename: string) => {
    if (filename.endsWith(".tsx") || filename.endsWith(".ts")) return "typescript";
    if (filename.endsWith(".css")) return "css";
    if (filename.endsWith(".json")) return "json";
    return "typescript";
  };

  const handleEditorMount: OnMount = (editor, monaco) => {
    // Configure TypeScript/React defaults
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.Latest,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: "React",
      allowJs: true,
      typeRoots: ["node_modules/@types"],
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });
  };

  const handleChange = useCallback(
    (value: string | undefined) => {
      if (activeFileId && value !== undefined) {
        updateFileContent(activeFileId, value);
      }
    },
    [activeFileId, updateFileContent]
  );

  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <p className="text-muted-foreground">No file selected</p>
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={getLanguage(activeFile.path)}
      value={activeFile.content}
      theme={getMonacoTheme()}
      onChange={handleChange}
      onMount={handleEditorMount}
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: "on",
        scrollBeyondLastLine: false,
        wordWrap: "on",
        automaticLayout: true,
        tabSize: 2,
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
}
