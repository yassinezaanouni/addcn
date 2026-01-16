"use client";

import { useState } from "react";
import {
  IconFile,
  IconFileTypeCss,
  IconFileTypeTs,
  IconPlus,
  IconTrash,
  IconPencil,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useEditorStore } from "@/stores/editor-store";

export function FileTree() {
  const { files, activeFileId, setActiveFile, addFile, removeFile, renameFile } =
    useEditorStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [newFileName, setNewFileName] = useState("");

  const getFileIcon = (name: string) => {
    if (name.endsWith(".css")) return IconFileTypeCss;
    if (name.endsWith(".ts") || name.endsWith(".tsx")) return IconFileTypeTs;
    return IconFile;
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditValue(currentName);
  };

  const handleSaveEdit = (id: string) => {
    if (editValue.trim()) {
      renameFile(id, editValue.trim());
    }
    setEditingId(null);
    setEditValue("");
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditValue("");
  };

  const handleAddFile = () => {
    if (newFileName.trim()) {
      let fileName = newFileName.trim();
      if (!fileName.includes(".")) {
        fileName += ".tsx";
      }
      addFile({ name: fileName });
      setIsAdding(false);
      setNewFileName("");
    }
  };

  const handleCancelAdd = () => {
    setIsAdding(false);
    setNewFileName("");
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
          onClick={() => setIsAdding(true)}
        >
          <IconPlus className="size-3.5" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-0.5 p-2">
          {isAdding && (
            <div className="flex items-center gap-1 rounded-md bg-muted px-2 py-1">
              <Input
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddFile();
                  if (e.key === "Escape") handleCancelAdd();
                }}
                placeholder="filename.tsx"
                className="h-6 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                autoFocus
              />
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleAddFile}
              >
                <IconCheck className="size-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={handleCancelAdd}
              >
                <IconX className="size-3" />
              </Button>
            </div>
          )}

          {files.map((file) => {
            const Icon = getFileIcon(file.name);
            const isEditing = editingId === file.id;

            return (
              <div
                key={file.id}
                className={cn(
                  "group flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors",
                  activeFileId === file.id
                    ? "bg-accent text-accent-foreground"
                    : "hover:bg-muted"
                )}
              >
                <Icon className="size-4 shrink-0 text-muted-foreground" />

                {isEditing ? (
                  <div className="flex flex-1 items-center gap-1">
                    <Input
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveEdit(file.id);
                        if (e.key === "Escape") handleCancelEdit();
                      }}
                      className="h-6 flex-1 border-0 bg-transparent p-0 text-sm focus-visible:ring-0"
                      autoFocus
                    />
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => handleSaveEdit(file.id)}
                    >
                      <IconCheck className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={handleCancelEdit}
                    >
                      <IconX className="size-3" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <button
                      className="flex-1 truncate text-left"
                      onClick={() => setActiveFile(file.id)}
                    >
                      {file.name}
                    </button>

                    <div className="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(file.id, file.name);
                        }}
                      >
                        <IconPencil className="size-3" />
                      </Button>
                      {files.length > 1 && (
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeFile(file.id);
                          }}
                        >
                          <IconTrash className="size-3" />
                        </Button>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
