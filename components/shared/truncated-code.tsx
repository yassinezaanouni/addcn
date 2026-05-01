"use client";

import { useEffect, useRef, useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type Side = "top" | "bottom" | "left" | "right";

interface TruncatedCodeProps {
  text: string;
  /** Side to anchor the tooltip when content overflows. Default: "top". */
  side?: Side;
  className?: string;
}

/**
 * Inline single-line `<code>` that auto-truncates with ellipsis. If the
 * rendered width exceeds the available space, hovering reveals the full
 * text via a tooltip. No tooltip is shown when the text fits.
 */
export function TruncatedCode({
  text,
  side = "top",
  className,
}: TruncatedCodeProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      setIsTruncated(el.scrollWidth > el.clientWidth + 1);
    };
    // Defer the initial measurement to the next paint so setState doesn't
    // run synchronously inside the effect body (avoids the
    // react-hooks/set-state-in-effect lint rule and any layout thrash).
    const id = requestAnimationFrame(check);
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => {
      cancelAnimationFrame(id);
      observer.disconnect();
    };
  }, [text]);

  const code = (
    <code
      ref={ref}
      className={cn("block min-w-0 truncate font-mono", className)}
    >
      {text}
    </code>
  );

  if (!isTruncated) return code;

  return (
    <Tooltip>
      <TooltipTrigger render={<span className="block min-w-0 cursor-help" />}>
        {code}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        className="!max-w-[min(80vw,40rem)] whitespace-pre-wrap break-all px-2.5 py-2 font-mono"
      >
        {text}
      </TooltipContent>
    </Tooltip>
  );
}
