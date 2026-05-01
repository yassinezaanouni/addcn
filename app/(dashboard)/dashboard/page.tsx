import Link from "next/link";
import { SnippetList } from "./_components/snippet-list";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export default function DashboardPage() {
  return (
    <div className="gap-8 flex flex-col h-full">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-mono text-xl font-semibold tracking-tight">
            Snippets
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and publish your registry snippets
          </p>
        </div>
        <Link href="/dashboard/editor">
          <Button className="gap-2 font-mono text-sm">
            <IconPlus className="size-4" />
            New Snippet
          </Button>
        </Link>
      </div>

      {/* Snippet list */}
      <SnippetList />
    </div>
  );
}
