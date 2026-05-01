import Link from "next/link";
import { Suspense } from "react";
import { CommandList } from "./_components/command-list";
import { CommandEditorSheet } from "./_components/command-editor-sheet";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export default function CommandsPage() {
  return (
    <div className="flex h-full flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-mono text-xl font-semibold tracking-tight">
            Commands
          </h1>
          <p className="text-sm text-muted-foreground">
            Save CLI commands and chain them into workflows with shell operators
          </p>
        </div>
        <Link href="/dashboard/commands?edit=new">
          <Button className="gap-2 font-mono text-sm">
            <IconPlus className="size-4" />
            New Command
          </Button>
        </Link>
      </div>

      <CommandList />

      {/* Sheet reads `?edit=…` from the URL — no separate route needed. */}
      <Suspense fallback={null}>
        <CommandEditorSheet />
      </Suspense>
    </div>
  );
}
