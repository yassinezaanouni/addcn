"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrgContext } from "@/components/org-switcher";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
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
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyMedia,
} from "@/components/ui/empty";
import { IconPackage, IconDownload, IconEye, IconEyeOff, IconPencil } from "@tabler/icons-react";
import Link from "next/link";
import { toast } from "sonner";

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

function ComponentCard({
  component,
  namespace,
}: {
  component: Doc<"components">;
  namespace: string | undefined;
}) {
  const [showPublishDialog, setShowPublishDialog] = useState(false);

  const updateMutationFn = useConvexMutation(api.components.update);
  const updateMutation = useMutation({
    mutationFn: updateMutationFn,
    onError: (error) => {
      toast.error("Failed to update visibility", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const handleVisibilityToggle = () => {
    if (!component.isPublic) {
      // Show confirmation dialog when publishing
      setShowPublishDialog(true);
    } else {
      // Directly unpublish without confirmation
      updateMutation.mutate(
        { id: component._id, isPublic: false },
        {
          onSuccess: () => {
            toast.success("Component unpublished", {
              description: "Your component is now private.",
            });
          },
        }
      );
    }
  };

  const handleConfirmPublish = () => {
    updateMutation.mutate(
      { id: component._id, isPublic: true },
      {
        onSuccess: () => {
          toast.success("Component published", {
            description: "Your component is now publicly accessible.",
          });
        },
      }
    );
    setShowPublishDialog(false);
  };

  // Build the registry URL for the component
  const registryUrl = namespace
    ? `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/r/${namespace}/${component.name}.json`
    : null;

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{component.title || component.name}</CardTitle>
          {component.description && (
            <CardDescription className="line-clamp-2">
              {component.description}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant={component.isPublic ? "default" : "secondary"}>
              {component.isPublic ? "Public" : "Private"}
            </Badge>
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <IconDownload className="size-3" />
              {component.downloads ?? 0}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link href={`/dashboard/editor/${component._id}`}>
              <Button
                variant="ghost"
                size="icon-sm"
                title="Edit component"
              >
                <IconPencil className="size-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleVisibilityToggle}
              disabled={updateMutation.isPending}
              title={component.isPublic ? "Make private" : "Make public"}
            >
              {component.isPublic ? (
                <IconEyeOff className="size-4" />
              ) : (
                <IconEye className="size-4" />
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Component</DialogTitle>
            <DialogDescription>
              Publishing this component will make it publicly accessible. Anyone with the
              link will be able to install it using the shadcn CLI.
            </DialogDescription>
          </DialogHeader>
          {registryUrl && (
            <div className="rounded-md bg-muted p-3 font-mono text-sm break-all">
              npx shadcn@latest add {registryUrl}
            </div>
          )}
          <DialogFooter showCloseButton>
            <Button
              onClick={handleConfirmPublish}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Publishing..." : "Publish Component"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ComponentList() {
  const context = useOrgContext();

  // Convert OrgContext to query-compatible format
  const queryContext: "personal" | Id<"organizations"> | undefined =
    context === "personal" ? "personal" : context;

  const { data: components, isLoading: componentsLoading } = useQuery(
    convexQuery(api.components.getMyComponentsFiltered, { context: queryContext })
  );

  const { data: user } = useQuery(convexQuery(api.users.getMe, {}));
  const { data: orgs } = useQuery(convexQuery(api.organizations.getMyOrgs, {}));

  if (componentsLoading) {
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

  // Helper to get the namespace for a component
  const getNamespace = (component: Doc<"components">): string | undefined => {
    if (component.userId) {
      return user?.username;
    }
    if (component.orgId && orgs) {
      const org = orgs.find((o) => o._id === component.orgId);
      return org?.slug;
    }
    return undefined;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {components.map((component) => (
        <ComponentCard
          key={component._id}
          component={component}
          namespace={getNamespace(component)}
        />
      ))}
    </div>
  );
}
