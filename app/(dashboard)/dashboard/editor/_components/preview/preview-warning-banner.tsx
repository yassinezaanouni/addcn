"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { IconAlertTriangle } from "@tabler/icons-react";

interface PreviewWarningBannerProps {
  unsupportedImports: string[];
}

export function PreviewWarningBanner({ unsupportedImports }: PreviewWarningBannerProps) {
  const [showDetails, setShowDetails] = useState(false);

  if (unsupportedImports.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mx-3 mb-3 overflow-hidden rounded-lg border border-amber-500/20 bg-amber-500/5"
    >
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-amber-600 dark:text-amber-400"
      >
        <IconAlertTriangle className="size-4 shrink-0" />
        <span className="font-medium">
          {unsupportedImports.length} unsupported import
          {unsupportedImports.length > 1 ? "s" : ""}
        </span>
      </button>
      {showDetails && (
        <div className="space-y-1 border-t border-amber-500/20 px-3 py-2 text-xs">
          {unsupportedImports.map((imp) => (
            <div key={imp} className="font-mono text-muted-foreground">
              {imp}
            </div>
          ))}
          <p className="pt-1 text-[11px] text-amber-600/70 dark:text-amber-400/70">
            These won&apos;t render in preview.
          </p>
        </div>
      )}
    </motion.div>
  );
}
