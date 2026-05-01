"use client";

import { useCallback } from "react";
import { toast } from "sonner";

import { useEditorStore } from "@/stores/editor-store";
import { validateFile, isImageType } from "@/lib/upload-constants";
import { processImageFile } from "@/lib/image-utils";

import { PreviewDropzone, PreviewMediaDisplay } from "./preview";

export function PreviewMediaSection() {
  const previewMediaUrl = useEditorStore((state) => state.previewMediaUrl);
  const previewMediaType = useEditorStore((state) => state.previewMediaType);
  const pendingMediaLocalUrl = useEditorStore(
    (state) => state.pendingMediaLocalUrl,
  );
  const setPendingMedia = useEditorStore((state) => state.setPendingMedia);
  const setPreviewMedia = useEditorStore((state) => state.setPreviewMedia);

  const displayMediaUrl = pendingMediaLocalUrl || previewMediaUrl;

  const handleMediaFile = useCallback(
    async (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error("Invalid file", { description: validation.error });
        return;
      }

      if (isImageType(file.type)) {
        try {
          const { file: processedFile, wasConverted } =
            await processImageFile(file);
          setPendingMedia(processedFile);
          toast.success("Image added", {
            description: wasConverted
              ? "Converted to WebP. Will upload on save."
              : "Will upload on save.",
          });
        } catch (error) {
          toast.error("Failed to process image", {
            description:
              error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        setPendingMedia(file);
        toast.success("Video added", { description: "Will upload on save." });
      }
    },
    [setPendingMedia],
  );

  const handleRemoveMedia = useCallback(() => {
    setPendingMedia(null);
    setPreviewMedia(null, null);
  }, [setPendingMedia, setPreviewMedia]);

  return (
    <div className="px-4 pb-4">
      {displayMediaUrl ? (
        <PreviewMediaDisplay
          mediaUrl={displayMediaUrl}
          mediaType={previewMediaType}
          isPending={!!pendingMediaLocalUrl}
          onRemove={handleRemoveMedia}
        />
      ) : (
        <PreviewDropzone onFileAccepted={handleMediaFile} />
      )}
    </div>
  );
}
