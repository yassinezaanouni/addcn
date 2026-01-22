"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrgContext } from "@/components/org-switcher";
import { useRegistryToken } from "@/hooks/use-registry-token";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
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
import {
  IconPackage,
  IconDownload,
  IconEye,
  IconEyeOff,
  IconPencil,
  IconCopy,
  IconCheck,
  IconTrash,
} from "@tabler/icons-react";
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

// Sandbox card for draft sandboxes
function SandboxCard({
  sandbox,
  onDelete,
}: {
  sandbox: Doc<"sandboxes">;
  onDelete: (id: Id<"sandboxes">) => void;
}) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = () => {
    onDelete(sandbox._id);
    setShowDeleteDialog(false);
  };

  // Format the date
  const createdDate = new Date(sandbox.createdAt).toLocaleDateString();

  return (
    <>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{sandbox.name}</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Created {createdDate}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Badge variant="outline">Draft</Badge>
            <div className="flex items-center gap-1">
              <Link href={`/dashboard/sandbox/${sandbox.codesandboxId}`}>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  title="Edit sandbox"
                >
                  <IconPencil className="size-4" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowDeleteDialog(true)}
                title="Delete sandbox"
              >
                <IconTrash className="size-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sandbox</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this sandbox? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter showCloseButton>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Sandbox
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function ComponentCard({
  component,
  namespace,
  registryToken,
}: {
  component: Doc<"components">;
  namespace: string | undefined;
  registryToken: string | null;
}) {
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const { copied, copy } = useCopyToClipboard();

  const updateMutationFn = useConvexMutation(api.components.update);
  const updateMutation = useMutation({
    mutationFn: updateMutationFn,
    onError: (error) => {
      toast.error("Failed to update visibility", {
        description:
          error instanceof Error ? error.message : "An error occurred",
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
  // Add token for private components
  const baseUrl = namespace
    ? `${process.env.NEXT_PUBLIC_CONVEX_SITE_URL}/r/${namespace}/${component.name}.json`
    : null;

  const registryUrl =
    baseUrl && !component.isPublic && registryToken
      ? `${baseUrl}?token=${registryToken}`
      : baseUrl;

  const installCommand = registryUrl
    ? `npx shadcn@latest add "${registryUrl}"`
    : null;

  const handleCopyCommand = () => {
    if (installCommand) {
      copy(installCommand);
      toast.success("Command copied to clipboard");
    }
  };

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
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
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
          </div>

          {/* Install command */}
          {installCommand && (
            <div
              className="group relative rounded-md bg-muted px-3 py-2 font-mono text-xs cursor-pointer hover:bg-muted/80 transition-colors"
              onClick={handleCopyCommand}
              title="Click to copy"
            >
              <span className="block truncate pr-6">{installCommand}</span>
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground group-hover:text-foreground">
                {copied ? (
                  <IconCheck className="size-3.5" />
                ) : (
                  <IconCopy className="size-3.5" />
                )}
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showPublishDialog} onOpenChange={setShowPublishDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publish Component</DialogTitle>
            <DialogDescription>
              Publishing this component will make it publicly accessible. Anyone
              with the link will be able to install it using the shadcn CLI.
            </DialogDescription>
          </DialogHeader>
          {baseUrl && (
            <div className="rounded-md bg-muted p-3 font-mono text-sm break-all">
              npx shadcn@latest add &quot;{baseUrl}&quot;
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
  const { token: registryToken } = useRegistryToken();

  // Convert OrgContext to query-compatible format
  const queryContext: "personal" | Id<"organizations"> | undefined =
    context === "personal" ? "personal" : context;

  const { data: components, isLoading: componentsLoading } = useQuery(
    convexQuery(api.components.getMyComponentsFiltered, {
      context: queryContext,
    })
  );

  // Query sandboxes (drafts without a published component)
  const { data: sandboxes, isLoading: sandboxesLoading } = useQuery(
    convexQuery(api.sandboxes.list, {})
  );

  const { data: user } = useQuery(convexQuery(api.users.getMe, {}));
  const { data: orgs } = useQuery(convexQuery(api.organizations.getMyOrgs, {}));

  // Mutation for deleting sandboxes
  const deleteSandboxFn = useConvexMutation(api.sandboxes.remove);
  const deleteSandboxMutation = useMutation({
    mutationFn: deleteSandboxFn,
    onSuccess: () => {
      toast.success("Sandbox deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete sandbox", {
        description: error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const handleDeleteSandbox = (id: Id<"sandboxes">) => {
    deleteSandboxMutation.mutate({ id });
  };

  if (componentsLoading || sandboxesLoading) {
    return <ComponentListSkeleton />;
  }

  // Filter sandboxes to only show drafts (no componentId)
  const draftSandboxes = sandboxes?.filter((s) => !s.componentId) ?? [];
  const hasContent = (components && components.length > 0) || draftSandboxes.length > 0;

  if (!hasContent) {
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
      {/* Draft sandboxes first */}
      {draftSandboxes.map((sandbox) => (
        <SandboxCard
          key={sandbox._id}
          sandbox={sandbox}
          onDelete={handleDeleteSandbox}
        />
      ))}

      {/* Published components */}
      {components?.map((component) => (
        <ComponentCard
          key={component._id}
          component={component}
          namespace={getNamespace(component)}
          registryToken={registryToken}
        />
      ))}
    </div>
  );
}
