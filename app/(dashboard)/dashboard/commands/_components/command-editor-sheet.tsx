"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { CommandEditorLayout } from "../editor/_components/command-editor-layout";

const SHEET_PARAM = "edit";

/**
 * Hosts the command editor in a side sheet. The open state is driven by the
 * `?edit=<id|new>` URL search param so deep links and "Open ↗" jumps from
 * inside the editor route naturally.
 */
export function CommandEditorSheet() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editParam = searchParams.get(SHEET_PARAM);
  const isOpen = editParam !== null;
  const isNew = editParam === "new";
  const editingId = !isNew && editParam ? (editParam as Id<"commands">) : null;

  const reset = useCommandEditorStore((s) => s.reset);
  const loadCommand = useCommandEditorStore((s) => s.loadCommand);
  const convexId = useCommandEditorStore((s) => s.convexId);

  const { data: command } = useQuery(
    convexQuery(
      api.commands.get,
      editingId ? { id: editingId } : "skip",
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

  const close = () => {
    const next = new URLSearchParams(searchParams);
    next.delete(SHEET_PARAM);
    const qs = next.toString();
    router.replace(`/dashboard/commands${qs ? `?${qs}` : ""}`, {
      scroll: false,
    });
  };

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(open: boolean) => {
        if (!open) close();
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
          <CommandEditorLayout onClose={close} isLoading={!isNew && !command} />
        )}
      </SheetContent>
    </Sheet>
  );
}
