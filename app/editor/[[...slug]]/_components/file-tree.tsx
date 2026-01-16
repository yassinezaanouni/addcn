"use client";

import { useState } from "react";
import {
  IconFile,
  IconFileTypeCss,
  IconFileTypeTs,
  IconFolder,
  IconFolderOpen,
  IconPlus,
  IconTrash,
  IconPencil,
  IconCheck,
  IconX,
  IconChevronRight,
  IconChevronDown,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  useEditorStore,
  buildFolderTree,
  type FolderNode,
} from "@/stores/editor-store";

const PATH_PRESETS = [
  { label: "components/ui", path: "components/ui" },
  { label: "hooks", path: "hooks" },
  { label: "lib", path: "lib" },
  { label: "app", path: "app" },
] as const;

// Reusable inline input for add/edit operations
function InlineInput({
  value,
  onChange,
  onConfirm,
  onCancel,
  placeholder,
  icon: Icon,
  className,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  placeholder: string;
  icon: React.ComponentType<{ className?: string }>;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div className={cn("flex items-center gap-1 py-1 pr-2", className)} style={style}>
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onConfirm();
          if (e.key === "Escape") onCancel();
        }}
        placeholder={placeholder}
        className="h-6 flex-1 border-0 bg-muted p-1 text-sm focus-visible:ring-0"
        autoFocus
      />
      <Button variant="ghost" size="icon-xs" onClick={onConfirm}>
        <IconCheck className="size-3" />
      </Button>
      <Button variant="ghost" size="icon-xs" onClick={onCancel}>
        <IconX className="size-3" />
      </Button>
    </div>
  );
}

export function FileTree() {
  const { files, activeFileId, setActiveFile, addFile, removeFile, renamePath } =
    useEditorStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [addingInPath, setAddingInPath] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["components", "components/ui"])
  );

  const tree = buildFolderTree(files);

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

  const getFileIcon = (name: string) => {
    if (name.endsWith(".css")) return IconFileTypeCss;
    if (name.endsWith(".ts") || name.endsWith(".tsx")) return IconFileTypeTs;
    return IconFile;
  };

  const handleStartEdit = (file: { id: string; path: string }) => {
    setEditingId(file.id);
    setEditValue(file.path); // Edit full path to allow moving between folders
  };

  const handleSaveEdit = (id: string) => {
    if (!editValue.trim()) {
      handleCancelEdit();
      return;
    }
    renamePath(id, editValue.trim());
    setEditingId(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleStartAdd = (parentPath: string) => {
    setAddingInPath(parentPath);
    setNewFileName("");
    setSelectedPreset(null);
    if (parentPath) {
      setExpandedFolders((prev) => new Set([...prev, parentPath]));
    }
  };

  const handleConfirmAdd = () => {
    if (addingInPath === null || !newFileName.trim()) return;

    let name = newFileName.trim();
    if (!name.includes(".")) {
      name += ".tsx";
    }

    let fullPath: string;
    if (addingInPath) {
      // Adding inside a folder
      fullPath = `${addingInPath}/${name}`;
    } else if (selectedPreset) {
      // Adding at root with a preset selected
      fullPath = `${selectedPreset}/${name}`;
    } else {
      // Adding at root without preset (user typed full path)
      fullPath = name;
    }

    addFile(fullPath);
    setAddingInPath(null);
    setNewFileName("");
    setSelectedPreset(null);
  };

  const handleCancelAdd = () => {
    setAddingInPath(null);
    setNewFileName("");
    setSelectedPreset(null);
  };

  const renderAddInput = (parentPath: string, paddingLeft: number) => {
    if (addingInPath !== parentPath) return null;

    const isRoot = parentPath === "";

    // Show preset buttons only at root level
    if (isRoot) {
      return (
        <div className="px-2 py-1">
          <div className="mb-1 flex flex-wrap gap-1">
            {PATH_PRESETS.map((preset) => (
              <Button
                key={preset.path}
                variant={selectedPreset === preset.path ? "secondary" : "ghost"}
                size="xs"
                className="h-5 px-1.5 text-[10px] font-normal"
                onClick={() =>
                  setSelectedPreset(
                    selectedPreset === preset.path ? null : preset.path
                  )
                }
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <InlineInput
            value={newFileName}
            onChange={setNewFileName}
            onConfirm={handleConfirmAdd}
            onCancel={handleCancelAdd}
            placeholder={selectedPreset ? "filename.tsx" : "path/to/file.tsx"}
            icon={IconFile}
          />
        </div>
      );
    }

    return (
      <InlineInput
        value={newFileName}
        onChange={setNewFileName}
        onConfirm={handleConfirmAdd}
        onCancel={handleCancelAdd}
        placeholder="filename.tsx"
        icon={IconFile}
        style={{ paddingLeft }}
      />
    );
  };

  const renderNode = (node: FolderNode, depth: number = 0): React.ReactNode => {
    const isExpanded = expandedFolders.has(node.path);
    const isActive = node.file?.id === activeFileId;
    const isEditing = node.file && editingId === node.file.id;
    const paddingLeft = depth * 12 + 8;

    if (node.type === "folder") {
      const FolderIcon = isExpanded ? IconFolderOpen : IconFolder;
      const ChevronIcon = isExpanded ? IconChevronDown : IconChevronRight;

      return (
        <div key={node.path}>
          <div
            className="group flex items-center gap-1 py-1 pr-2 text-sm hover:bg-muted cursor-pointer"
            style={{ paddingLeft }}
            onClick={() => toggleFolder(node.path)}
          >
            <ChevronIcon className="size-3.5 shrink-0 text-muted-foreground" />
            <FolderIcon className="size-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">{node.name}</span>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 group-hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation();
                handleStartAdd(node.path);
              }}
              title="New file"
            >
              <IconPlus className="size-3" />
            </Button>
          </div>

          {isExpanded && (
            <div>
              {renderAddInput(node.path, paddingLeft + 12)}
              {node.children?.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    // File node
    const Icon = getFileIcon(node.name);

    if (isEditing && node.file) {
      return (
        <InlineInput
          key={node.file.id}
          value={editValue}
          onChange={setEditValue}
          onConfirm={() => handleSaveEdit(node.file!.id)}
          onCancel={handleCancelEdit}
          placeholder="components/ui/filename.tsx"
          icon={Icon}
          className="bg-muted"
          style={{ paddingLeft }}
        />
      );
    }

    return (
      <div
        key={node.file?.id || node.path}
        className={cn(
          "group flex items-center gap-1 py-1 pr-2 text-sm cursor-pointer",
          isActive ? "bg-accent text-accent-foreground" : "hover:bg-muted"
        )}
        style={{ paddingLeft }}
        onClick={() => node.file && setActiveFile(node.file.id)}
      >
        <Icon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate font-mono text-xs">{node.name}</span>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={(e) => {
              e.stopPropagation();
              if (node.file) handleStartEdit(node.file);
            }}
            title="Rename"
          >
            <IconPencil className="size-3" />
          </Button>
          {files.length > 1 && node.file && (
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={(e) => {
                e.stopPropagation();
                removeFile(node.file!.id);
              }}
              title="Delete"
            >
              <IconTrash className="size-3" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col border-r border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-medium uppercase text-muted-foreground">
          Files
        </span>
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={() => handleStartAdd("")}
          title="New file"
        >
          <IconPlus className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="py-1">
          {renderAddInput("", 8)}
          {tree.map((node) => renderNode(node, 0))}
        </div>
      </ScrollArea>
    </div>
  );
}
