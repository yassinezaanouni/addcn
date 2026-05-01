"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IconTrash } from "@tabler/icons-react";
import { toast } from "sonner";

interface DeleteCommandButtonProps {
  commandId: Id<"commands">;
  commandName: string;
  redirectAfterDelete?: boolean;
  size?: "icon-sm" | "icon" | "icon-xs";
}

export function DeleteCommandButton({
  commandId,
  commandName,
  redirectAfterDelete = false,
  size = "icon-sm",
}: DeleteCommandButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteMutationFn = useConvexMutation(api.commands.remove);
  const deleteMutation = useMutation({
    mutationFn: deleteMutationFn,
    onSuccess: () => {
      posthog.capture("command_deleted", { command_name: commandName });
      toast.success("Command deleted");
      setShowDialog(false);
      queryClient.invalidateQueries({ queryKey: ["commands"] });
      if (redirectAfterDelete) router.push("/dashboard/commands");
    },
    onError: (error) => {
      posthog.captureException(error);
      toast.error("Failed to delete command", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  return (
    <>
      <Button
        variant="destructive"
        size={size}
        onClick={() => setShowDialog(true)}
        title="Delete command"
      >
        <IconTrash className="size-4" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Command</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{commandName}&quot;? Other
              commands that reference this one will show a broken-reference
              placeholder until you update them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id: commandId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Command"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
