"use client";

import { useParams, notFound } from "next/navigation";
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
import { IconPackage, IconDownload, IconCalendar } from "@tabler/icons-react";
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

function SnippetCard({ snippet }: { snippet: Doc<"snippets"> }) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{snippet.title || snippet.name}</CardTitle>
        {snippet.description && (
          <CardDescription className="line-clamp-2">
            {snippet.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Badge variant="default">Public</Badge>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <IconDownload className="size-3" />
          {snippet.downloads ?? 0}
        </span>
      </CardContent>
    </Card>
  );
}

export default function PublicProfilePage() {
  const params = useParams();
  const username = params.username as string;

  // Fetch user profile
  const { data: user, isLoading: isUserLoading } = useQuery(
    convexQuery(api.users.getByUsername, { username }),
  );

  // Fetch public snippets - only when we have a user ID
  const userId = user?._id as Id<"users"> | undefined;
  const { data: snippets, isLoading: isSnippetsLoading } = useQuery({
    ...convexQuery(
      api.snippets.getPublicByUserId,
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
    notFound();
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

      {/* Snippets Section */}
      <div>
        <h2 className="mb-4 text-lg font-semibold">
          Public Snippets
          {snippets && snippets.length > 0 && (
            <span className="ml-2 text-sm font-normal text-muted-foreground">
              ({snippets.length})
            </span>
          )}
        </h2>

        {isSnippetsLoading ? (
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
        ) : !snippets || snippets.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconPackage />
              </EmptyMedia>
              <EmptyTitle>No public snippets</EmptyTitle>
              <EmptyDescription>
                This user has not published any snippets yet.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snippets.map((snippet) => (
              <Link key={snippet._id} href={`/${username}/${snippet.name}`}>
                <SnippetCard snippet={snippet} />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
