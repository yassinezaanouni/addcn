"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  IconPackage,
  IconDownload,
  IconUser,
  IconCalendar,
} from "@tabler/icons-react";
import Link from "next/link";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
  });
}

function ProfileSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8 flex items-center gap-4">
        <Skeleton className="size-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <Skeleton className="mb-4 h-6 w-40" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card size="sm" key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="mt-1 h-4 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ComponentCard({ component }: { component: Doc<"components"> }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{component.title || component.name}</CardTitle>
        {component.description && (
          <CardDescription className="line-clamp-2">
            {component.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Badge variant="default">Public</Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconDownload className="size-3" />
          {component.downloads ?? 0}
        </span>
      </CardContent>
    </Card>
  );
}

function NotFound() {
  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] max-w-4xl items-center justify-center px-4 py-8">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconUser />
          </EmptyMedia>
          <EmptyTitle>User not found</EmptyTitle>
          <EmptyDescription>
            The user you are looking for does not exist.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    </div>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  // Fetch user profile
  const { data: user, isLoading: isUserLoading } = useQuery(
    convexQuery(api.users.getByUsername, { username }),
  );

  // Fetch public components - only when we have a user ID
  const userId = user?._id as Id<"users"> | undefined;
  const { data: components, isLoading: isComponentsLoading } = useQuery({
    ...convexQuery(
      api.components.getPublicByUserId,
      userId ? { userId } : "skip",
    ),
    enabled: !!userId,
  });

  // Loading state
  if (isUserLoading) {
    return <ProfileSkeleton />;
  }

  // User not found
  if (!user) {
    return <NotFound />;
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Profile Header */}
      <div className="mb-8 flex items-center gap-4">
        <Avatar className="size-20">
          {user.avatarUrl ? (
            <AvatarImage src={user.avatarUrl} alt={user.username} />
          ) : null}
          <AvatarFallback className="text-2xl">
            {user.username.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <h1 className="text-2xl font-bold">@{user.username}</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <IconCalendar className="size-4" />
            Joined {formatDate(user.createdAt)}
          </p>
        </div>
      </div>

      {/* Components Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Public Components
          {components && components.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({components.length})
            </span>
          )}
        </h2>

        {isComponentsLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Card size="sm" key={i}>
                <CardHeader>
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="mt-1 h-4 w-48" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !components || components.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconPackage />
              </EmptyMedia>
              <EmptyTitle>No public components</EmptyTitle>
              <EmptyDescription>
                This user has not published any components yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {components.map((component) => (
              <Link key={component._id} href={`/${username}/${component.name}`}>
                <ComponentCard component={component} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
