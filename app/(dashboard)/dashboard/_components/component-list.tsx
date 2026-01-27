"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation, useInfiniteQuery } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { useConvex } from "convex/react";
import { useTheme } from "next-themes";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useOrgContext } from "@/components/org-switcher";
import { useRegistryToken } from "@/hooks/use-registry-token";
import {
  collectAllFiles,
  transformCss,
  generateIframeHtml,
} from "@/lib/preview";
import { InstallCommand } from "./install-command";
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
  EmptyContent,
} from "@/components/ui/empty";
import {
  IconPackage,
  IconDownload,
  IconPencil,
  IconPlus,
  IconSearch,
  IconX,
} from "@tabler/icons-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";
import { toast } from "sonner";
import { DeleteComponentButton } from "./delete-component-button";

function ComponentCardSkeleton() {
  return (
    <Card size="sm" className="overflow-hidden pt-0!">
      <Skeleton className="aspect-video w-full" />
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 [@media(min-width:2200px)]:grid-cols-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <ComponentCardSkeleton key={i} />
      ))}
    </div>
  );
}

function LivePreview({ files }: { files: Doc<"components">["files"] }) {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Only render iframe when visible (lazy loading)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect(); // Once visible, stop observing
        }
      },
      { rootMargin: "100px" }, // Start loading slightly before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Find main file - try .tsx first, then .jsx, then .ts, then .js
  const mainFile = useMemo(() => {
    const extensions = [".tsx", ".jsx", ".ts", ".js"];
    for (const ext of extensions) {
      const file = files.find((f) => f.path.endsWith(ext));
      if (file) return file;
    }
    return null;
  }, [files]);

  const iframeHtml = useMemo(() => {
    if (!isVisible || !mainFile) return null;

    const cssContent = files
      .filter((f) => f.type === "style" || f.path.endsWith(".css"))
      .map((f) => f.content)
      .join("\n\n");

    try {
      const componentFiles = collectAllFiles(mainFile, files);
      return generateIframeHtml(
        componentFiles,
        mainFile.path,
        transformCss(cssContent),
        resolvedTheme || "light",
      );
    } catch {
      return null;
    }
  }, [files, mainFile, resolvedTheme, isVisible]);

  // No main file found - show placeholder
  if (!mainFile) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/50">
        <IconPackage className="size-8 text-muted-foreground/40" />
        <span className="text-xs text-muted-foreground/60">No preview</span>
      </div>
    );
  }

  // Still loading (not visible yet)
  if (!isVisible) {
    return (
      <div
        ref={containerRef}
        className="flex h-full w-full items-center justify-center"
      >
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
    );
  }

  // Error generating preview
  if (!iframeHtml) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/50">
        <IconPackage className="size-8 text-muted-foreground/40" />
        <span className="text-xs text-muted-foreground/60">No preview</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="h-full w-full">
      <iframe
        srcDoc={iframeHtml}
        className="h-full w-full border-0"
        sandbox="allow-scripts"
        title="Component preview"
      />
    </div>
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
        },
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
      },
    );
    setShowPublishDialog(false);
  };

  // Build the registry URL for the component
  // Add token for private components
  const baseUrl = namespace
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/r/${namespace}/${component.name}.json`
    : null;

  const registryUrl =
    baseUrl && !component.isPublic && registryToken
      ? `${baseUrl}?token=${registryToken}`
      : baseUrl;

  return (
    <>
      <Card size="sm" className="overflow-hidden justify-between pt-0!">
        {/* Preview: static media or live iframe */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted">
          {component.previewMediaUrl ? (
            component.previewMediaType === "video" ? (
              <video
                src={component.previewMediaUrl}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={component.previewMediaUrl}
                alt={component.title || component.name}
                className="h-full w-full object-contain"
              />
            )
          ) : component.previewEnabled ? (
            <LivePreview files={component.files} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 bg-muted/50">
              <IconPackage className="size-8 text-muted-foreground/40" />
              <span className="text-xs text-muted-foreground/60">
                No preview
              </span>
            </div>
          )}
        </div>
        <div className="space-y-4">
          <CardHeader>
            <CardTitle>{component.title || component.name}</CardTitle>
            {component.description && (
              <CardDescription className="line-clamp-2">
                {component.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
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
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Switch
                    checked={component.isPublic}
                    onCheckedChange={handleVisibilityToggle}
                    disabled={updateMutation.isPending}
                    size="sm"
                  />
                  Public
                </label>
                <Link href={`/dashboard/editor/${component._id}`}>
                  <Button variant="ghost" size="icon-sm" title="Edit component">
                    <IconPencil className="size-4" />
                  </Button>
                </Link>
                <DeleteComponentButton
                  componentId={component._id}
                  componentName={component.title || component.name}
                />
              </div>
            </div>

            {/* Install command */}
            {registryUrl && <InstallCommand registryUrl={registryUrl} />}
          </CardContent>
        </div>
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

const PAGE_SIZE = 12;

function SearchInput({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative max-w-sm">
      <IconSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <Input
        type="text"
        placeholder="Search components..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-8 pr-8"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          <IconX className="size-4" />
        </button>
      )}
    </div>
  );
}

export function ComponentList() {
  const context = useOrgContext();
  const convex = useConvex();
  const { token: registryToken } = useRegistryToken();
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Convert OrgContext to query-compatible format
  const queryContext: "personal" | Id<"organizations"> =
    context === "personal" ? "personal" : context!;

  const { data: user } = useQuery(convexQuery(api.users.getMe, {}));
  const { data: orgs } = useQuery(convexQuery(api.organizations.getMyOrgs, {}));

  // Infinite query for paginated components (when not searching)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isPaginatedLoading,
  } = useInfiniteQuery({
    queryKey: ["components", queryContext],
    queryFn: async ({ pageParam }) => {
      return await convex.query(api.components.getMyComponentsPaginated, {
        context: queryContext,
        paginationOpts: { numItems: PAGE_SIZE, cursor: pageParam ?? null },
      });
    },
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.isDone ? undefined : lastPage.continueCursor,
    enabled: !!queryContext && !debouncedSearch,
  });

  // Search query (when searching)
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    ...convexQuery(api.components.search, { query: debouncedSearch }),
    enabled: !!debouncedSearch,
  });

  // Filter search results by context (also filter out nulls from permission checks)
  const filteredSearchResults = useMemo(() => {
    if (!searchResults || !debouncedSearch) return [];

    return searchResults.filter(
      (component): component is NonNullable<typeof component> => {
        if (!component) return false;
        if (queryContext === "personal") {
          return !!component.userId;
        }
        return component.orgId === queryContext;
      },
    );
  }, [searchResults, debouncedSearch, queryContext]);

  const isLoading = debouncedSearch ? isSearchLoading : isPaginatedLoading;

  // Intersection observer for infinite scroll
  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Memoized helper to get namespace for a component
  const getNamespace = useCallback(
    (component: Doc<"components">): string | undefined => {
      if (component.userId) return user?.username;
      if (component.orgId && orgs) {
        return orgs.find((o) => o._id === component.orgId)?.slug;
      }
      return undefined;
    },
    [user?.username, orgs],
  );

  // Get components to display based on search state
  const allComponents = debouncedSearch
    ? filteredSearchResults
    : (data?.pages.flatMap((page) => page.page) ?? []);

  // Show skeleton only on initial load (not when searching with existing data)
  if (isLoading && allComponents.length === 0) {
    return (
      <div className="space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
        <ComponentListSkeleton />
      </div>
    );
  }

  // Empty state when no components exist at all
  if (allComponents.length === 0 && !debouncedSearch) {
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
        <EmptyContent>
          <Link href="/dashboard/editor">
            <Button>
              <IconPlus className="size-4" />
              Create Component
            </Button>
          </Link>
        </EmptyContent>
      </Empty>
    );
  }

  return (
    <div className="space-y-4">
      <SearchInput
        value={searchQuery}
        onChange={setSearchQuery}
        onClear={() => setSearchQuery("")}
      />

      {/* No results for search */}
      {allComponents.length === 0 && debouncedSearch && (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <IconSearch />
            </EmptyMedia>
            <EmptyTitle>No results found</EmptyTitle>
            <EmptyDescription>
              No components match &quot;{debouncedSearch}&quot;. Try a different
              search term.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" onClick={() => setSearchQuery("")}>
              Clear search
            </Button>
          </EmptyContent>
        </Empty>
      )}

      {/* Component grid */}
      {allComponents.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [@media(min-width:2200px)]:grid-cols-5">
          {allComponents.map((component) => (
            <ComponentCard
              key={component._id}
              component={component}
              namespace={getNamespace(component)}
              registryToken={registryToken}
            />
          ))}
        </div>
      )}

      {/* Load more trigger (only when not searching) */}
      {!debouncedSearch && (
        <div ref={loadMoreRef} className="flex justify-center py-4">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Skeleton className="h-4 w-4 rounded-full" />
              Loading more...
            </div>
          )}
        </div>
      )}
    </div>
  );
}
