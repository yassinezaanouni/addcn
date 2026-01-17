"use client";

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import Link from "next/link";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { IconBuilding, IconUsers } from "@tabler/icons-react";

type OrgWithRole = Doc<"organizations"> & { role: "owner" | "admin" | "member" };

function OrgCardSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Skeleton className="size-10 rounded-lg" />
          <div className="space-y-1">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Skeleton className="h-5 w-16" />
      </CardContent>
    </Card>
  );
}

function OrgListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <OrgCardSkeleton key={i} />
      ))}
    </div>
  );
}

function getRoleBadgeVariant(role: OrgWithRole["role"]) {
  switch (role) {
    case "owner":
      return "default";
    case "admin":
      return "secondary";
    case "member":
      return "outline";
  }
}

function OrgCard({ org }: { org: OrgWithRole }) {
  return (
    <Link href={`/dashboard/orgs/${org.slug}`}>
      <Card size="sm" className="transition-colors hover:bg-muted/50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Avatar className="size-10 rounded-lg">
              <AvatarImage src={org.avatarUrl} alt={org.name} />
              <AvatarFallback className="rounded-lg">
                {org.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <CardTitle className="truncate">{org.name}</CardTitle>
              <CardDescription className="truncate">@{org.slug}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant={getRoleBadgeVariant(org.role)}>
            {org.role.charAt(0).toUpperCase() + org.role.slice(1)}
          </Badge>
        </CardContent>
      </Card>
    </Link>
  );
}

export function OrgList() {
  const { data: orgs, isLoading } = useQuery(
    convexQuery(api.organizations.getMyOrgs, {})
  );

  if (isLoading) {
    return <OrgListSkeleton />;
  }

  if (!orgs || orgs.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconBuilding />
          </EmptyMedia>
          <EmptyTitle>No organizations yet</EmptyTitle>
          <EmptyDescription>
            Create an organization to collaborate with your team on shared
            components.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {orgs.map((org) => (
        <OrgCard key={org._id} org={org} />
      ))}
    </div>
  );
}
