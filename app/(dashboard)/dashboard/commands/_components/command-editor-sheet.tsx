"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { CommandEditorLayout } from "../editor/_components/command-editor-layout";
import { useCommandEditor } from "./command-editor-context";

/**
 * Hosts the command editor in a side sheet. Open state is plain React state
 * (managed by CommandEditorProvider); the URL reflects it via
 * window.history.replaceState. We deliberately do NOT use Next's router /
 * useSearchParams for this — those would trigger RSC refetches on every
 * toggle.
 */
export function CommandEditorSheet() {
  const { editingId, close } = useCommandEditor();
  const isOpen = editingId !== null;
  const isNew = editingId === "new";

  const reset = useCommandEditorStore((s) => s.reset);
  const loadCommand = useCommandEditorStore((s) => s.loadCommand);
  const convexId = useCommandEditorStore((s) => s.convexId);

  const { data: command } = useQuery(
    convexQuery(
      api.commands.get,
      editingId && editingId !== "new" ? { id: editingId } : "skip",
    ),
  );

  // When the URL flips to "new", reset the store. When it flips to an id and
  // the command data arrives, load it. Same shape as the snippet edit page.
  useEffect(() => {
    if (isOpen && isNew) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isNew]);

  useEffect(() => {
    if (command && convexId !== command._id) {
      loadCommand(command);
    }
  }, [command, convexId, loadCommand]);

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(nextOpen: boolean) => {
        if (!nextOpen) close();
      }}
    >
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full max-w-full p-0 sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl"
      >
        <SheetTitle className="sr-only">
          {isNew ? "New command" : "Edit command"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Save a CLI command or build a workflow by chaining steps with shell
          operators.
        </SheetDescription>
        {isOpen && (
          <CommandEditorLayout
            onClose={close}
            isLoading={!isNew && !command}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
