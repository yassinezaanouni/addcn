"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconLoader2,
  IconAlertCircle,
  IconExternalLink,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSandbox } from "./hooks/use-sandbox";
import { useFileSystem } from "./hooks/use-file-system";
import { SandboxFileExplorer } from "./components/file-explorer";
import { EditorPane } from "./components/editor-pane";

export interface SandboxEditorProps {
  sandboxId: string;
  sandboxName?: string;
}

export function SandboxEditor({ sandboxId, sandboxName }: SandboxEditorProps) {
  const router = useRouter();
  const hasLoadedFilesRef = useRef(false);

  // File system operations - declare first so we can use in sandbox callbacks
  const {
    files,
    isTreeLoading,
    isFileLoading,
    advancedView,
    setAdvancedView,
    loadRootDirectory,
    loadFileContent,
    saveFileContent,
    createFile,
    createDirectory,
    deleteEntry,
    renameEntry,
    toggleDirectory,
  } = useFileSystem({ sandboxId });

  // Sandbox connection
  const {
    embedURL,
    previewURL,
    isSandboxLoading,
    reconnectSandbox,
    error: sandboxError,
  } = useSandbox({
    sandboxId,
  });

  // Load files when sandbox is ready
  useEffect(() => {
    if (!isSandboxLoading && !sandboxError && !hasLoadedFilesRef.current) {
      hasLoadedFilesRef.current = true;
      toast.success("Sandbox ready!");
      loadRootDirectory();
    }
  }, [isSandboxLoading, sandboxError, loadRootDirectory]);

  // Reset when sandboxId changes
  useEffect(() => {
    hasLoadedFilesRef.current = false;
  }, [sandboxId]);

  // Editor state
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load file content when selection changes
  const handleFileSelect = useCallback(
    async (path: string) => {
      if (isDirty && selectedFilePath) {
        await saveFileContent(selectedFilePath, fileContent);
      }

      setSelectedFilePath(path);
      setIsDirty(false);

      try {
        const content = await loadFileContent(path);
        setFileContent(content);
      } catch {
        toast.error("Failed to load file");
      }
    },
    [isDirty, selectedFilePath, fileContent, saveFileContent, loadFileContent]
  );

  // Handle content changes
  const handleContentChange = useCallback((value: string) => {
    setFileContent(value);
    setIsDirty(true);
  }, []);

  // Save current file
  const handleSave = useCallback(async () => {
    if (!selectedFilePath || !isDirty) return;

    setIsSaving(true);
    try {
      await saveFileContent(selectedFilePath, fileContent);
      setIsDirty(false);
      toast.success("File saved");
    } catch {
      toast.error("Failed to save file");
    } finally {
      setIsSaving(false);
    }
  }, [selectedFilePath, isDirty, fileContent, saveFileContent]);

  // Handle file operations
  const handleCreateFile = useCallback(
    async (path: string) => {
      await createFile(path);
      setSelectedFilePath(path);
      setFileContent("// TODO: Add code\n");
      setIsDirty(false);
    },
    [createFile]
  );

  const handleDeleteFile = useCallback(
    async (path: string) => {
      if (confirm(`Delete ${path}?`)) {
        await deleteEntry(path);
        if (selectedFilePath === path) {
          setSelectedFilePath(null);
          setFileContent("");
          setIsDirty(false);
        }
      }
    },
    [deleteEntry, selectedFilePath]
  );

  const handleRenameFile = useCallback(
    async (path: string, newName: string) => {
      await renameEntry(path, newName);
    },
    [renameEntry]
  );

  // Open in CodeSandbox
  const handleOpenInCodeSandbox = useCallback(() => {
    if (embedURL) {
      window.open(embedURL, "_blank");
    }
  }, [embedURL]);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b bg-background px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard")}
          >
            <IconArrowLeft size={18} />
          </Button>

          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">
              {sandboxName ?? "Sandbox Editor"}
            </h1>
            {isDirty && (
              <Badge variant="secondary" className="text-xs">
                Unsaved
              </Badge>
            )}
            {isSandboxLoading && (
              <Badge variant="outline" className="text-xs">
                <IconLoader2 size={12} className="mr-1 animate-spin" />
                Connecting...
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {sandboxError && (
            <Badge variant="destructive" className="gap-1">
              <IconAlertCircle size={12} />
              Error
            </Badge>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleOpenInCodeSandbox}
            disabled={!embedURL}
            className="gap-2"
          >
            <IconExternalLink size={16} />
            Open in CodeSandbox
          </Button>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isSaving || isSandboxLoading}
            className="gap-2"
          >
            {isSaving ? (
              <IconLoader2 size={16} className="animate-spin" />
            ) : (
              <IconDeviceFloppy size={16} />
            )}
            Save
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="relative flex min-h-0 flex-1">
        {/* File Explorer - Fixed width */}
        <div className="relative z-10 h-full w-56 shrink-0 overflow-hidden border-r bg-muted/30">
          <SandboxFileExplorer
            files={files}
            selectedPath={selectedFilePath}
            isLoading={isTreeLoading || isSandboxLoading}
            advancedView={advancedView}
            onSelect={handleFileSelect}
            onCreateFile={handleCreateFile}
            onCreateDirectory={createDirectory}
            onDelete={handleDeleteFile}
            onRename={handleRenameFile}
            onRefresh={loadRootDirectory}
            onToggleAdvanced={() => setAdvancedView(!advancedView)}
            onToggleDirectory={toggleDirectory}
          />
        </div>

        {/* Code Editor */}
        <div className="h-full flex-1 overflow-hidden border-r">
          <EditorPane
            filePath={selectedFilePath}
            content={fileContent}
            onChange={handleContentChange}
            onSave={handleSave}
            isLoading={isFileLoading}
          />
        </div>

        {/* Preview - Embedded CodeSandbox iframe */}
        <div className="flex h-full flex-1 flex-col overflow-hidden">
          <div className="flex h-9 shrink-0 items-center justify-between border-b bg-muted/30 px-3">
            <span className="text-xs font-medium text-muted-foreground">
              Preview
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={reconnectSandbox}
              title="Reconnect"
            >
              <IconLoader2 size={14} className={cn(isSandboxLoading && "animate-spin")} />
            </Button>
          </div>

          <div className="flex-1 overflow-hidden">
            {isSandboxLoading ? (
              <div className="flex h-full items-center justify-center bg-muted/30">
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Starting sandbox...
                  </span>
                </div>
              </div>
            ) : sandboxError ? (
              <div className="flex h-full items-center justify-center p-6">
                <div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-center">
                  <IconAlertCircle className="mx-auto mb-2 h-8 w-8 text-destructive" />
                  <h3 className="font-semibold text-destructive">
                    Failed to connect
                  </h3>
                  <p className="mt-1 text-sm text-destructive/80">
                    {sandboxError.message}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={reconnectSandbox}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            ) : previewURL ? (
              <iframe
                src={previewURL}
                className="h-full w-full"
                title="Sandbox Preview"
                sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-muted/30">
                <span className="text-sm text-muted-foreground">
                  No preview available
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
