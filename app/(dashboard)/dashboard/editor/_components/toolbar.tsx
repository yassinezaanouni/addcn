"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { motion } from "motion/react";
import { api } from "@/convex/_generated/api";
import { useEditorStore, useIsNewComponent } from "@/stores/editor-store";
import { useOrgContext } from "@/components/org-switcher";
import { useUpload } from "@/hooks/use-upload";
import { validateComponentMetadata, type ComponentMetadataErrors } from "@/lib/validators";
import { Button } from "@/components/ui/button";
import { DeleteComponentButton } from "../../_components/delete-component-button";
import { RequiredFieldsDialog } from "./required-fields-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";

export function Toolbar() {
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
    setIsDirty,
    commitPendingMedia,
    validationDialogOpen,
    setValidationDialogOpen,
  } = useEditorStore();

  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [validationErrors, setValidationErrors] = useState<ComponentMetadataErrors>({});
  const { upload } = useUpload();

  const createMutationFn = useConvexMutation(api.components.create);
  const updateMutationFn = useConvexMutation(api.components.update);

  const createMutation = useMutation({
    mutationFn: createMutationFn,
    onSuccess: () => {
      setIsDirty(false);
      toast.success("Component created");
      router.push("/dashboard");
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
      router.push("/dashboard");
    },
    onError: (error) => {
      toast.error("Failed to save component", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending || isUploadingMedia;

  const performSave = async () => {
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

  const handleSave = async () => {
    // Validate using Zod schema
    const validation = validateComponentMetadata({
      name: name.trim(),
      title: title.trim(),
      description: description.trim(),
    });

    if (!validation.success) {
      setValidationErrors(validation.errors);
      setValidationDialogOpen(true);
      return;
    }

    // Clear any previous errors and close dialog if open
    setValidationErrors({});
    setValidationDialogOpen(false);

    await performSave();
  };

  const handleDialogSave = async () => {
    // Re-validate from dialog (user may have fixed errors)
    const validation = validateComponentMetadata({
      name: name.trim(),
      title: title.trim(),
      description: description.trim(),
    });

    if (!validation.success) {
      setValidationErrors(validation.errors);
      return;
    }

    // Clear errors and close dialog
    setValidationErrors({});
    setValidationDialogOpen(false);

    await performSave();
  };

  return (
    <>
      <div className="relative z-10 flex h-14 items-center justify-between">
        {/* Left side */}
        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              onClick={() => router.push("/dashboard")}
            >
              <IconArrowLeft className="size-5" />
            </TooltipTrigger>
            <TooltipContent side="bottom">Back to dashboard</TooltipContent>
          </Tooltip>

          <div className="flex items-center gap-3">
            <motion.h1
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-lg font-semibold tracking-tight"
            >
              {title || "Untitled"}
            </motion.h1>
            {isDirty && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400"
              >
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
                </span>
                Unsaved
              </motion.div>
            )}
          </div>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {!isNew && convexId && (
            <DeleteComponentButton
              componentId={convexId}
              componentName={title || name}
              redirectAfterDelete
            />
          )}
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="gap-2 rounded-lg px-4 font-medium shadow-sm transition-all hover:shadow-md"
          >
            {isSaving ? (
              <IconLoader2 className="size-4 animate-spin" />
            ) : (
              <IconDeviceFloppy className="size-4" />
            )}
            {isUploadingMedia ? "Uploading..." : isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <RequiredFieldsDialog
        open={validationDialogOpen}
        onOpenChange={setValidationDialogOpen}
        errors={validationErrors}
        onSave={handleDialogSave}
        isSaving={isSaving}
      />
    </>
  );
}
