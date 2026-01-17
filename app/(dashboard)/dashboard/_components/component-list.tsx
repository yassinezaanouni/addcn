"use client";

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { IconPackage, IconDownload } from "@tabler/icons-react";

function ComponentCardSkeleton() {
  return (
    <Card size="sm">
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  );
}

function ComponentListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ComponentCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ComponentList() {
  const { data: components, isLoading } = useQuery(
    convexQuery(api.components.getMyComponents, {})
  );

  if (isLoading) {
    return <ComponentListSkeleton />;
  }

  if (!components || components.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <IconPackage />
          </EmptyMedia>
          <EmptyTitle>No components yet</EmptyTitle>
          <EmptyDescription>
            Create your first component to get started with your registry.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {components.map((component) => (
        <Card key={component._id} size="sm">
          <CardHeader>
            <CardTitle>{component.title || component.name}</CardTitle>
            {component.description && (
              <CardDescription className="line-clamp-2">
                {component.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="flex items-center gap-2">
            <Badge variant={component.isPublic ? "default" : "secondary"}>
              {component.isPublic ? "Public" : "Private"}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <IconDownload className="size-3" />
              {component.downloads ?? 0}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
