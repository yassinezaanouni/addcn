"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { LayoutGroup } from "motion/react";
import { toast } from "sonner";

import { useEditorStore } from "@/stores/editor-store";
import { useDebounce } from "@/hooks/use-debounce";
import { analyzeMultipleFiles } from "@/lib/import-analyzer";
import { validateFile, isImageType } from "@/lib/upload-constants";
import { processImageFile } from "@/lib/image-utils";
import { collectAllFiles, transformCss, generateIframeHtml } from "@/lib/preview";

import {
  PreviewHeader,
  PreviewSwitch,
  PreviewWarningBanner,
  PreviewDropzone,
  PreviewMediaDisplay,
  PreviewError,
  PreviewIframe,
} from "./preview";

export function PreviewPanel() {
  const files = useEditorStore((state) => state.files);
  const previewFileId = useEditorStore((state) => state.previewFileId);
  const previewEnabled = useEditorStore((state) => state.previewEnabled);
  const previewMediaUrl = useEditorStore((state) => state.previewMediaUrl);
  const previewMediaType = useEditorStore((state) => state.previewMediaType);
  const pendingMediaLocalUrl = useEditorStore((state) => state.pendingMediaLocalUrl);
  const setPreviewEnabled = useEditorStore((state) => state.setPreviewEnabled);
  const setPendingMedia = useEditorStore((state) => state.setPendingMedia);
  const setPreviewMedia = useEditorStore((state) => state.setPreviewMedia);

  const { resolvedTheme } = useTheme();
  const [previewError, setPreviewError] = useState<string | null>(null);

  // The display URL is either the pending local blob or the saved R2 URL
  const displayMediaUrl = pendingMediaLocalUrl || previewMediaUrl;

  // Process and add a media file
  const handleMediaFile = useCallback(
    async (file: File) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast.error("Invalid file", { description: validation.error });
        return;
      }

      if (isImageType(file.type)) {
        try {
          const { file: processedFile, wasConverted } = await processImageFile(file);
          setPendingMedia(processedFile);
          toast.success("Image added", {
            description: wasConverted
              ? "Converted to WebP. Will upload on save."
              : "Will upload on save.",
          });
        } catch (error) {
          toast.error("Failed to process image", {
            description: error instanceof Error ? error.message : "Unknown error",
          });
        }
      } else {
        setPendingMedia(file);
        toast.success("Video added", { description: "Will upload on save." });
      }
    },
    [setPendingMedia]
  );

  const handleRemoveMedia = useCallback(() => {
    setPendingMedia(null);
    setPreviewMedia(null, null);
  }, [setPendingMedia, setPreviewMedia]);

  // Analyze imports for warnings
  const importAnalysis = useMemo(() => analyzeMultipleFiles(files), [files]);

  // Get the preview file (selected by user or first .tsx file)
  const mainFile = useMemo(() => {
    if (previewFileId) {
      const file = files.find((f) => f.id === previewFileId);
      if (file?.path.endsWith(".tsx")) return file;
    }
    return files.find((f) => f.path.endsWith(".tsx"));
  }, [files, previewFileId]);

  // Collect all CSS from style files
  const cssContent = useMemo(() => {
    const rawCss = files
      .filter((f) => f.type === "style" || f.path.endsWith(".css"))
      .map((f) => f.content)
      .join("\n\n");
    return transformCss(rawCss);
  }, [files]);

  // Collect all component files
  const componentFiles = useMemo(() => {
    if (!mainFile) return new Map();
    return collectAllFiles(mainFile, files);
  }, [mainFile, files]);

  // Generate iframe HTML
  const iframeHtml = useMemo(() => {
    if (!mainFile) return "";
    return generateIframeHtml(
      componentFiles,
      mainFile.path,
      cssContent,
      resolvedTheme || "light"
    );
  }, [mainFile, componentFiles, cssContent, resolvedTheme]);

  // Debounce the iframe content to avoid too many re-renders while typing
  const debouncedHtml = useDebounce(iframeHtml, 500);

  // Generate a hash of the content to use as iframe key
  const iframeKey = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < debouncedHtml.length; i++) {
      const char = debouncedHtml.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash;
  }, [debouncedHtml]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "preview-error") {
        setPreviewError(event.data.error);
      } else if (event.data?.type === "preview-success") {
        setPreviewError(null);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  // Clear error when code changes so the iframe can re-render
  useEffect(() => {
    setPreviewError(null);
  }, [iframeKey]);

  if (!mainFile) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        No component file to preview
      </div>
    );
  }

  const fileName = mainFile.path.split("/").pop() || "";

  return (
    <LayoutGroup>
      <div className="flex h-full flex-col">
        <PreviewHeader
          fileName={fileName}
          previewEnabled={previewEnabled}
          onPreviewEnabledChange={setPreviewEnabled}
        />

        {importAnalysis.hasUnsupported && previewEnabled && (
          <PreviewWarningBanner unsupportedImports={importAnalysis.unsupported} />
        )}

        <div className="relative flex-1 overflow-hidden">
          {previewEnabled ? (
            // Live preview mode
            previewError ? (
              <PreviewError error={previewError} />
            ) : (
              <PreviewIframe
                html={debouncedHtml}
                iframeKey={iframeKey}
                theme={resolvedTheme || "light"}
              />
            )
          ) : (
            // Disabled mode - show switch + or + upload
            <div className="flex h-full flex-col items-center justify-center gap-4 p-6">
              {displayMediaUrl ? (
                // Show media with switch above
                <div className="flex flex-col items-center gap-4">
                  <PreviewSwitch
                    checked={previewEnabled}
                    onCheckedChange={setPreviewEnabled}
                  />
                  <PreviewMediaDisplay
                    mediaUrl={displayMediaUrl}
                    mediaType={previewMediaType}
                    isPending={!!pendingMediaLocalUrl}
                    onRemove={handleRemoveMedia}
                  />
                </div>
              ) : (
                // No media - show dropzone + switch
                <div className="flex h-full flex-col items-center gap-6 p-6">
                  <div className="text-center">
                    <h2 className="text-xl font-semibold text-foreground">Add a preview</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Displayed on your component card in the dashboard
                    </p>
                  </div>

                  <PreviewDropzone onFileAccepted={handleMediaFile} />

                  <div className="flex w-full max-w-xs items-center gap-3">
                    <div className="h-px flex-1 bg-linear-to-r from-transparent to-border" />
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                      or
                    </span>
                    <div className="h-px flex-1 bg-linear-to-l from-transparent to-border" />
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-3">
                      <PreviewSwitch
                        checked={previewEnabled}
                        onCheckedChange={setPreviewEnabled}
                      />
                    </div>
                    <p className="max-w-[280px] text-center text-[11px] text-muted-foreground/70">
                      {importAnalysis.hasUnsupported ? (
                        <>
                          <span className="text-amber-500">Limited support</span> — some imports
                          won&apos;t render
                        </>
                      ) : (
                        <>
                          <span className="text-emerald-500">Full support</span> — React, Tailwind &amp;
                          Motion only
                        </>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </LayoutGroup>
  );
}
