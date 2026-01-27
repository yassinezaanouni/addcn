import Link from "next/link";
import { IconArrowLeft, IconTerminal2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none absolute inset-0">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02] dark:opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)
            `,
            backgroundSize: "64px 64px",
          }}
        />
        {/* Radial glow - shifted for visual interest */}
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-destructive/5 blur-[100px]" />
        <div className="absolute bottom-0 right-0 h-[400px] w-[400px] translate-x-1/4 translate-y-1/4 rounded-full bg-primary/10 blur-[120px]" />
      </div>

      {/* Content */}
      <div className="container relative z-10 px-4">
        <div className="mx-auto max-w-2xl">
          {/* Terminal window */}
          <div className="overflow-hidden relative rounded-xl border border-border bg-card shadow-2xl">
            {/* Scan line effect */}
            <div className="pointer-events-none absolute inset-0 z-10">
              <div
                className="absolute inset-0 opacity-[0.015]"
                style={{
                  backgroundImage:
                    "repeating-linear-gradient(0deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)",
                }}
              />
            </div>

            {/* Terminal header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="size-3 rounded-full bg-destructive/70" />
                <div className="size-3 rounded-full bg-yellow-500/70" />
                <div className="size-3 rounded-full bg-primary/70" />
              </div>
              <span className="font-mono text-xs text-muted-foreground">
                error.log
              </span>
              <div className="w-[52px]" />
            </div>

            {/* Terminal content */}
            <div className="relative space-y-4 p-6 font-mono text-sm sm:p-8">
              {/* Error badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs text-destructive">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-destructive" />
                </span>
                FATAL ERROR
              </div>

              {/* Big 404 */}
              <div className="py-4">
                <div className="flex items-baseline gap-3">
                  <span className="text-7xl font-bold tracking-tighter text-foreground sm:text-8xl">
                    4
                  </span>
                  <div className="relative">
                    <IconTerminal2 className="size-12 text-primary sm:size-16" />
                    <div className="absolute inset-0 animate-ping">
                      <IconTerminal2 className="size-12 text-primary/30 sm:size-16" />
                    </div>
                  </div>
                  <span className="text-7xl font-bold tracking-tighter text-foreground sm:text-8xl">
                    4
                  </span>
                </div>
              </div>

              {/* Terminal output */}
              <div className="space-y-2 border-l-2 border-destructive/30 pl-4">
                <div className="flex items-start gap-2">
                  <span className="text-destructive">$</span>
                  <span className="text-muted-foreground">
                    fetch /requested/page
                  </span>
                </div>
                <div className="text-destructive">
                  Error: ENOENT - Page not found in registry
                </div>
                <div className="text-muted-foreground/70">
                  The component you&apos;re looking for has either been moved,
                  deleted, or never existed in the first place.
                </div>
              </div>

              {/* Suggested action */}
              <div className="rounded-md border border-primary/20 bg-primary/5 px-4 py-3">
                <div className="flex items-center gap-2 text-primary">
                  <span>~</span>
                  <span className="text-muted-foreground">$</span>
                  <span>cd /home</span>
                  <span className="ml-1 inline-block h-4 w-1.5 animate-pulse bg-primary" />
                </div>
              </div>

              {/* Action button */}
              <div className="pt-2">
                <Button
                  size="lg"
                  className="gap-2 font-mono"
                  render={<Link href="/" />}
                  nativeButton={false}
                >
                  <IconArrowLeft className="size-4" />
                  Return home
                </Button>
              </div>
            </div>
          </div>

          {/* Help text */}
          <p className="mt-6 text-center font-mono text-xs text-muted-foreground">
            Lost? Try checking the URL or head back to the homepage.
          </p>
        </div>
      </div>
    </main>
  );
}
