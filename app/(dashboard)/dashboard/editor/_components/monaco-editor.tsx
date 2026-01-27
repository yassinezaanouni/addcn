"use client";

import { useRef, useCallback, useEffect } from "react";
import Editor, { OnMount, BeforeMount, Monaco } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import { useEditorStore } from "@/stores/editor-store";

type MonacoEditor = Parameters<OnMount>[0];

interface MonacoEditorProps {
  onSave?: () => void;
}

// Theme colors matching app's oklch values (converted to hex)
const colors = {
  light: {
    background: "#f7faf9",
    foreground: "#1a2420",
    card: "#fcfefd",
    primary: "#0d9488",
    muted: "#e8f0ed",
    mutedForeground: "#5c706a",
    border: "#d4e0dc",
  },
  dark: {
    background: "#111715",
    foreground: "#e9f0ed",
    card: "#1a2220",
    primary: "#34d399",
    muted: "#232d2a",
    mutedForeground: "#9aaca5",
    border: "#2a3532",
  },
};

// Define custom themes
const defineCustomThemes = (monaco: Monaco) => {
  // Light theme
  monaco.editor.defineTheme("app-light", {
    base: "vs",
    inherit: true,
    rules: [
      { token: "comment", foreground: colors.light.mutedForeground.slice(1), fontStyle: "italic" },
      { token: "keyword", foreground: colors.light.primary.slice(1) },
      { token: "string", foreground: "b45309" },
      { token: "number", foreground: "be185d" },
      { token: "type", foreground: "1d4ed8" },
      { token: "class", foreground: "1d4ed8" },
      { token: "function", foreground: "7c3aed" },
      { token: "variable", foreground: colors.light.foreground.slice(1) },
      { token: "constant", foreground: "be185d" },
      { token: "parameter", foreground: "c2410c" },
      { token: "tag", foreground: colors.light.primary.slice(1) },
      { token: "attribute.name", foreground: "1d4ed8" },
      { token: "attribute.value", foreground: "b45309" },
      { token: "delimiter.bracket", foreground: colors.light.mutedForeground.slice(1) },
    ],
    colors: {
      "editor.background": colors.light.background,
      "editor.foreground": colors.light.foreground,
      "editor.lineHighlightBackground": colors.light.muted,
      "editor.selectionBackground": colors.light.primary + "30",
      "editor.inactiveSelectionBackground": colors.light.primary + "15",
      "editorLineNumber.foreground": colors.light.mutedForeground,
      "editorLineNumber.activeForeground": colors.light.foreground,
      "editorCursor.foreground": colors.light.primary,
      "editor.wordHighlightBackground": colors.light.primary + "20",
      "editorBracketMatch.background": colors.light.primary + "25",
      "editorBracketMatch.border": colors.light.primary + "50",
      "editorIndentGuide.background": colors.light.border,
      "editorIndentGuide.activeBackground": colors.light.mutedForeground,
      "scrollbarSlider.background": colors.light.primary + "20",
      "scrollbarSlider.hoverBackground": colors.light.primary + "35",
      "scrollbarSlider.activeBackground": colors.light.primary + "50",
      "editorWidget.background": colors.light.card,
      "editorWidget.border": colors.light.border,
    },
  });

  // Dark theme
  monaco.editor.defineTheme("app-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: colors.dark.mutedForeground.slice(1), fontStyle: "italic" },
      { token: "keyword", foreground: colors.dark.primary.slice(1) },
      { token: "string", foreground: "fbbf24" },
      { token: "number", foreground: "f472b6" },
      { token: "type", foreground: "60a5fa" },
      { token: "class", foreground: "60a5fa" },
      { token: "function", foreground: "a78bfa" },
      { token: "variable", foreground: colors.dark.foreground.slice(1) },
      { token: "constant", foreground: "f472b6" },
      { token: "parameter", foreground: "fb923c" },
      { token: "tag", foreground: colors.dark.primary.slice(1) },
      { token: "attribute.name", foreground: "60a5fa" },
      { token: "attribute.value", foreground: "fbbf24" },
      { token: "delimiter.bracket", foreground: colors.dark.mutedForeground.slice(1) },
    ],
    colors: {
      "editor.background": colors.dark.background,
      "editor.foreground": colors.dark.foreground,
      "editor.lineHighlightBackground": colors.dark.card,
      "editor.selectionBackground": colors.dark.primary + "40",
      "editor.inactiveSelectionBackground": colors.dark.primary + "20",
      "editorLineNumber.foreground": colors.dark.mutedForeground,
      "editorLineNumber.activeForeground": colors.dark.foreground,
      "editorCursor.foreground": colors.dark.primary,
      "editor.wordHighlightBackground": colors.dark.primary + "30",
      "editorBracketMatch.background": colors.dark.primary + "30",
      "editorBracketMatch.border": colors.dark.primary + "50",
      "editorIndentGuide.background": colors.dark.border,
      "editorIndentGuide.activeBackground": colors.dark.mutedForeground,
      "scrollbarSlider.background": colors.dark.primary + "20",
      "scrollbarSlider.hoverBackground": colors.dark.primary + "40",
      "scrollbarSlider.activeBackground": colors.dark.primary + "60",
      "editorWidget.background": colors.dark.card,
      "editorWidget.border": colors.dark.border,
    },
  });
};

export function MonacoEditor({ onSave }: MonacoEditorProps) {
  const editorRef = useRef<MonacoEditor | null>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const { files, activeFileId, updateFileContent } = useEditorStore();
  const { resolvedTheme } = useTheme();

  const activeFile = files.find((f) => f.id === activeFileId);
  const themeName = resolvedTheme === "dark" ? "app-dark" : "app-light";

  // Get language from file extension
  const getLanguage = (path: string) => {
    if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
    if (path.endsWith(".css")) return "css";
    if (path.endsWith(".json")) return "json";
    return "typescript";
  };

  // Define themes before mount
  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoRef.current = monaco;
    defineCustomThemes(monaco);
  };

  // Switch theme when theme changes
  useEffect(() => {
    if (monacoRef.current) {
      monacoRef.current.editor.setTheme(themeName);
    }
  }, [themeName]);

  const handleEditorMount: OnMount = (editor, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

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
      theme={themeName}
      beforeMount={handleBeforeMount}
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
        fontFamily: "var(--font-geist-mono), monospace",
        fontLigatures: true,
        renderLineHighlight: "line",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
      }}
    />
  );
}
