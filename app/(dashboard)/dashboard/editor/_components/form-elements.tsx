"use client";

import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconInfoCircle } from "@tabler/icons-react";

export function RequiredIndicator() {
  return <span className="text-destructive">*</span>;
}

interface SlugLabelProps {
  htmlFor: string;
}

export function SlugLabel({ htmlFor }: SlugLabelProps) {
  return (
    <Label htmlFor={htmlFor} className="inline-flex items-center">
      <span>Slug</span>
      <span className="text-destructive">*</span>
      <Tooltip>
        <TooltipTrigger className="cursor-help">
          <IconInfoCircle className="size-3.5 text-muted-foreground" />
        </TooltipTrigger>
        <TooltipContent>
          URL-friendly identifier for your component
        </TooltipContent>
      </Tooltip>
    </Label>
  );
}
