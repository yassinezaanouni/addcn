"use client";

import { motion } from "motion/react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconInfoCircle } from "@tabler/icons-react";
import { PREVIEW_INFO } from "@/lib/preview";

interface PreviewHeaderProps {
  fileName: string;
  previewEnabled: boolean;
  onPreviewEnabledChange: (enabled: boolean) => void;
}

export function PreviewHeader({
  fileName,
  previewEnabled,
  onPreviewEnabledChange,
}: PreviewHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="h-1.5 w-1.5 rounded-full bg-cyan-500" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Preview
        </span>
        <Tooltip>
          <TooltipTrigger className="text-muted-foreground/50 transition-colors hover:text-muted-foreground">
            <IconInfoCircle className="size-3.5" />
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px] text-xs">
            {PREVIEW_INFO}
          </TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-md bg-muted/50 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
          {fileName}
        </span>
        {previewEnabled && (
          <PreviewSwitch
            checked={previewEnabled}
            onCheckedChange={onPreviewEnabledChange}
          />
        )}
      </div>
    </div>
  );
}

interface PreviewSwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export function PreviewSwitch({ checked, onCheckedChange }: PreviewSwitchProps) {
  return (
    <Tooltip>
      <TooltipTrigger render={<span />}>
        <motion.div
          layoutId="preview-switch"
          className="flex items-center gap-2 cursor-not-allowed opacity-50"
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        >
          <Switch checked={checked} onCheckedChange={onCheckedChange} disabled />
          <span className="text-sm text-muted-foreground">Live Preview</span>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent side="bottom">Coming soon</TooltipContent>
    </Tooltip>
  );
}
