"use client";

import { useRef, useEffect } from "react";

interface PreviewIframeProps {
  html: string;
  iframeKey: number;
  theme: string;
}

export function PreviewIframe({ html, iframeKey, theme }: PreviewIframeProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Sync theme changes to iframe
  useEffect(() => {
    if (iframeRef.current?.contentWindow) {
      iframeRef.current.contentWindow.postMessage(
        { type: "theme-change", theme },
        "*"
      );
    }
  }, [theme]);

  return (
    <div className="h-full w-full p-3">
      <iframe
        ref={iframeRef}
        key={iframeKey}
        srcDoc={html}
        className="h-full w-full rounded-lg border-0 bg-background"
        sandbox="allow-scripts"
        title="Component Preview"
      />
    </div>
  );
}
