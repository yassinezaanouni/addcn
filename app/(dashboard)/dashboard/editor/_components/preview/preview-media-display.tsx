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
    <div className="flex flex-col items-center gap-2">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full"
      >
        {mediaType === "video" ? (
          <video
            src={mediaUrl}
            controls
            className="w-full rounded-md border border-border/50"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaUrl}
            alt="Snippet preview"
            className="w-full rounded-md border border-border/50"
          />
        )}
        <Button
          onClick={onRemove}
          variant="destructive"
          size="icon"
          className="absolute -right-1.5 -top-1.5 size-6 rounded-full shadow-md"
          title="Remove media"
        >
          <IconX className="size-3.5" />
        </Button>
      </motion.div>

      {isPending && <PendingIndicator />}
    </div>
  );
}

function PendingIndicator() {
  return (
    <p className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400">
      <span className="relative flex h-1.5 w-1.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
      </span>
      Uploads on save
    </p>
  );
}
