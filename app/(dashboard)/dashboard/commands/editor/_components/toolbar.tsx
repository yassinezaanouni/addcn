"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
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
import {
  IconArrowLeft,
  IconDeviceFloppy,
  IconLoader2,
} from "@tabler/icons-react";
import { toast } from "sonner";
import { stepsAreReady } from "@/lib/command-utils";

export function Toolbar() {
  const router = useRouter();
  const isNew = useIsNewCommand();
  const context = useOrgContext();

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
      toast.success("Command created");
      router.push("/dashboard/commands");
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
      toast.success("Command saved");
      router.push("/dashboard/commands");
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
    <div className="relative z-10 flex h-14 items-center justify-between">
      <div className="flex items-center gap-4">
        <Tooltip>
          <TooltipTrigger
            className="flex size-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            onClick={() => router.push("/dashboard/commands")}
          >
            <IconArrowLeft className="size-5" />
          </TooltipTrigger>
          <TooltipContent side="bottom">Back to commands</TooltipContent>
        </Tooltip>

        <div className="flex items-center gap-3">
          <motion.h1
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-lg font-semibold tracking-tight"
          >
            {name || "Untitled"}
          </motion.h1>
          {isDirty && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-600 dark:text-amber-400"
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
          className="gap-2 rounded-lg px-4 font-medium"
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
