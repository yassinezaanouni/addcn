"use client";

import Link from "next/link";
import { IconPlus } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { OrgList } from "./_components/org-list";

export default function OrgsPage() {
  return (
    <div className="gap-8 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Organizations</h1>
          <p className="text-muted-foreground">
            Manage your organizations and team collaboration.
          </p>
        </div>
        <Link href="/dashboard/orgs/new">
          <Button>
            <IconPlus className="mr-2 size-4" />
            Create Organization
          </Button>
        </Link>
      </div>

      <OrgList />
    </div>
  );
}
