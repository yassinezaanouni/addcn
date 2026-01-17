import Link from "next/link";
import { ComponentList } from "./_components/component-list";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Components</h1>
          <p className="mt-1 text-muted-foreground">
            Manage your registry components
          </p>
        </div>
        <Link href="/dashboard/editor">
          <Button size="sm">
            <IconPlus className="size-4" />
            New Component
          </Button>
        </Link>
      </div>
      <ComponentList />
    </div>
  );
}
