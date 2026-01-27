"use client";

import { motion } from "motion/react";
import { IconAlertTriangle } from "@tabler/icons-react";

interface PreviewErrorProps {
  error: string;
}

export function PreviewError({ error }: PreviewErrorProps) {
  return (
    <div className="flex h-full flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-xl border border-destructive/20 bg-destructive/5 p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10">
            <IconAlertTriangle className="size-4 text-destructive" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-destructive">Preview Error</p>
            <p className="mt-2 break-words font-mono text-xs text-destructive/70">
              {error}
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
