"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { motion } from "motion/react";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";
import {
  useCommandEditorStore,
  useIsNewCommand,
} from "@/stores/command-editor-store";
import { useOrgContext } from "@/components/org-switcher";
import { Button } from "@/components/ui/button";
import { DeleteCommandButton } from "../../_components/delete-command-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IconDeviceFloppy, IconLoader2, IconX } from "@tabler/icons-react";
import { toast } from "sonner";
import { stepsAreReady } from "@/lib/command-utils";

interface ToolbarProps {
  onClose: () => void;
}

export function Toolbar({ onClose }: ToolbarProps) {
  const isNew = useIsNewCommand();
  const context = useOrgContext();
  const queryClient = useQueryClient();

  const {
    convexId,
    name,
    description,
    steps,
    tags,
    isDirty,
    setIsDirty,
  } = useCommandEditorStore();

  const createMutationFn = useConvexMutation(api.commands.create);
  const updateMutationFn = useConvexMutation(api.commands.update);

  const createMutation = useMutation({
    mutationFn: createMutationFn,
    onSuccess: () => {
      posthog.capture("command_created", {
        command_name: name,
        steps_count: steps.length,
        tags_count: tags.length,
        is_org_command: context !== "personal",
      });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["commands"] });
      toast.success("Command created");
      onClose();
    },
    onError: (error) => {
      posthog.captureException(error);
      toast.error("Failed to create command", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: updateMutationFn,
    onSuccess: () => {
      posthog.capture("command_updated", {
        command_name: name,
        steps_count: steps.length,
        tags_count: tags.length,
        is_org_command: context !== "personal",
      });
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ["commands"] });
      toast.success("Command saved");
      onClose();
    },
    onError: (error) => {
      posthog.captureException(error);
      toast.error("Failed to save command", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const canSave = name.trim().length > 0 && stepsAreReady(steps);

  const handleSave = () => {
    if (!canSave || isSaving) return;
    if (isNew) {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim(),
        steps,
        tags,
        orgId: context === "personal" ? undefined : context,
        isPublic: false,
      });
    } else if (convexId) {
      updateMutation.mutate({
        id: convexId,
        name: name.trim(),
        description: description.trim(),
        steps,
        tags,
      });
    }
  };

  return (
    <div className="relative z-10 flex h-12 items-center justify-between border-b border-border/40 px-1 pb-3">
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={onClose}
          >
            <IconX className="size-4" />
          </TooltipTrigger>
          <TooltipContent side="bottom">Close</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-2">
          <motion.h1
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-base font-semibold tracking-tight"
          >
            {name || (isNew ? "New command" : "Untitled")}
          </motion.h1>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400"
            >
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
              </span>
              Unsaved
            </motion.div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {!isNew && convexId && (
          <DeleteCommandButton
            commandId={convexId}
            commandName={name}
            redirectAfterDelete
          />
        )}
        <Button
          onClick={handleSave}
          disabled={!canSave || isSaving}
          size="sm"
          className="gap-2 font-medium"
        >
          {isSaving ? (
            <IconLoader2 className="size-4 animate-spin" />
          ) : (
            <IconDeviceFloppy className="size-4" />
          )}
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
