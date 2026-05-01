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

interface DeleteSnippetButtonProps {
  snippetId: Id<"snippets">;
  snippetName: string;
  redirectAfterDelete?: boolean;
  size?: "icon-sm" | "icon" | "icon-xs";
}

export function DeleteSnippetButton({
  snippetId,
  snippetName,
  redirectAfterDelete = false,
  size = "icon-sm",
}: DeleteSnippetButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteMutationFn = useConvexMutation(api.snippets.remove);
  const deleteMutation = useMutation({
    mutationFn: deleteMutationFn,
    onSuccess: () => {
      posthog.capture("snippet_deleted", {
        snippet_name: snippetName,
      });
      toast.success("Snippet deleted", {
        description: "Your snippet has been permanently deleted.",
      });
      setShowDialog(false);
      queryClient.invalidateQueries({ queryKey: ["snippets"] });
      if (redirectAfterDelete) {
        router.push("/dashboard");
      }
    },
    onError: (error) => {
      posthog.captureException(error);
      toast.error("Failed to delete snippet", {
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
        title="Delete snippet"
      >
        <IconTrash className="size-4" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Snippet</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{snippetName}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id: snippetId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Snippet"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
