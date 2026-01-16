"use client";

import { IconCopy, IconCheck } from "@tabler/icons-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";

interface InstallCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentName: string;
}

export function InstallCommand({
  open,
  onOpenChange,
  componentName,
}: InstallCommandProps) {
  const { copied, copy } = useCopyToClipboard();

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
  const command = `pnpm dlx shadcn@latest add ${baseUrl}/r/${componentName}.json`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Install Component</DialogTitle>
          <DialogDescription>
            Run this command to install the component using the shadcn CLI
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm">
            {command}
          </code>
          <Button
            variant="outline"
            size="icon"
            onClick={() => copy(command)}
          >
            {copied ? (
              <IconCheck className="size-4" />
            ) : (
              <IconCopy className="size-4" />
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
