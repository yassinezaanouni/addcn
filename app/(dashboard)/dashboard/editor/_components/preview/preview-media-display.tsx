"use client";

import { motion } from "motion/react";
import { IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface PreviewMediaDisplayProps {
  mediaUrl: string;
  mediaType: "image" | "video" | null;
  isPending: boolean;
  onRemove: () => void;
}

export function PreviewMediaDisplay({
  mediaUrl,
  mediaType,
  isPending,
  onRemove,
}: PreviewMediaDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {mediaType === "video" ? (
          <video
            src={mediaUrl}
            controls
            className="w-full rounded-xl border border-border/50 shadow-lg"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl}
            alt="Snippet preview"
            className="w-full rounded-xl border border-border/50 shadow-lg"
          />
        )}
        <Button
          onClick={onRemove}
          variant="destructive"
          size="icon"
          className="absolute -right-2 -top-2 size-7 rounded-full shadow-md"
          title="Remove media"
        >
          <IconX className="size-4" />
        </Button>
      </motion.div>

      {isPending && <PendingIndicator />}
    </div>
  );
}

function PendingIndicator() {
  return (
    <p className="flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
      </span>
      Uploads on save
    </p>
  );
}
