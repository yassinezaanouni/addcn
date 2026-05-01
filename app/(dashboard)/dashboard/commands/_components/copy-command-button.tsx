"use client";

import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { IconCheck, IconCopy } from "@tabler/icons-react";
import { toast } from "sonner";

interface CopyCommandButtonProps {
  text: string;
  size?: "icon-sm" | "icon" | "sm" | "default";
  variant?: "default" | "ghost" | "outline" | "secondary";
  label?: string;
}

export function CopyCommandButton({
  text,
  size = "icon-sm",
  variant = "ghost",
  label,
}: CopyCommandButtonProps) {
  const { copied, copy } = useCopyToClipboard();

  const handleClick = async () => {
    const ok = await copy(text);
    if (ok) toast.success("Copied to clipboard");
  };

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleClick}
      title="Copy command"
      disabled={!text}
    >
      {copied ? (
        <IconCheck className="size-4 text-emerald-500" />
      ) : (
        <IconCopy className="size-4" />
      )}
      {label && <span className="ml-1.5">{copied ? "Copied" : label}</span>}
    </Button>
  );
}
