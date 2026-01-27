import Link from "next/link";
import { ComponentList } from "./_components/component-list";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export default function DashboardPage() {
  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-mono text-xl font-semibold tracking-tight">
            Components
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and publish your registry components
          </p>
        </div>
        <Link href="/dashboard/editor">
          <Button className="gap-2 font-mono text-sm">
            <IconPlus className="size-4" />
            New Component
          </Button>
        </Link>
      </div>

      {/* Component list */}
      <ComponentList />
    </div>
  );
}
