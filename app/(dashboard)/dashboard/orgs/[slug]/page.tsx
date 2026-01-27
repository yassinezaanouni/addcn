"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { IconArrowLeft, IconSettings } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

function getRoleBadgeVariant(role: "owner" | "admin" | "member") {
  switch (role) {
    case "owner":
      return "default";
    case "admin":
      return "secondary";
    case "member":
      return "outline";
  }
}

export default function OrgDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: org, isLoading: orgLoading } = useQuery(
    convexQuery(api.organizations.getBySlug, { slug }),
  );

  // Get user's role in this org
  const { data: myOrgs } = useQuery(
    convexQuery(api.organizations.getMyOrgs, {}),
  );
  const myOrgWithRole = myOrgs?.find((o) => o.slug === slug);
  const myRole = myOrgWithRole?.role;

  // Only admins and owners can access settings
  const canAccessSettings = myRole === "admin" || myRole === "owner";

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-medium">Organization not found</h2>
        <p className="text-muted-foreground">
          The organization you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/dashboard/orgs">
          <Button variant="outline" className="mt-4">
            <IconArrowLeft className="mr-2 size-4" />
            Back to Organizations
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/orgs">
            <Button variant="ghost" size="icon">
              <IconArrowLeft className="size-5" />
            </Button>
          </Link>
          <Avatar className="size-16 rounded-lg">
            <AvatarImage src={org.avatarUrl} alt={org.name} />
            <AvatarFallback className="rounded-lg text-xl">
              {org.name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{org.name}</h1>
              {myRole && (
                <Badge variant={getRoleBadgeVariant(myRole)}>
                  {myRole.charAt(0).toUpperCase() + myRole.slice(1)}
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground">@{org.slug}</p>
          </div>
        </div>
        {canAccessSettings && (
          <Link href={`/dashboard/orgs/${slug}/settings`}>
            <Button variant="outline">
              <IconSettings className="mr-2 size-4" />
              Settings
            </Button>
          </Link>
        )}
      </div>

      {/* Org content placeholder */}
      <div className="rounded-lg border p-8 text-center text-muted-foreground">
        <p>Organization components and content will appear here.</p>
      </div>
    </div>
  );
}
