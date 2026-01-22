"use client";

import { useState, useCallback } from "react";
import {
  IconChevronRight,
  IconChevronDown,
  IconFile,
  IconFileTypeCss,
  IconFileTypeTs,
  IconFileTypeJsx,
  IconFileTypeHtml,
  IconJson,
  IconFolder,
  IconFolderOpen,
  IconPlus,
  IconTrash,
  IconEdit,
  IconRefresh,
  IconSettings,
  IconLoader2,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FileEntry } from "../hooks/use-file-system";

// Get file icon based on extension
function getFileIcon(fileName: string) {
  if (fileName.endsWith(".tsx") || fileName.endsWith(".ts")) {
    return IconFileTypeTs;
  }
  if (fileName.endsWith(".jsx") || fileName.endsWith(".js")) {
    return IconFileTypeJsx;
  }
  if (fileName.endsWith(".css") || fileName.endsWith(".scss")) {
    return IconFileTypeCss;
  }
  if (fileName.endsWith(".html")) {
    return IconFileTypeHtml;
  }
  if (fileName.endsWith(".json")) {
    return IconJson;
  }
  return IconFile;
}

interface FileTreeItemProps {
  entry: FileEntry;
  depth: number;
  selectedPath: string | null;
  onSelect: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  onToggleDirectory: (path: string) => void;
}

function FileTreeItem({
  entry,
  depth,
  selectedPath,
  onSelect,
  onDelete,
  onRename,
  onToggleDirectory,
}: FileTreeItemProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(entry.name);

  const isSelected = entry.path === selectedPath;
  const isExpanded = entry.isExpanded ?? false;
  const isLoading = entry.isDirectory && isExpanded && !entry.children;

  const FileIcon = entry.isDirectory
    ? isExpanded
      ? IconFolderOpen
      : IconFolder
    : getFileIcon(entry.name);

  const handleClick = () => {
    if (entry.isDirectory) {
      onToggleDirectory(entry.path);
    } else {
      onSelect(entry.path);
    }
  };

  const handleRename = () => {
    if (newName && newName !== entry.name) {
      onRename(entry.path, newName);
    }
    setIsRenaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleRename();
    } else if (e.key === "Escape") {
      setNewName(entry.name);
      setIsRenaming(false);
    }
  };

  return (
    <div>
      <div
        className={cn(
          "group flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 text-sm transition-colors hover:bg-muted/50",
          isSelected && "bg-muted"
        )}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {entry.isDirectory && (
          <span className="flex h-4 w-4 items-center justify-center">
            {isLoading ? (
              <IconLoader2 size={12} className="animate-spin" />
            ) : isExpanded ? (
              <IconChevronDown size={14} />
            ) : (
              <IconChevronRight size={14} />
            )}
          </span>
        )}
        {!entry.isDirectory && <span className="w-4" />}

        <FileIcon
          size={16}
          className={cn(
            "shrink-0",
            entry.isDirectory
              ? "text-blue-500"
              : entry.name.endsWith(".css")
                ? "text-purple-500"
                : entry.name.endsWith(".json")
                  ? "text-yellow-500"
                  : "text-green-500"
          )}
        />

        {isRenaming ? (
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={handleKeyDown}
            className="h-5 px-1 py-0 text-sm"
            autoFocus
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="flex-1 truncate">{entry.name}</span>
        )}

        {entry.isFromRegistry && (
          <span className="rounded bg-primary/10 px-1 text-xs text-primary">
            registry
          </span>
        )}

        {!isRenaming && (
          <DropdownMenu>
            <DropdownMenuTrigger
              onClick={(e) => e.stopPropagation()}
              className="flex h-5 w-5 items-center justify-center rounded opacity-0 transition-opacity hover:bg-muted group-hover:opacity-100"
            >
              <IconEdit size={12} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  setIsRenaming(true);
                }}
              >
                <IconEdit size={14} className="mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entry.path);
                }}
                className="text-destructive"
              >
                <IconTrash size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {entry.isDirectory && isExpanded && entry.children && (
        <div>
          {entry.children.map((child) => (
            <FileTreeItem
              key={child.path}
              entry={child}
              depth={depth + 1}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onToggleDirectory={onToggleDirectory}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export interface SandboxFileExplorerProps {
  files: FileEntry[];
  selectedPath: string | null;
  isLoading: boolean;
  advancedView: boolean;
  onSelect: (path: string) => void;
  onCreateFile: (path: string) => void;
  onCreateDirectory: (path: string) => void;
  onDelete: (path: string) => void;
  onRename: (path: string, newName: string) => void;
  onRefresh: () => void;
  onToggleAdvanced: () => void;
  onToggleDirectory: (path: string) => void;
}

export function SandboxFileExplorer({
  files,
  selectedPath,
  isLoading,
  advancedView,
  onSelect,
  onCreateFile,
  onCreateDirectory,
  onDelete,
  onRename,
  onRefresh,
  onToggleAdvanced,
  onToggleDirectory,
}: SandboxFileExplorerProps) {
  const [isAddingFile, setIsAddingFile] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");

  const handleAddFile = useCallback(() => {
    if (newFilePath.trim()) {
      // Prepend /project if not already there
      let path = newFilePath.trim();
      if (!path.startsWith("/project")) {
        path = `/project/${path}`;
      }
      onCreateFile(path);
      setNewFilePath("");
      setIsAddingFile(false);
    }
  }, [newFilePath, onCreateFile]);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Files
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={onRefresh}
            title="Refresh"
          >
            <IconRefresh size={14} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn("h-6 w-6", advancedView && "bg-muted")}
            onClick={onToggleAdvanced}
            title="Advanced view (show hidden files)"
          >
            <IconSettings size={14} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted">
              <IconPlus size={14} />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={() => setIsAddingFile(true)}>
                New File
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  const name = prompt("Directory name:");
                  if (name) onCreateDirectory(`/project/${name}`);
                }}
              >
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Add file input */}
      {isAddingFile && (
        <div className="border-b px-2 py-2">
          <Input
            value={newFilePath}
            onChange={(e) => setNewFilePath(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddFile();
              if (e.key === "Escape") {
                setIsAddingFile(false);
                setNewFilePath("");
              }
            }}
            placeholder="path/to/file.tsx"
            className="h-7 text-xs"
            autoFocus
          />
          <div className="mt-1 flex gap-1">
            <Button
              size="sm"
              className="h-6 flex-1 text-xs"
              onClick={handleAddFile}
            >
              Add
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 text-xs"
              onClick={() => {
                setIsAddingFile(false);
                setNewFilePath("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* File tree */}
      <div className="flex-1 overflow-auto py-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : files.length === 0 ? (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No files found
          </div>
        ) : (
          files.map((entry) => (
            <FileTreeItem
              key={entry.path}
              entry={entry}
              depth={0}
              selectedPath={selectedPath}
              onSelect={onSelect}
              onDelete={onDelete}
              onRename={onRename}
              onToggleDirectory={onToggleDirectory}
            />
          ))
        )}
      </div>
    </div>
  );
}
