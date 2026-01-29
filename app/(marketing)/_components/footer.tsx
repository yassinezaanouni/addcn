import Link from "next/link";
import { IconBrandX, IconBrandGithub } from "@tabler/icons-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/30">
      <div className="container flex flex-col items-center justify-between gap-4 py-6 md:flex-row">
        <p className="text-sm text-muted-foreground">
          Open source component registry for shadcn/ui
        </p>
        <div className="flex items-center gap-6">
          <Link
            href="https://github.com/yassinezaanouni/addcn"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconBrandGithub className="size-5" />
            <span className="sr-only">GitHub</span>
          </Link>
          <Link
            href="https://x.com/yassinezaanouni"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <IconBrandX className="size-5" />
            <span className="sr-only">Twitter</span>
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
