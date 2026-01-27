"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { IconUsers, IconTrash, IconEdit } from "@tabler/icons-react";
import { toast } from "sonner";

type Member = {
  _id: Id<"orgMembers">;
  role: "owner" | "admin" | "member";
  joinedAt: number;
  invitedBy?: Id<"users">;
  user: {
    _id: Id<"users">;
    username?: string;
    email?: string;
    avatarUrl?: string;
  };
};

function MemberCardSkeleton() {
  return (
    <div className="flex items-center justify-between rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Skeleton className="size-10 rounded-full" />
        <div className="space-y-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <Skeleton className="h-5 w-16" />
    </div>
  );
}

function getRoleBadgeVariant(role: Member["role"]) {
  switch (role) {
    case "owner":
      return "default";
    case "admin":
      return "secondary";
    case "member":
      return "outline";
  }
}

function MemberCard({
  member,
  currentUserRole,
  currentUserId,
  orgId,
}: {
  member: Member;
  currentUserRole?: "owner" | "admin" | "member";
  currentUserId?: Id<"users">;
  orgId: Id<"organizations">;
}) {
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [newRole, setNewRole] = useState<"owner" | "admin" | "member">(member.role);

  const removeMemberMutationFn = useConvexMutation(api.organizations.removeMember);
  const removeMemberMutation = useMutation({
    mutationFn: removeMemberMutationFn,
    onSuccess: () => {
      toast.success("Member removed", {
        description: `${member.user.username || member.user.email} has been removed from the organization.`,
      });
      setShowRemoveDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to remove member", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const updateRoleMutationFn = useConvexMutation(api.organizations.updateMemberRole);
  const updateRoleMutation = useMutation({
    mutationFn: updateRoleMutationFn,
    onSuccess: () => {
      toast.success("Role updated", {
        description: `${member.user.username || member.user.email}'s role has been changed to ${newRole}.`,
      });
      setShowRoleDialog(false);
    },
    onError: (error) => {
      toast.error("Failed to update role", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const isCurrentUser = currentUserId === member.user._id;
  const isOwner = currentUserRole === "owner";
  const isAdmin = currentUserRole === "admin";

  // Can remove: owner can remove anyone except last owner
  // Admin can remove members only (not admins or owners)
  const canRemove =
    !isCurrentUser &&
    ((isOwner && member.role !== "owner") ||
      (isOwner && member.role === "owner") || // owners can remove other owners
      (isAdmin && member.role === "member"));

  // Only owners can change roles
  const canChangeRole = isOwner && !isCurrentUser;

  const handleRemove = () => {
    removeMemberMutation.mutate({
      orgId,
      userId: member.user._id,
    });
  };

  const handleRoleChange = () => {
    if (newRole !== member.role) {
      updateRoleMutation.mutate({
        orgId,
        userId: member.user._id,
        role: newRole,
      });
    } else {
      setShowRoleDialog(false);
    }
  };

  return (
    <>
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex items-center gap-3">
          <Avatar>
            <AvatarImage src={member.user.avatarUrl} alt={member.user.username} />
            <AvatarFallback>
              {(member.user.username || member.user.email || "?").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium">
                {member.user.username || member.user.email}
              </span>
              {isCurrentUser && (
                <span className="text-xs text-muted-foreground">(you)</span>
              )}
            </div>
            {member.user.username && member.user.email && (
              <p className="text-sm text-muted-foreground">{member.user.email}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getRoleBadgeVariant(member.role)}>
            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
          </Badge>
          {canChangeRole && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowRoleDialog(true)}
              title="Change role"
            >
              <IconEdit className="size-4" />
            </Button>
          )}
          {canRemove && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowRemoveDialog(true)}
              title="Remove member"
            >
              <IconTrash className="size-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Remove Confirmation Dialog */}
      <Dialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Member</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{" "}
              <strong>{member.user.username || member.user.email}</strong> from this
              organization? They will lose access to all organization resources.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRemoveDialog(false)}
              disabled={removeMemberMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={removeMemberMutation.isPending}
            >
              {removeMemberMutation.isPending ? "Removing..." : "Remove Member"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Change Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role</DialogTitle>
            <DialogDescription>
              Update the role for{" "}
              <strong>{member.user.username || member.user.email}</strong>.
            </DialogDescription>
          </DialogHeader>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as typeof newRole)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="member">Member</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRoleDialog(false)}
              disabled={updateRoleMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRoleChange}
              disabled={updateRoleMutation.isPending || newRole === member.role}
            >
              {updateRoleMutation.isPending ? "Updating..." : "Update Role"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function MemberList({
  orgId,
  currentUserRole,
  currentUserId,
}: {
  orgId: Id<"organizations">;
  currentUserRole?: "owner" | "admin" | "member";
  currentUserId?: Id<"users">;
}) {
  const { data: members, isLoading } = useQuery(
    convexQuery(api.organizations.getMembers, { orgId })
  );

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <MemberCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconUsers />
          </EmptyMedia>
          <EmptyTitle>No members</EmptyTitle>
          <EmptyDescription>
            This organization has no members yet.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  // Sort: owners first, then admins, then members
  const sortedMembers = [...members].sort((a, b) => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return roleOrder[a.role] - roleOrder[b.role];
  });

  return (
    <div className="space-y-3">
      {sortedMembers.map((member) => (
        <MemberCard
          key={member._id}
          member={member}
          currentUserRole={currentUserRole}
          currentUserId={currentUserId}
          orgId={orgId}
        />
      ))}
    </div>
  );
}
