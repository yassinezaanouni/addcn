"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import {
  IconSettings,
  IconLogout,
  IconLayoutDashboard,
  IconUser,
} from "@tabler/icons-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

export function UserDropdown() {
  const router = useRouter();

  // Check session (Better Auth) - tells us if they're signed in
  const { data: sessionData, isPending: isSessionPending } =
    authClient.useSession();

  // Check user profile (Convex) - tells us if they've completed onboarding
  const { data: user, isPending: isUserPending } = useQuery({
    ...convexQuery(api.users.getMe, {}),
    enabled: !!sessionData?.session,
  });

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/");
  };

  // Loading state
  if (isSessionPending) {
    return <Skeleton className="size-9 rounded-full" />;
  }

  // Not signed in
  if (!sessionData?.session) {
    return (
      <Link href="/login">
        <Button size="sm">Sign in</Button>
      </Link>
    );
  }

  // Signed in but still loading user profile
  if (isUserPending) {
    return <Skeleton className="size-9 rounded-full" />;
  }

  // Signed in but hasn't completed onboarding (no username)
  const hasCompletedOnboarding = !!user?.username;
  const displayName = user?.username ? `@${user.username}` : "Complete setup";
  const displayEmail = user?.email ?? sessionData.user?.email ?? "";
  const avatarUrl = user?.avatarUrl ?? sessionData.user?.image ?? undefined;
  const avatarFallback = user?.username?.charAt(0).toUpperCase() ??
    sessionData.user?.name?.charAt(0).toUpperCase() ?? "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="ghost" className="relative size-9 rounded-full" />
        }
      >
        <Avatar className="size-9">
          <AvatarImage src={avatarUrl} alt={displayName} />
          <AvatarFallback>{avatarFallback}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" sideOffset={8}>
        <DropdownMenuGroup>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{displayEmail}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {hasCompletedOnboarding ? (
            <>
              <DropdownMenuItem render={<Link href="/dashboard" />}>
                <IconLayoutDashboard className="mr-2 size-4" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
                <IconSettings className="mr-2 size-4" />
                Settings
              </DropdownMenuItem>
            </>
          ) : (
            <DropdownMenuItem render={<Link href="/onboarding" />}>
              <IconUser className="mr-2 size-4" />
              Complete setup
            </DropdownMenuItem>
          )}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-destructive focus:text-destructive"
        >
          <IconLogout className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
