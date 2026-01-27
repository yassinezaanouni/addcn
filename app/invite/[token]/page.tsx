"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconAlertCircle, IconCheck, IconBuilding } from "@tabler/icons-react";
import { toast } from "sonner";
import { useEffect } from "react";

function getRoleBadgeVariant(
  role: "owner" | "admin" | "member",
): "default" | "secondary" | "outline" {
  switch (role) {
    case "owner":
      return "default";
    case "admin":
      return "secondary";
    case "member":
      return "outline";
  }
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  // Check auth state
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();

  // Fetch invite details
  const { data: invite, isLoading: isInviteLoading } = useQuery(
    convexQuery(api.organizations.getInviteByToken, { token }),
  );

  // Accept invite mutation
  const acceptInviteMutation = useConvexMutation(
    api.organizations.acceptInvite,
  );
  const { mutate: acceptInvite, isPending: isAccepting } = useMutation({
    mutationFn: acceptInviteMutation,
    onSuccess: () => {
      // Use invite data we already have for success message and navigation
      if (invite) {
        toast.success(`You've joined ${invite.org.name}!`);
        router.push(`/dashboard/orgs/${invite.org.slug}`);
      }
    },
    onError: (err) => {
      toast.error(err.message || "Failed to accept invite");
    },
  });

  // Redirect to login if not authenticated (after session check completes)
  useEffect(() => {
    if (!isSessionPending && !session) {
      // Encode the return URL so user comes back after login
      const returnUrl = `/invite/${token}`;
      router.push(`/login?callbackUrl=${encodeURIComponent(returnUrl)}`);
    }
  }, [isSessionPending, session, router, token]);

  const handleAccept = () => {
    acceptInvite({ token });
  };

  // Loading state
  if (isSessionPending || isInviteLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Skeleton className="mx-auto h-6 w-48" />
            <Skeleton className="mx-auto mt-2 h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Skeleton className="size-12 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not authenticated - show redirecting message
  if (!session) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Redirecting to login...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid or expired invite
  if (!invite) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-destructive/10">
              <IconAlertCircle className="size-6 text-destructive" />
            </div>
            <CardTitle className="text-xl">Invalid or Expired Invite</CardTitle>
            <CardDescription>
              This invite link is no longer valid. It may have expired or
              already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invite - show details and accept button
  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">You&apos;re Invited!</CardTitle>
          <CardDescription>
            {invite.invitedBy?.username
              ? `@${invite.invitedBy.username} has invited you to join`
              : "You have been invited to join"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Organization Info */}
          <div className="flex items-center gap-4 rounded-lg border p-4">
            <Avatar className="size-12 rounded-lg">
              {invite.org.avatarUrl ? (
                <AvatarImage src={invite.org.avatarUrl} alt={invite.org.name} />
              ) : null}
              <AvatarFallback className="rounded-lg">
                <IconBuilding className="size-6" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-medium">{invite.org.name}</p>
              <p className="text-sm text-muted-foreground">
                @{invite.org.slug}
              </p>
            </div>
          </div>

          {/* Role Badge */}
          <div className="text-center">
            <p className="mb-2 text-sm text-muted-foreground">
              You will join as
            </p>
            <Badge
              variant={getRoleBadgeVariant(invite.role)}
              className="capitalize"
            >
              {invite.role}
            </Badge>
          </div>

          {/* Accept Button */}
          <Button
            className="w-full"
            onClick={handleAccept}
            disabled={isAccepting}
          >
            {isAccepting ? (
              <span className="animate-pulse">Accepting...</span>
            ) : (
              <>
                <IconCheck className="size-4" />
                Accept Invite
              </>
            )}
          </Button>

          {/* Decline/Cancel */}
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => router.push("/dashboard")}
            disabled={isAccepting}
          >
            Decline
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
