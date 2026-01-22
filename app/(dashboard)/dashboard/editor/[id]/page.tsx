"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { IconArrowLeft, IconPlus } from "@tabler/icons-react";

interface EditComponentPageProps {
  params: Promise<{ id: string }>;
}

export default function EditComponentPage({ params }: EditComponentPageProps) {
  const { id } = use(params);
  const componentId = id as Id<"components">;

  const { data: component, isLoading } = useQuery(
    convexQuery(api.components.get, { id: componentId })
  );

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] flex-col">
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-8 w-20" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <Skeleton className="h-32 w-64" />
        </div>
      </div>
    );
  }

  if (!component) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Component not found</h1>
          <p className="mt-2 text-muted-foreground">
            The component you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-4">
              <IconArrowLeft className="size-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // For now, editing existing components in sandbox mode is not yet supported
  // TODO: Create/link sandbox for existing components
  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Edit: {component.title || component.name}</h1>
        <p className="mt-2 text-muted-foreground">
          Editing existing components in sandbox mode is coming soon.
          For now, you can create a new sandbox to work on components.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline">
              <IconArrowLeft className="size-4" />
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/dashboard/sandbox/new">
            <Button>
              <IconPlus className="size-4" />
              Create New Sandbox
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
