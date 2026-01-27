"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { IconMail, IconX, IconClock } from "@tabler/icons-react";
import { toast } from "sonner";

type PendingInvite = {
  _id: Id<"invites">;
  email: string;
  role: "admin" | "member";
  expiresAt: number;
  createdAt: number;
  invitedBy: {
    _id: Id<"users">;
    username?: string;
    avatarUrl?: string;
  } | null;
};

function InviteCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="space-y-1">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-8 w-8" />
    </div>
  );
}

function formatTimeRemaining(expiresAt: number): string {
  const now = Date.now();
  const remaining = expiresAt - now;

  if (remaining <= 0) {
    return "Expired";
  }

  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor(
    (remaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
  );

  if (days > 0) {
    return `${days}d ${hours}h remaining`;
  }
  if (hours > 0) {
    return `${hours}h remaining`;
  }
  return "Less than 1h remaining";
}

function InviteCard({ invite }: { invite: PendingInvite }) {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const cancelInviteMutationFn = useConvexMutation(
    api.organizations.cancelInvite,
  );
  const cancelInviteMutation = useMutation({
    mutationFn: cancelInviteMutationFn,
    onSuccess: () => {
      toast.success("Invitation cancelled", {
        description: `The invitation to ${invite.email} has been cancelled.`,
      });
      setShowCancelDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to cancel invitation", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const handleCancel = () => {
    cancelInviteMutation.mutate({ inviteId: invite._id });
  };

  const getRoleBadgeVariant = (role: PendingInvite["role"]) => {
    return role === "admin" ? "secondary" : "outline";
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{invite.email}</span>
            <Badge variant={getRoleBadgeVariant(invite.role)}>
              {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
            <IconClock className="size-3" />
            {formatTimeRemaining(invite.expiresAt)}
            {invite.invitedBy?.username && (
              <span className="ml-2">
                • Invited by @{invite.invitedBy.username}
              </span>
            )}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setShowCancelDialog(true)}
          title="Cancel invitation"
        >
          <IconX className="size-4" />
        </Button>
      </div>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Invitation</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel the invitation to{" "}
              <strong>{invite.email}</strong>? The invitation link will no
              longer work.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
              disabled={cancelInviteMutation.isPending}
            >
              Keep Invitation
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelInviteMutation.isPending}
            >
              {cancelInviteMutation.isPending
                ? "Cancelling..."
                : "Cancel Invitation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PendingInvites({ orgId }: { orgId: Id<"organizations"> }) {
  const { data: invites, isLoading } = useQuery(
    convexQuery(api.organizations.getPendingInvites, { orgId }),
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <InviteCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!invites || invites.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconMail />
          </EmptyMedia>
          <EmptyTitle>No pending invitations</EmptyTitle>
          <EmptyDescription>
            Send an invitation above to add new team members.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Sort by creation time, newest first
  const sortedInvites = [...invites].sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div className="space-y-3">
      {sortedInvites.map((invite) => (
        <InviteCard key={invite._id} invite={invite} />
      ))}
    </div>
  );
}
