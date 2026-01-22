"use client";

import { useState } from "react";
import { useEditorStore, buildFolderTree, type FolderNode } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  IconChevronDown,
  IconChevronRight,
  IconEye,
  IconFile,
  IconFileTypeCss,
  IconFileTypeTs,
  IconFolder,
  IconPlus,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const PATH_PRESETS = [
  { label: "components/ui", path: "components/ui/" },
  { label: "hooks", path: "hooks/" },
  { label: "lib", path: "lib/" },
  { label: "app", path: "app/" },
];

function getFileIcon(path: string) {
  if (path.endsWith(".css")) return <IconFileTypeCss className="size-4" />;
  if (path.endsWith(".ts") || path.endsWith(".tsx"))
    return <IconFileTypeTs className="size-4" />;
  return <IconFile className="size-4" />;
}

interface FileNodeProps {
  node: FolderNode;
  depth: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  activeFileId: string | null;
  previewFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onSetPreviewFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newPath: string) => void;
  onDeleteFile: (fileId: string) => void;
  canDelete: boolean;
}

function FileNode({
  node,
  depth,
  expandedFolders,
  onToggleFolder,
  activeFileId,
  previewFileId,
  onSelectFile,
  onSetPreviewFile,
  onRenameFile,
  onDeleteFile,
  canDelete,
}: FileNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPath, setEditPath] = useState(node.path);

  const isFolder = !node.file;
  const isExpanded = expandedFolders.has(node.path);
  const isActive = node.file?.id === activeFileId;
  const isPreview = node.file?.id === previewFileId;
  const canPreview = node.file?.path.endsWith(".tsx");

  const handleSaveRename = () => {
    if (node.file && editPath.trim() && editPath !== node.path) {
      onRenameFile(node.file.id, editPath.trim());
    }
    setIsEditing(false);
  };

  if (isEditing && node.file) {
    return (
      <div className="flex items-center gap-1 py-1" style={{ paddingLeft: depth * 12 }}>
        <Input
          value={editPath}
          onChange={(e) => setEditPath(e.target.value)}
          onBlur={handleSaveRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSaveRename();
            if (e.key === "Escape") {
              setEditPath(node.path);
              setIsEditing(false);
            }
          }}
          className="h-6 text-xs"
          autoFocus
        />
      </div>
    );
  }

  return (
    <>
      <div
        className={cn(
          "group flex items-center gap-1 rounded-sm py-1 pr-1 text-sm hover:bg-muted/50",
          isActive && "bg-muted"
        )}
        style={{ paddingLeft: depth * 12 }}
      >
        {isFolder ? (
          <button
            onClick={() => onToggleFolder(node.path)}
            className="flex flex-1 items-center gap-1"
          >
            {isExpanded ? (
              <IconChevronDown className="size-4" />
            ) : (
              <IconChevronRight className="size-4" />
            )}
            <IconFolder className="size-4 text-muted-foreground" />
            <span className="truncate">{node.name}</span>
          </button>
        ) : (
          <button
            onClick={() => node.file && onSelectFile(node.file.id)}
            className="flex flex-1 items-center gap-1 pl-5"
          >
            {getFileIcon(node.path)}
            <span className="truncate">{node.name}</span>
            {isPreview && (
              <IconEye className="size-3 text-primary" />
            )}
          </button>
        )}

        {node.file && (
          <div className="hidden items-center gap-0.5 group-hover:flex">
            {canPreview && !isPreview && (
              <Button
                variant="ghost"
                size="icon-xs"
                title="Set as preview"
                onClick={(e) => {
                  e.stopPropagation();
                  onSetPreviewFile(node.file!.id);
                }}
              >
                <IconEye className="size-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                setEditPath(node.path);
                setIsEditing(true);
              }}
            >
              <IconPencil className="size-3" />
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFile(node.file!.id);
                }}
              >
                <IconTrash className="size-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {isFolder && isExpanded && (
        <>
          {node.children.map((child) => (
            <FileNode
              key={child.path}
              node={child}
              depth={depth + 1}
              expandedFolders={expandedFolders}
              onToggleFolder={onToggleFolder}
              activeFileId={activeFileId}
              previewFileId={previewFileId}
              onSelectFile={onSelectFile}
              onSetPreviewFile={onSetPreviewFile}
              onRenameFile={onRenameFile}
              onDeleteFile={onDeleteFile}
              canDelete={canDelete}
            />
          ))}
        </>
      )}
    </>
  );
}

export function FileTree() {
  const { files, activeFileId, previewFileId, setActiveFile, setPreviewFile, addFile, removeFile, renamePath } =
    useEditorStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["components", "components/ui"])
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");

  const tree = buildFolderTree(files);
  const canDelete = files.length > 1;

  const toggleFolder = (path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleAddFile = () => {
    if (newFilePath.trim()) {
      // Ensure it has an extension
      let path = newFilePath.trim();
      if (!path.includes(".")) {
        path += ".tsx";
      }
      addFile(path);
      setNewFilePath("");
      setIsAdding(false);

      // Expand parent folders
      const parts = path.split("/");
      const newExpanded = new Set(expandedFolders);
      for (let i = 1; i < parts.length; i++) {
        newExpanded.add(parts.slice(0, i).join("/"));
      }
      setExpandedFolders(newExpanded);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b px-2 py-1.5">
        <span className="text-xs font-medium text-muted-foreground">Files</span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => setIsAdding(true)}
        >
          <IconPlus className="size-3.5" />
        </Button>
      </div>

      <div className="flex-1 overflow-auto p-2">
        {tree.map((node) => (
          <FileNode
            key={node.path}
            node={node}
            depth={0}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            activeFileId={activeFileId}
            previewFileId={previewFileId}
            onSelectFile={setActiveFile}
            onSetPreviewFile={setPreviewFile}
            onRenameFile={renamePath}
            onDeleteFile={removeFile}
            canDelete={canDelete}
          />
        ))}

        {isAdding && (
          <div className="mt-2 space-y-2">
            <div className="flex flex-wrap gap-1">
              {PATH_PRESETS.map((preset) => (
                <Button
                  key={preset.path}
                  variant="outline"
                  size="xs"
                  onClick={() => setNewFilePath(preset.path)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <Input
              value={newFilePath}
              onChange={(e) => setNewFilePath(e.target.value)}
              placeholder="path/to/file.tsx"
              className="h-7 text-xs"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddFile();
                if (e.key === "Escape") {
                  setNewFilePath("");
                  setIsAdding(false);
                }
              }}
            />
            <div className="flex gap-1">
              <Button size="xs" onClick={handleAddFile}>
                Add
              </Button>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  setNewFilePath("");
                  setIsAdding(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
