"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { IconSend } from "@tabler/icons-react";
import { toast } from "sonner";

export function InviteForm({ orgId }: { orgId: Id<"organizations"> }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "member">("member");
  const [error, setError] = useState<string | null>(null);

  const createInviteMutationFn = useConvexMutation(
    api.organizations.createInvite,
  );
  const createInviteMutation = useMutation({
    mutationFn: createInviteMutationFn,
    onSuccess: () => {
      posthog.capture("organization_invite_sent", {
        invited_role: role,
      });
      toast.success("Invitation sent", {
        description: `An invitation has been sent to ${email}.`,
      });
      setEmail("");
      setRole("member");
      setError(null);
    },
    onError: (err) => {
      posthog.captureException(err);
      setError(
        err instanceof Error ? err.message : "Failed to send invitation",
      );
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    createInviteMutation.mutate({
      orgId,
      email: email.trim().toLowerCase(),
      role,
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1 space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="colleague@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              disabled={createInviteMutation.isPending}
            />
          </div>
          <div className="w-full sm:w-32 space-y-2">
            <Label htmlFor="role">Role</Label>
            <Select
              value={role}
              onValueChange={(v) => setRole(v as typeof role)}
              disabled={createInviteMutation.isPending}
            >
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            type="submit"
            disabled={createInviteMutation.isPending || !email.trim()}
          >
            <IconSend className="mr-2 size-4" />
            {createInviteMutation.isPending ? "Sending..." : "Send Invite"}
          </Button>
        </form>
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
