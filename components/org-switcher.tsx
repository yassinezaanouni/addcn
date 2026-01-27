"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { IconUser, IconBuilding, IconSelector } from "@tabler/icons-react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";

export type OrgContext = "personal" | Id<"organizations">;

export function useOrgContext(): OrgContext {
  const searchParams = useSearchParams();
  const contextParam = searchParams.get("context");

  // "personal" or a valid org ID
  if (contextParam === "personal") {
    return "personal";
  }

  // If it looks like an org ID (starts with common Convex ID patterns)
  if (contextParam && contextParam.length > 0) {
    return contextParam as Id<"organizations">;
  }

  // Default to personal context
  return "personal";
}

export function OrgSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = useOrgContext();

  const { data: user, isPending: userPending } = useQuery(
    convexQuery(api.users.getMe, {})
  );

  const { data: orgs, isPending: orgsPending } = useQuery(
    convexQuery(api.organizations.getMyOrgs, {})
  );

  const isLoading = userPending || orgsPending;

  // Find the current selected org if context is an org ID
  const selectedOrg =
    context !== "personal" && orgs
      ? orgs.find((org) => org._id === context)
      : null;

  const handleContextChange = (newContext: OrgContext) => {
    const params = new URLSearchParams(searchParams.toString());

    if (newContext === "personal") {
      params.delete("context");
    } else {
      params.set("context", newContext);
    }

    const queryString = params.toString();
    const newPath = queryString ? `${pathname}?${queryString}` : pathname;
    router.push(newPath);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Skeleton className="size-6 rounded" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }

  const displayName = selectedOrg ? selectedOrg.name : "Personal";
  const displayIcon = selectedOrg ? (
    <Avatar className="size-6 rounded">
      <AvatarImage src={selectedOrg.avatarUrl} alt={selectedOrg.name} />
      <AvatarFallback className="rounded text-xs">
        {selectedOrg.name.charAt(0).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  ) : (
    <div className="flex size-6 items-center justify-center rounded bg-muted">
      <IconUser className="size-4" />
    </div>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="flex items-center gap-2 px-2" />}
      >
        {displayIcon}
        <span className="text-sm font-medium">{displayName}</span>
        <IconSelector className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        {/* Personal option */}
        <DropdownMenuItem
          onClick={() => handleContextChange("personal")}
          className="flex cursor-pointer items-center gap-2"
        >
          <div className="flex size-6 items-center justify-center rounded bg-muted">
            <IconUser className="size-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium">Personal</span>
            <span className="text-xs text-muted-foreground">
              @{user?.username}
            </span>
          </div>
          {context === "personal" && (
            <span className="ml-auto text-xs text-primary">Selected</span>
          )}
        </DropdownMenuItem>

        {/* Orgs section */}
        {orgs && orgs.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              Organizations
            </div>
            {orgs.map((org) => (
              <DropdownMenuItem
                key={org._id}
                onClick={() => handleContextChange(org._id)}
                className="flex cursor-pointer items-center gap-2"
              >
                <Avatar className="size-6 rounded">
                  <AvatarImage src={org.avatarUrl} alt={org.name} />
                  <AvatarFallback className="rounded text-xs">
                    {org.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{org.name}</span>
                  <span className="text-xs text-muted-foreground">
                    @{org.slug}
                  </span>
                </div>
                {context === org._id && (
                  <span className="ml-auto text-xs text-primary">Selected</span>
                )}
              </DropdownMenuItem>
            ))}
          </>
        )}

        {/* No orgs message */}
        {(!orgs || orgs.length === 0) && (
          <>
            <DropdownMenuSeparator />
            <div className="flex items-center gap-2 px-2 py-2 text-xs text-muted-foreground">
              <IconBuilding className="size-4" />
              <span>No organizations yet</span>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
