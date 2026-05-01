"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

// useLayoutEffect on the client, no-op on the server.
const useIsoLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Single-line truncated `<code>`. Hovering pops a tooltip with the full
 * text — only when the rendered text actually overflows. Always renders
 * the same DOM tree (just controls the Tooltip's `open` prop) so the ref
 * and ResizeObserver stay attached to the same element across state flips.
 */
export function TruncatedCode({
  text,
  side = "top",
  className,
}: TruncatedCodeProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const check = () => {
      const truncated = el.scrollWidth > el.clientWidth + 1;
      setIsTruncated((prev) => (prev === truncated ? prev : truncated));
    };

    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  return (
    <Tooltip open={isTruncated ? undefined : false}>
      <TooltipTrigger
        render={
          <span
            className={cn(
              "block min-w-0",
              isTruncated && "cursor-help",
            )}
          />
        }
      >
        <code
          ref={ref}
          className={cn("block min-w-0 truncate font-mono", className)}
        >
          {text}
        </code>
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
