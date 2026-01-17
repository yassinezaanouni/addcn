"use client";

import Link from "next/link";
import { IconBrandGithub } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { APP_NAME } from "@/lib/constants";

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">A</span>
          </div>
          <span className="text-lg font-semibold">{APP_NAME}</span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button size="sm">Dashboard</Button>
          </Link>
          <ThemeToggle />
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconBrandGithub className="size-4" />
            <span className="sr-only">GitHub</span>
          </a>
        </div>
      </div>
    </header>
  );
}
