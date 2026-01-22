"use client";

import { useCallback, useMemo, useEffect, useRef } from "react";
import Editor, { type OnMount, type Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import type { editor } from "monaco-editor";

// Get Monaco language from file extension
function getLanguageFromPath(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase() ?? "";
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    css: "css",
    html: "html",
    md: "markdown",
    yaml: "yaml",
    yml: "yaml",
  };
  return languageMap[ext] ?? "plaintext";
}

export interface EditorPaneProps {
  filePath: string | null;
  content: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  readOnly?: boolean;
  isLoading?: boolean;
}

export function EditorPane({
  filePath,
  content,
  onChange,
  onSave,
  readOnly = false,
  isLoading = false,
}: EditorPaneProps) {
  const { resolvedTheme } = useTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  // Get language based on file path
  const language = useMemo(() => {
    return filePath ? getLanguageFromPath(filePath) : "plaintext";
  }, [filePath]);

  // Editor theme based on app theme
  const editorTheme = resolvedTheme === "dark" ? "vs-dark" : "light";

  // Configure Monaco on mount
  const handleEditorMount: OnMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Configure TypeScript/JavaScript
      monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
        target: monaco.languages.typescript.ScriptTarget.ESNext,
        module: monaco.languages.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
        jsx: monaco.languages.typescript.JsxEmit.React,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        noEmit: true,
        lib: ["dom", "dom.iterable", "esnext"],
      });

      // Add keyboard shortcut for save
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
        onSave?.();
      });

      // Focus editor
      editor.focus();
    },
    [onSave]
  );

  // Handle content changes
  const handleChange = useCallback(
    (value: string | undefined) => {
      if (value !== undefined) {
        onChange(value);
      }
    },
    [onChange]
  );

  // Update editor content when file changes
  useEffect(() => {
    if (editorRef.current && content !== editorRef.current.getValue()) {
      editorRef.current.setValue(content);
    }
  }, [content]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading file...</span>
        </div>
      </div>
    );
  }

  // No file selected
  if (!filePath) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/30">
        <span className="text-sm text-muted-foreground">
          Select a file to edit
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {/* File path header */}
      <div className="flex h-9 items-center gap-2 border-b bg-muted/30 px-3">
        <span className="text-xs text-muted-foreground">{filePath}</span>
        {readOnly && (
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            Read Only
          </span>
        )}
      </div>

      {/* Monaco Editor */}
      <div className="relative flex-1 overflow-hidden">
        <Editor
          height="100%"
          language={language}
          value={content}
          theme={editorTheme}
          onChange={handleChange}
          onMount={handleEditorMount}
          options={{
            readOnly,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: "on",
            wordWrap: "on",
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            formatOnPaste: true,
            formatOnType: true,
            padding: { top: 8 },
          }}
          loading={
            <div className="flex h-full items-center justify-center">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          }
        />
      </div>
    </div>
  );
}
