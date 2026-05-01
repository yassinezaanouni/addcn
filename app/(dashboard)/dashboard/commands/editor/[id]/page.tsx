"use client";

import { use, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { CommandEditorLayout } from "../_components/command-editor-layout";
import { Skeleton } from "@/components/ui/skeleton";

interface EditCommandPageProps {
  params: Promise<{ id: string }>;
}

export default function EditCommandPage({ params }: EditCommandPageProps) {
  const { id } = use(params);
  const commandId = id as Id<"commands">;
  const loadCommand = useCommandEditorStore((s) => s.loadCommand);
  const convexId = useCommandEditorStore((s) => s.convexId);

  const { data: command, isLoading } = useQuery(
    convexQuery(api.commands.get, { id: commandId }),
  );

  useEffect(() => {
    if (command && convexId !== command._id) {
      loadCommand(command);
    }
  }, [command, convexId, loadCommand]);

  if (isLoading) {
    return (
      <div className="flex h-full flex-col gap-4 p-4">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[150px] w-full" />
      </div>
    );
  }

  if (!command) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Command not found</h1>
          <p className="mt-2 text-muted-foreground">
            The command you&apos;re looking for doesn&apos;t exist or you
            don&apos;t have access.
          </p>
        </div>
      </div>
    );
  }

  return <CommandEditorLayout />;
}
