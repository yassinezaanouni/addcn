"use client";

import { useState, useCallback, useMemo } from "react";
import { useTheme } from "next-themes";
import {
  IconRefresh,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconExternalLink,
  IconAlertCircle,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type ViewportSize = "desktop" | "tablet" | "mobile";

const VIEWPORT_SIZES: Record<ViewportSize, { width: string; label: string }> = {
  desktop: { width: "100%", label: "Desktop" },
  tablet: { width: "768px", label: "Tablet" },
  mobile: { width: "375px", label: "Mobile" },
};

export interface PreviewPaneProps {
  previewURL: string | null;
  isLoading: boolean;
  error: Error | null;
  connectionHash: string | null;
  connectedShellId: string | null;
  onRefresh?: () => void;
}

export function PreviewPane({
  previewURL,
  isLoading,
  error,
  connectionHash,
  connectedShellId,
  onRefresh,
}: PreviewPaneProps) {
  const { resolvedTheme } = useTheme();
  const [viewport, setViewport] = useState<ViewportSize>("desktop");
  const [iframeKey, setIframeKey] = useState(0);

  // Construct iframe URL with theme
  const iframeSrc = useMemo(() => {
    if (!previewURL) return null;
    const url = new URL(previewURL);
    url.searchParams.set("theme", resolvedTheme ?? "light");
    return url.toString();
  }, [previewURL, resolvedTheme]);

  // Refresh iframe
  const handleRefresh = useCallback(() => {
    setIframeKey((prev) => prev + 1);
    onRefresh?.();
  }, [onRefresh]);

  // Open in new tab
  const handleOpenExternal = useCallback(() => {
    if (previewURL) {
      window.open(previewURL, "_blank");
    }
  }, [previewURL]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex h-full flex-col">
        <PreviewToolbar
          viewport={viewport}
          onViewportChange={setViewport}
          onRefresh={handleRefresh}
          onOpenExternal={handleOpenExternal}
          disabled
        />
        <div className="flex flex-1 items-center justify-center bg-muted/30">
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-full border-4 border-primary/20" />
              <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
            <span className="text-sm text-muted-foreground">
              Starting sandbox...
            </span>
            <span className="text-xs text-muted-foreground">
              This may take a few seconds
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-full flex-col">
        <PreviewToolbar
          viewport={viewport}
          onViewportChange={setViewport}
          onRefresh={handleRefresh}
          onOpenExternal={handleOpenExternal}
          disabled
        />
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/10 p-4">
            <div className="flex items-start gap-3">
              <IconAlertCircle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <h3 className="font-semibold text-destructive">
                  Failed to start sandbox
                </h3>
                <p className="mt-1 text-sm text-destructive/80">
                  {error.message}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={handleRefresh}
                >
                  Try Again
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No preview URL yet
  if (!iframeSrc) {
    return (
      <div className="flex h-full flex-col">
        <PreviewToolbar
          viewport={viewport}
          onViewportChange={setViewport}
          onRefresh={handleRefresh}
          onOpenExternal={handleOpenExternal}
          disabled
        />
        <div className="flex flex-1 items-center justify-center bg-muted/30">
          <span className="text-sm text-muted-foreground">
            Waiting for dev server...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <PreviewToolbar
        viewport={viewport}
        onViewportChange={setViewport}
        onRefresh={handleRefresh}
        onOpenExternal={handleOpenExternal}
      />
      <div className="flex-1 overflow-hidden bg-[url('/grid.svg')] bg-repeat">
        <div className="absolute inset-0 bg-gradient-to-br from-background/50 to-background/80" />
        <div className="relative h-full p-4">
          <div
            className="mx-auto h-full overflow-hidden rounded-lg border bg-background shadow-lg transition-all duration-200"
            style={{ width: VIEWPORT_SIZES[viewport].width }}
          >
            <iframe
              key={`${iframeKey}-${connectionHash}-${connectedShellId}`}
              src={iframeSrc}
              className="h-full w-full"
              title="Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-modals allow-popups"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Toolbar component
function PreviewToolbar({
  viewport,
  onViewportChange,
  onRefresh,
  onOpenExternal,
  disabled = false,
}: {
  viewport: ViewportSize;
  onViewportChange: (size: ViewportSize) => void;
  onRefresh: () => void;
  onOpenExternal: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex h-9 items-center justify-between border-b bg-muted/30 px-3">
      <div className="flex items-center gap-1">
        <span className="mr-2 text-xs font-medium text-muted-foreground">
          Preview
        </span>

        {/* Viewport size buttons */}
        <div className="flex items-center rounded-md border">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 rounded-none rounded-l-md",
              viewport === "desktop" && "bg-muted"
            )}
            onClick={() => onViewportChange("desktop")}
            disabled={disabled}
            title="Desktop"
          >
            <IconDeviceDesktop size={14} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 rounded-none border-x",
              viewport === "tablet" && "bg-muted"
            )}
            onClick={() => onViewportChange("tablet")}
            disabled={disabled}
            title="Tablet"
          >
            <IconDeviceTablet size={14} />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 rounded-none rounded-r-md",
              viewport === "mobile" && "bg-muted"
            )}
            onClick={() => onViewportChange("mobile")}
            disabled={disabled}
            title="Mobile"
          >
            <IconDeviceMobile size={14} />
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRefresh}
          disabled={disabled}
          title="Refresh"
        >
          <IconRefresh size={14} />
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onOpenExternal}
          disabled={disabled}
          title="Open in new tab"
        >
          <IconExternalLink size={14} />
        </Button>
      </div>
    </div>
  );
}
