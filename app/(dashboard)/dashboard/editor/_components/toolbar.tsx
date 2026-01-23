"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { useEditorStore, useIsNewComponent } from "@/stores/editor-store";
import { useOrgContext } from "@/components/org-switcher";
import { useUpload } from "@/hooks/use-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconEye,
  IconEyeOff,
} from "@tabler/icons-react";
import { toast } from "sonner";

interface ToolbarProps {
  previewVisible: boolean;
  onTogglePreview: () => void;
}

export function Toolbar({ previewVisible, onTogglePreview }: ToolbarProps) {
  const router = useRouter();
  const isNew = useIsNewComponent();
  const context = useOrgContext();

  const {
    convexId,
    name,
    title,
    description,
    files,
    dependencies,
    registryDependencies,
    previewEnabled,
    previewMediaUrl,
    previewMediaType,
    pendingMediaFile,
    isDirty,
    setConvexId,
    setIsDirty,
    commitPendingMedia,
  } = useEditorStore();

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const { upload } = useUpload();

  const createMutationFn = useConvexMutation(api.components.create);
  const updateMutationFn = useConvexMutation(api.components.update);

  const createMutation = useMutation({
    mutationFn: createMutationFn,
    onSuccess: (id) => {
      setConvexId(id);
      setIsDirty(false);
      toast.success("Component created");
      router.replace(`/dashboard/editor/${id}`);
    },
    onError: (error) => {
      toast.error("Failed to create component", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateMutationFn,
    onSuccess: () => {
      setIsDirty(false);
      toast.success("Component saved");
    },
    onError: (error) => {
      toast.error("Failed to save component", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending || isUploadingMedia;

  const handleSave = async () => {
    // Validate
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }

    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }

    // Upload pending media first if exists
    let finalMediaUrl = previewMediaUrl;
    let finalMediaType = previewMediaType;

    if (pendingMediaFile) {
      setIsUploadingMedia(true);
      try {
        const result = await upload(pendingMediaFile);
        if (result) {
          finalMediaUrl = result.url;
          finalMediaType = result.type;
          commitPendingMedia(result.url);
        } else {
          toast.error("Failed to upload media");
          setIsUploadingMedia(false);
          return;
        }
      } catch (error) {
        toast.error("Failed to upload media", {
          description: error instanceof Error ? error.message : "An error occurred",
        });
        setIsUploadingMedia(false);
        return;
      }
      setIsUploadingMedia(false);
    }

    if (isNew) {
      createMutation.mutate({
        name: name.trim(),
        title: title.trim(),
        description: description.trim(),
        files,
        dependencies,
        registryDependencies,
        orgId: context === "personal" ? undefined : context,
        isPublic: false,
        previewEnabled,
        previewMediaUrl: finalMediaUrl ?? undefined,
        previewMediaType: finalMediaType ?? undefined,
      });
    } else if (convexId) {
      updateMutation.mutate({
        id: convexId,
        name: name.trim(),
        title: title.trim(),
        description: description.trim(),
        files,
        dependencies,
        registryDependencies,
        previewEnabled,
        previewMediaUrl: finalMediaUrl ?? undefined,
        previewMediaType: finalMediaType ?? undefined,
      });
    }
  };

  return (
    <div className="flex h-12 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => router.push("/dashboard")}
        >
          <IconArrowLeft className="size-4" />
        </Button>
        <span className="font-medium">{title || "Untitled Component"}</span>
        {isDirty && (
          <Badge variant="secondary" className="text-xs">
            Unsaved
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onTogglePreview}
          title={previewVisible ? "Hide preview" : "Show preview"}
        >
          {previewVisible ? (
            <IconEyeOff className="size-4" />
          ) : (
            <IconEye className="size-4" />
          )}
        </Button>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <IconDeviceFloppy className="size-4" />
          {isUploadingMedia ? "Uploading..." : isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
