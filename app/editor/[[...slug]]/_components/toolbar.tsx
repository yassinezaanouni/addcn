"use client";

import Link from "next/link";
import { IconArrowLeft, IconDeviceFloppy, IconEye, IconEyeOff } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useEditorStore } from "@/stores/editor-store";
import { useUIStore } from "@/stores/ui-store";

interface ToolbarProps {
  onSave: () => void;
  isSaving?: boolean;
}

export function Toolbar({ onSave, isSaving }: ToolbarProps) {
  const { isDirty, componentId, title } = useEditorStore();
  const { previewVisible, togglePreview } = useUIStore();

  return (
    <div className="flex h-12 items-center justify-between border-b border-border px-3">
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button variant="ghost" size="icon-sm">
            <IconArrowLeft className="size-4" />
          </Button>
        </Link>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {title || (componentId ? "Edit Component" : "New Component")}
          </span>
          {isDirty && (
            <Badge variant="secondary" className="text-xs">
              Unsaved
            </Badge>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={togglePreview}
          title={previewVisible ? "Hide preview" : "Show preview"}
        >
          {previewVisible ? (
            <IconEyeOff className="size-4" />
          ) : (
            <IconEye className="size-4" />
          )}
        </Button>
        <Button onClick={onSave} disabled={isSaving} size="sm">
          <IconDeviceFloppy className="size-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
