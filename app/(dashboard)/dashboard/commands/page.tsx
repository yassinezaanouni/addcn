"use client";

import { CommandList } from "./_components/command-list";
import { CommandEditorSheet } from "./_components/command-editor-sheet";
import {
  CommandEditorProvider,
  useCommandEditor,
} from "./_components/command-editor-context";
import { Button } from "@/components/ui/button";
import { IconPlus } from "@tabler/icons-react";

function NewCommandButton() {
  const { open } = useCommandEditor();
  return (
    <Button
      onClick={() => open("new")}
      className="gap-2 font-mono text-sm"
    >
      <IconPlus className="size-4" />
      New Command
    </Button>
  );
}

export default function CommandsPage() {
  return (
    <CommandEditorProvider>
      <div className="flex h-full flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-mono text-xl font-semibold tracking-tight">
            Commands
          </h1>
          <NewCommandButton />
        </div>

        <CommandList />

        <CommandEditorSheet />
      </div>
    </CommandEditorProvider>
  );
}
