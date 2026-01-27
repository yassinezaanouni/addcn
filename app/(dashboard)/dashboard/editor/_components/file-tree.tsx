"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  useEditorStore,
  buildFolderTree,
  type FolderNode,
} from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconChevronDown,
  IconChevronRight,
  IconEye,
  IconFile,
  IconFileTypeCss,
  IconFileTypeTs,
  IconFolder,
  IconFolderOpen,
  IconPencil,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const PATH_PRESETS = [
  { label: "components", path: "components/", color: "bg-blue-500" },
  { label: "hooks", path: "hooks/", color: "bg-purple-500" },
  { label: "lib", path: "lib/", color: "bg-emerald-500" },
  { label: "app", path: "app/", color: "bg-orange-500" },
];

function getFileIcon(path: string) {
  if (path.endsWith(".css"))
    return <IconFileTypeCss className="size-5 text-pink-500" />;
  if (path.endsWith(".ts") || path.endsWith(".tsx"))
    return <IconFileTypeTs className="size-5 text-blue-500" />;
  return <IconFile className="size-5 text-muted-foreground" />;
}

// Get the filename from a path
function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

// Get the parent directory from a path
function getParentPath(path: string): string {
  const parts = path.split("/");
  parts.pop();
  return parts.join("/");
}

interface DragState {
  draggedFileId: string | null;
  draggedFilePath: string | null;
  dropTarget: {
    type: "folder" | "before" | "after";
    path: string;
    fileId?: string;
  } | null;
}

interface FileNodeProps {
  node: FolderNode;
  depth: number;
  expandedFolders: Set<string>;
  onToggleFolder: (path: string) => void;
  onExpandFolder: (path: string) => void;
  activeFileId: string | null;
  previewFileId: string | null;
  onSelectFile: (fileId: string) => void;
  onSetPreviewFile: (fileId: string) => void;
  onRenameFile: (fileId: string, newPath: string) => void;
  onDeleteFile: (fileId: string) => void;
  canDelete: boolean;
  dragState: DragState;
  onDragStart: (fileId: string, filePath: string) => void;
  onDragEnd: () => void;
  onDragOverFolder: (folderPath: string) => void;
  onDragOverFile: (
    fileId: string,
    filePath: string,
    position: "before" | "after",
  ) => void;
  onDragLeave: () => void;
  onDrop: () => void;
}

function FileNode({
  node,
  depth,
  expandedFolders,
  onToggleFolder,
  onExpandFolder,
  activeFileId,
  previewFileId,
  onSelectFile,
  onSetPreviewFile,
  onRenameFile,
  onDeleteFile,
  canDelete,
  dragState,
  onDragStart,
  onDragEnd,
  onDragOverFolder,
  onDragOverFile,
  onDragLeave,
  onDrop,
}: FileNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editPath, setEditPath] = useState(node.path);
  const expandTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isFolder = !node.file;
  const isExpanded = expandedFolders.has(node.path);
  const isActive = node.file?.id === activeFileId;
  const isPreview = node.file?.id === previewFileId;
  const canPreview = node.file?.path.endsWith(".tsx");
  const isDragging = dragState.draggedFileId === node.file?.id;

  // Check if this node is a valid drop target
  const isDropTargetFolder =
    dragState.dropTarget?.type === "folder" &&
    dragState.dropTarget.path === node.path;
  const isDropTargetBefore =
    dragState.dropTarget?.type === "before" &&
    dragState.dropTarget.fileId === node.file?.id;
  const isDropTargetAfter =
    dragState.dropTarget?.type === "after" &&
    dragState.dropTarget.fileId === node.file?.id;

  const handleSaveRename = () => {
    if (node.file && editPath.trim() && editPath !== node.path) {
      onRenameFile(node.file.id, editPath.trim());
    }
    setIsEditing(false);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (!node.file) return;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", node.file.id);
    onDragStart(node.file.id, node.file.path);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!dragState.draggedFileId) return;

    // Don't allow dropping on self
    if (node.file?.id === dragState.draggedFileId) return;

    // Don't allow dropping a file into its current folder
    if (isFolder && dragState.draggedFilePath) {
      const currentParent = getParentPath(dragState.draggedFilePath);
      if (currentParent === node.path) return;
    }

    if (isFolder) {
      e.dataTransfer.dropEffect = "move";
      onDragOverFolder(node.path);

      // Auto-expand folder after hovering for 500ms
      if (!isExpanded && !expandTimeoutRef.current) {
        expandTimeoutRef.current = setTimeout(() => {
          onExpandFolder(node.path);
          expandTimeoutRef.current = null;
        }, 500);
      }
    } else if (node.file) {
      e.dataTransfer.dropEffect = "move";
      // Determine if dropping before or after based on mouse position
      const rect = e.currentTarget.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      const position = e.clientY < midY ? "before" : "after";
      onDragOverFile(node.file.id, node.file.path, position);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear auto-expand timeout
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }

    // Only clear if leaving to outside the tree
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!e.currentTarget.contains(relatedTarget)) {
      onDragLeave();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    // Clear auto-expand timeout
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }

    onDrop();
  };

  const handleDragEnd = () => {
    // Clear auto-expand timeout
    if (expandTimeoutRef.current) {
      clearTimeout(expandTimeoutRef.current);
      expandTimeoutRef.current = null;
    }
    onDragEnd();
  };

  if (isEditing && node.file) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center gap-1 py-1"
        style={{ paddingLeft: depth * 14 + 8 }}
      >
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
          className="h-7 font-mono text-xs"
          autoFocus
        />
      </motion.div>
    );
  }

  return (
    <>
      {/* Drop indicator before */}
      {isDropTargetBefore && (
        <div
          className="mx-2 h-0.5 rounded-full bg-primary"
          style={{ marginLeft: depth * 14 + 8 }}
        />
      )}

      <div
        draggable={!!node.file}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
      >
        <motion.div
          initial={false}
          animate={{
            backgroundColor: isActive ? "var(--muted)" : "transparent",
            opacity: isDragging ? 0.5 : 1,
          }}
          className={cn(
            "group relative flex items-center gap-1.5 rounded-lg py-1.5 pr-1 text-sm transition-colors",
            !isActive && "hover:bg-muted/50",
            isDropTargetFolder &&
              "bg-primary/20 ring-2 ring-primary ring-inset",
            node.file && "cursor-grab active:cursor-grabbing",
          )}
          style={{ paddingLeft: depth * 14 + 8 }}
        >
          {/* Active indicator */}
          {isActive && (
            <motion.div
              layoutId="active-file-indicator"
              className="absolute left-1 top-1/2 h-5 w-1 -translate-y-1/2 rounded-full bg-primary"
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            />
          )}

          {isFolder ? (
            <button
              onClick={() => onToggleFolder(node.path)}
              className="flex flex-1 items-center gap-2"
            >
              <span className="flex size-5 items-center justify-center">
                {isExpanded ? (
                  <IconChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <IconChevronRight className="size-4 text-muted-foreground" />
                )}
              </span>
              {isExpanded ? (
                <IconFolderOpen className="size-5 text-amber-500" />
              ) : (
                <IconFolder className="size-5 text-amber-500/70" />
              )}
              <span className="truncate font-medium text-foreground/80">
                {node.name}
              </span>
            </button>
          ) : (
            <button
              onClick={() => node.file && onSelectFile(node.file.id)}
              className="flex flex-1 items-center gap-2 pl-7"
            >
              <span className="relative">
                {getFileIcon(node.path)}
                {isPreview && (
                  <Tooltip>
                    <TooltipTrigger
                      className="absolute -bottom-1 -right-1 flex size-3 items-center justify-center rounded-full bg-primary"
                      render={<span />}
                    >
                      <IconEye className="size-2 text-primary-foreground" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      Rendered in preview panel
                    </TooltipContent>
                  </Tooltip>
                )}
              </span>
              <span
                className={cn(
                  "truncate font-mono text-[13px]",
                  isActive ? "text-foreground" : "text-foreground/70",
                )}
              >
                {node.name}
              </span>
            </button>
          )}

          {node.file && (
            <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
              {canPreview && !isPreview && (
                <Tooltip>
                  <TooltipTrigger
                    className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetPreviewFile(node.file!.id);
                    }}
                  >
                    <IconEye className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    Render in preview panel
                  </TooltipContent>
                </Tooltip>
              )}
              <Tooltip>
                <TooltipTrigger
                  className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditPath(node.path);
                    setIsEditing(true);
                  }}
                >
                  <IconPencil className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent side="bottom">Rename</TooltipContent>
              </Tooltip>
              {canDelete && (
                <Tooltip>
                  <TooltipTrigger
                    className="flex size-6 items-center justify-center rounded-md text-destructive/70 hover:bg-destructive/10 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteFile(node.file!.id);
                    }}
                  >
                    <IconTrash className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent side="bottom">Delete</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </motion.div>
      </div>

      {/* Drop indicator after */}
      {isDropTargetAfter && (
        <div
          className="mx-2 h-0.5 rounded-full bg-primary"
          style={{ marginLeft: depth * 14 + 8 }}
        />
      )}

      <AnimatePresence>
        {isFolder && isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {node.children.map((child) => (
              <FileNode
                key={child.path}
                node={child}
                depth={depth + 1}
                expandedFolders={expandedFolders}
                onToggleFolder={onToggleFolder}
                onExpandFolder={onExpandFolder}
                activeFileId={activeFileId}
                previewFileId={previewFileId}
                onSelectFile={onSelectFile}
                onSetPreviewFile={onSetPreviewFile}
                onRenameFile={onRenameFile}
                onDeleteFile={onDeleteFile}
                canDelete={canDelete}
                dragState={dragState}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragOverFolder={onDragOverFolder}
                onDragOverFile={onDragOverFile}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export function FileTree() {
  const {
    files,
    activeFileId,
    previewFileId,
    setActiveFile,
    setPreviewFile,
    addFile,
    removeFile,
    renamePath,
  } = useEditorStore();

  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["components"]),
  );
  const [isAdding, setIsAdding] = useState(false);
  const [newFilePath, setNewFilePath] = useState("");
  const [dragState, setDragState] = useState<DragState>({
    draggedFileId: null,
    draggedFilePath: null,
    dropTarget: null,
  });

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

  const expandFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, []);

  const handleDragStart = useCallback((fileId: string, filePath: string) => {
    setDragState({
      draggedFileId: fileId,
      draggedFilePath: filePath,
      dropTarget: null,
    });
  }, []);

  const handleDragEnd = useCallback(() => {
    setDragState({
      draggedFileId: null,
      draggedFilePath: null,
      dropTarget: null,
    });
  }, []);

  const handleDragOverFolder = useCallback((folderPath: string) => {
    setDragState((prev) => ({
      ...prev,
      dropTarget: { type: "folder", path: folderPath },
    }));
  }, []);

  const handleDragOverFile = useCallback(
    (fileId: string, filePath: string, position: "before" | "after") => {
      setDragState((prev) => ({
        ...prev,
        dropTarget: { type: position, path: filePath, fileId },
      }));
    },
    [],
  );

  const handleDragLeave = useCallback(() => {
    setDragState((prev) => ({
      ...prev,
      dropTarget: null,
    }));
  }, []);

  const handleDrop = useCallback(() => {
    if (
      !dragState.draggedFileId ||
      !dragState.draggedFilePath ||
      !dragState.dropTarget
    ) {
      handleDragEnd();
      return;
    }

    const fileName = getFileName(dragState.draggedFilePath);
    let newPath: string;

    if (dragState.dropTarget.type === "folder") {
      // Moving to a folder
      const targetFolder = dragState.dropTarget.path;
      newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;
    } else {
      // Moving before/after another file - use the same folder
      const targetPath = dragState.dropTarget.path;
      const targetFolder = getParentPath(targetPath);
      newPath = targetFolder ? `${targetFolder}/${fileName}` : fileName;
    }

    // Only rename if the path actually changed
    if (newPath !== dragState.draggedFilePath) {
      renamePath(dragState.draggedFileId, newPath);

      // Expand the target folder
      const newParent = getParentPath(newPath);
      if (newParent) {
        expandFolder(newParent);
      }
    }

    handleDragEnd();
  }, [dragState, renamePath, expandFolder, handleDragEnd]);

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

  // Handle dropping on the root (empty area)
  const handleRootDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragState.draggedFileId) {
      e.dataTransfer.dropEffect = "move";
      setDragState((prev) => ({
        ...prev,
        dropTarget: { type: "folder", path: "" },
      }));
    }
  };

  const handleRootDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragState.draggedFileId && dragState.draggedFilePath) {
      const fileName = getFileName(dragState.draggedFilePath);
      if (fileName !== dragState.draggedFilePath) {
        renamePath(dragState.draggedFileId, fileName);
      }
    }
    handleDragEnd();
  };

  const isRootDropTarget =
    dragState.dropTarget?.type === "folder" && dragState.dropTarget.path === "";

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Files
          </span>
        </div>
        <Tooltip>
          <TooltipTrigger
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
            onClick={() => setIsAdding(true)}
          >
            <IconPlus className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom">Add file</TooltipContent>
        </Tooltip>
      </div>

      {/* File list */}
      <div
        className={cn(
          "flex-1 overflow-auto px-2 pb-4",
          isRootDropTarget && "bg-primary/10",
        )}
        onDragOver={handleRootDragOver}
        onDrop={handleRootDrop}
      >
        {tree.map((node) => (
          <FileNode
            key={node.path}
            node={node}
            depth={0}
            expandedFolders={expandedFolders}
            onToggleFolder={toggleFolder}
            onExpandFolder={expandFolder}
            activeFileId={activeFileId}
            previewFileId={previewFileId}
            onSelectFile={setActiveFile}
            onSetPreviewFile={setPreviewFile}
            onRenameFile={renamePath}
            onDeleteFile={removeFile}
            canDelete={canDelete}
            dragState={dragState}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragOverFolder={handleDragOverFolder}
            onDragOverFile={handleDragOverFile}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          />
        ))}

        {/* Add file form */}
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -10, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -10, height: 0 }}
              className="mt-3 overflow-hidden rounded-lg border p-3"
            >
              {/* Quick presets */}
              <div className="mb-3 flex flex-wrap gap-1.5">
                {PATH_PRESETS.map((preset) => (
                  <button
                    key={preset.path}
                    onClick={() => setNewFilePath(preset.path)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium transition-colors",
                      newFilePath.startsWith(preset.path)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                    )}
                  >
                    <span
                      className={cn("h-1.5 w-1.5 rounded-full", preset.color)}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>

              {/* Input */}
              <Input
                value={newFilePath}
                onChange={(e) => setNewFilePath(e.target.value)}
                placeholder="path/to/file.tsx"
                className="h-8 font-mono text-xs"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFile();
                  if (e.key === "Escape") {
                    setNewFilePath("");
                    setIsAdding(false);
                  }
                }}
              />

              {/* Actions */}
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={handleAddFile}
                  disabled={!newFilePath.trim()}
                >
                  Create
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setNewFilePath("");
                    setIsAdding(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
