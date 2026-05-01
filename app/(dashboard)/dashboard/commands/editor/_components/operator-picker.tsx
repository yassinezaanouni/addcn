"use client";

import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { OPERATORS, getOperatorMeta } from "@/lib/command-utils";
import type { CommandOperator } from "@/types/command";
import { cn } from "@/lib/utils";
import { IconChevronDown, IconCornerDownLeft } from "@tabler/icons-react";

interface OperatorPickerProps {
  value: CommandOperator;
  onChange: (op: CommandOperator) => void;
}

export function OperatorPicker({ value, onChange }: OperatorPickerProps) {
  const [open, setOpen] = useState(false);
  const meta = getOperatorMeta(value);
  const isNewline = value === "\n";

  return (
    <div className="flex items-center justify-center py-1">
      {/* Vertical connector lines, anchored to the chip */}
      <span className="h-3 w-px bg-border/60" aria-hidden />

      <Tooltip>
        <TooltipTrigger render={<span />}>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger
              className={cn(
                "mx-2 inline-flex items-center gap-1 rounded-md border border-border/60 bg-background px-2 py-0.5 font-mono text-[11px] text-foreground transition-colors hover:border-foreground/40 focus:outline-none focus:ring-1 focus:ring-primary/40",
                isNewline && "border-foreground/30",
              )}
              nativeButton
            >
              {isNewline ? (
                <>
                  <IconCornerDownLeft className="size-3" />
                  newline
                </>
              ) : (
                value
              )}
              <IconChevronDown className="size-3 opacity-60" />
            </PopoverTrigger>
            <PopoverContent
              align="center"
              sideOffset={6}
              className="w-72 gap-0 p-1"
            >
              <ul role="listbox" className="space-y-0.5">
                {OPERATORS.map((op) => {
                  const isActive = op.symbol === value;
                  return (
                    <li
                      key={op.symbol}
                      role="option"
                      aria-selected={isActive}
                      onClick={() => {
                        onChange(op.symbol);
                        setOpen(false);
                      }}
                      className={cn(
                        "flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 transition-colors",
                        isActive
                          ? "bg-foreground/8 dark:bg-foreground/10"
                          : "hover:bg-foreground/5 dark:hover:bg-foreground/8",
                      )}
                    >
                      <span className="mt-px inline-flex w-12 shrink-0 items-center justify-center rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                        {op.symbol === "\n" ? "↵" : op.symbol}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-foreground text-sm leading-tight">
                          {op.label}
                        </div>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {op.description}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </PopoverContent>
          </Popover>
        </TooltipTrigger>
        <TooltipContent side="right">{meta.label}</TooltipContent>
      </Tooltip>

      <span className="h-3 w-px bg-border/60" aria-hidden />
    </div>
  );
}
