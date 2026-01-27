"use client";

import { useRef, useCallback } from "react";
import Editor, { OnMount, Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useEditorStore } from "@/stores/editor-store";

type MonacoEditor = Parameters<OnMount>[0];

interface MonacoEditorProps {
  onSave?: () => void;
}

export function MonacoEditor({ onSave }: MonacoEditorProps) {
  const editorRef = useRef<MonacoEditor | null>(null);

  const { files, activeFileId, updateFileContent } = useEditorStore();
  const { resolvedTheme } = useTheme();

  const activeFile = files.find((f) => f.id === activeFileId);

  // Monaco theme based on resolved theme (handles system preference)
  const monacoTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

  // Get language from file extension
  const getLanguage = (path: string) => {
    if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".json")) return "json";
    return "typescript";
  };

  const handleEditorMount: OnMount = (editor, monaco: Monaco) => {
    editorRef.current = editor;

    // Configure TypeScript
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

    // Add save keyboard shortcut
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
    [activeFileId, updateFileContent],
  );

  if (!activeFile) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Select a file to edit
      </div>
    );
  }

  return (
    <Editor
      height="100%"
      language={getLanguage(activeFile.path)}
      value={activeFile.content}
      theme={monacoTheme}
      onChange={handleChange}
      onMount={handleEditorMount}
      options={{
        fontSize: 14,
        tabSize: 2,
        minimap: { enabled: false },
        lineNumbers: "on",
        wordWrap: "on",
        automaticLayout: true,
        formatOnPaste: true,
        formatOnType: true,
        scrollBeyondLastLine: false,
        padding: { top: 16, bottom: 16 },
      }}
    />
  );
}
