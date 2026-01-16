"use client";

import { useState, useCallback } from "react";

interface UseCopyToClipboardReturn {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
}

export function useCopyToClipboard(
  timeout = 2000
): UseCopyToClipboardReturn {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(
    async (text: string): Promise<boolean> => {
      if (!navigator?.clipboard) {
        console.warn("Clipboard not supported");
        return false;
      }

      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), timeout);
        return true;
      } catch (error) {
        console.error("Failed to copy:", error);
        setCopied(false);
        return false;
      }
    },
    [timeout]
  );

  return { copied, copy };
}
