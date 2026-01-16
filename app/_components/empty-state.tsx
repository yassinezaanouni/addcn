"use client";

import Link from "next/link";
import { IconPlus, IconCode } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

export function EmptyState() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed border-border p-8 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <IconCode className="size-8 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold">No components yet</h3>
      <p className="mb-6 mt-2 max-w-sm text-sm text-muted-foreground">
        Get started by creating your first component. Components you create can
        be exported as shadcn registry-compatible JSON files.
      </p>
      <Link href="/editor">
        <Button>
          <IconPlus className="size-4" />
          Create Component
        </Button>
      </Link>
    </div>
  );
}
