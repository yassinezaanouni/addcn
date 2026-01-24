"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
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

interface DeleteComponentButtonProps {
  componentId: Id<"components">;
  componentName: string;
  redirectAfterDelete?: boolean;
  size?: "icon-sm" | "icon" | "icon-xs";
}

export function DeleteComponentButton({
  componentId,
  componentName,
  redirectAfterDelete = false,
  size = "icon-sm",
}: DeleteComponentButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const deleteMutationFn = useConvexMutation(api.components.remove);
  const deleteMutation = useMutation({
    mutationFn: deleteMutationFn,
    onSuccess: () => {
      toast.success("Component deleted", {
        description: "Your component has been permanently deleted.",
      });
      setShowDialog(false);
      queryClient.invalidateQueries({ queryKey: ["components"] });
      if (redirectAfterDelete) {
        router.push("/dashboard");
      }
    },
    onError: (error) => {
      toast.error("Failed to delete component", {
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
        title="Delete component"
      >
        <IconTrash className="size-4" />
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Component</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{componentName}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate({ id: componentId })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Component"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
