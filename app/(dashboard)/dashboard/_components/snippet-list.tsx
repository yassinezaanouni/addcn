"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import {
  useQuery,
  useMutation,
  useInfiniteQuery,
  useQueryClient,
} from "@tanstack/react-query";
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
import { DeleteSnippetButton } from "./delete-snippet-button";

function SnippetCardSkeleton() {
  return (
    <Card className="group overflow-hidden border-border/50 bg-card/50 pt-0 transition-all hover:border-border hover:bg-card">
      <Skeleton className="aspect-video w-full" />
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="mt-1 h-4 w-48" />
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-4 w-20" />
      </CardContent>
    </Card>
  );
}

function SnippetListSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 [@media(min-width:2200px)]:grid-cols-5">
      {Array.from({ length: 6 }).map((_, i) => (
        <SnippetCardSkeleton key={i} />
      ))}
    </div>
  );
}

function LivePreview({ files }: { files: Doc<"snippets">["files"] }) {
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
      const snippetFiles = collectAllFiles(mainFile, files);
      return generateIframeHtml(
        snippetFiles,
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
        title="Snippet preview"
      />
    </div>
  );
}

function SnippetCard({
  snippet,
  namespace,
  registryToken,
}: {
  snippet: Doc<"snippets">;
  namespace: string | undefined;
  registryToken: string | null;
}) {
  const [showPublishDialog, setShowPublishDialog] = useState(false);
  const queryClient = useQueryClient();

  const updateMutationFn = useConvexMutation(api.snippets.update);
  const updateMutation = useMutation({
    mutationFn: updateMutationFn,
    onSuccess: () => {
      // Invalidate snippet queries to refetch updated data
      queryClient.invalidateQueries({ queryKey: ["snippets"] });
    },
    onError: (error) => {
      toast.error("Failed to update visibility", {
        description:
          error instanceof Error ? error.message : "An error occurred",
      });
    },
  });

  const handleVisibilityToggle = () => {
    if (!snippet.isPublic) {
      // Show confirmation dialog when publishing
      setShowPublishDialog(true);
    } else {
      // Directly unpublish without confirmation
      updateMutation.mutate(
        { id: snippet._id, isPublic: false },
        {
          onSuccess: () => {
            toast.success("Snippet unpublished", {
              description: "Your snippet is now private.",
            });
          },
        },
      );
    }
  };

  const handleConfirmPublish = () => {
    updateMutation.mutate(
      { id: snippet._id, isPublic: true },
      {
        onSuccess: () => {
          toast.success("Snippet published", {
            description: "Your snippet is now publicly accessible.",
          });
          setShowPublishDialog(false);
        },
      },
    );
  };

  // Build the registry URL for the snippet
  // Add token for private snippets
  const baseUrl = namespace
    ? `${process.env.NEXT_PUBLIC_SITE_URL}/r/${namespace}/${snippet.name}.json`
    : null;

  const registryUrl =
    baseUrl && !snippet.isPublic && registryToken
      ? `${baseUrl}?token=${registryToken}`
      : baseUrl;

  return (
    <>
      <Card className="overflow-hidden justify-between border-border/50 bg-card/50 pt-0">
        {/* Preview: static media or live iframe */}
        <div className="relative aspect-video w-full overflow-hidden bg-muted/50">
          {snippet.previewMediaUrl ? (
            snippet.previewMediaType === "video" ? (
              <video
                src={snippet.previewMediaUrl}
                className="h-full w-full object-cover"
                autoPlay
                muted
                loop
                playsInline
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={snippet.previewMediaUrl}
                alt={snippet.title || snippet.name}
                className="h-full w-full object-contain"
              />
            )
          ) : snippet.previewEnabled ? (
            <LivePreview files={snippet.files} />
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
            <CardTitle>{snippet.title || snippet.name}</CardTitle>
            {snippet.description && (
              <CardDescription className="line-clamp-2">
                {snippet.description}
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant={snippet.isPublic ? "default" : "secondary"}>
                  {snippet.isPublic ? "Public" : "Private"}
                </Badge>
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <IconDownload className="size-3" />
                  {snippet.downloads ?? 0}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                  <Switch
                    checked={snippet.isPublic}
                    onCheckedChange={handleVisibilityToggle}
                    disabled={updateMutation.isPending}
                    size="sm"
                  />
                  Public
                </label>
                <Link href={`/dashboard/editor/${snippet._id}`}>
                  <Button variant="ghost" size="icon-sm" title="Edit snippet">
                    <IconPencil className="size-4" />
                  </Button>
                </Link>
                <DeleteSnippetButton
                  snippetId={snippet._id}
                  snippetName={snippet.title || snippet.name}
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
            <DialogTitle>Publish Snippet</DialogTitle>
            <DialogDescription>
              Publishing this snippet will make it publicly accessible. Anyone
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
              {updateMutation.isPending ? "Publishing..." : "Publish Snippet"}
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
    <div className="relative max-w-md">
      <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 font-mono text-xs text-muted-foreground">
        <IconSearch className="size-4" />
      </div>
      <Input
        type="text"
        placeholder="Search snippets..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 border-border/50 bg-background/50 pl-9 pr-9 font-mono text-sm transition-colors focus:border-primary/50 focus:bg-background"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <IconX className="size-4" />
        </button>
      )}
    </div>
  );
}

export function SnippetList() {
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

  // Infinite query for paginated snippets (when not searching)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isPaginatedLoading,
  } = useInfiniteQuery({
    queryKey: ["snippets", queryContext],
    queryFn: async ({ pageParam }) => {
      return await convex.query(api.snippets.getMySnippetsPaginated, {
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
    ...convexQuery(api.snippets.search, { query: debouncedSearch }),
    enabled: !!debouncedSearch,
  });

  // Filter search results by context (also filter out nulls from permission checks)
  const filteredSearchResults = useMemo(() => {
    if (!searchResults || !debouncedSearch) return [];

    return searchResults.filter(
      (snippet): snippet is NonNullable<typeof snippet> => {
        if (!snippet) return false;
        if (queryContext === "personal") {
          return !!snippet.userId;
        }
        return snippet.orgId === queryContext;
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

  // Memoized helper to get namespace for a snippet
  const getNamespace = useCallback(
    (snippet: Doc<"snippets">): string | undefined => {
      if (snippet.userId) return user?.username;
      if (snippet.orgId && orgs) {
        return orgs.find((o) => o._id === snippet.orgId)?.slug;
      }
      return undefined;
    },
    [user?.username, orgs],
  );

  // Get snippets to display based on search state
  const allSnippets = debouncedSearch
    ? filteredSearchResults
    : (data?.pages.flatMap((page) => page.page) ?? []);

  // Show skeleton only on initial load (not when searching with existing data)
  if (isLoading && allSnippets.length === 0) {
    return (
      <div className="space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
        <SnippetListSkeleton />
      </div>
    );
  }

  // Empty state when no snippets exist at all
  if (allSnippets.length === 0 && !debouncedSearch) {
    return (
      <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20 p-8">
        <div className="flex size-16 items-center justify-center rounded-full border border-border/50 bg-card">
          <IconPackage className="size-8 text-muted-foreground" />
        </div>
        <h3 className="mt-6 font-mono text-lg font-medium">
          No snippets yet
        </h3>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          Create your first snippet to get started with your personal
          registry.
        </p>
        <Link href="/dashboard/editor" className="mt-6">
          <Button className="gap-2 font-mono">
            <IconPlus className="size-4" />
            Create Snippet
          </Button>
        </Link>
      </div>
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
      {allSnippets.length === 0 && debouncedSearch && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20 p-8">
          <div className="flex size-12 items-center justify-center rounded-full border border-border/50 bg-card">
            <IconSearch className="size-5 text-muted-foreground" />
          </div>
          <h3 className="mt-4 font-mono text-base font-medium">
            No results found
          </h3>
          <p className="mt-1.5 text-center text-sm text-muted-foreground">
            No snippets match &quot;{debouncedSearch}&quot;
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="mt-4 font-mono"
          >
            Clear search
          </Button>
        </div>
      )}

      {/* Snippet grid */}
      {allSnippets.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [@media(min-width:2200px)]:grid-cols-5">
          {allSnippets.map((snippet) => (
            <SnippetCard
              key={snippet._id}
              snippet={snippet}
              namespace={getNamespace(snippet)}
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
