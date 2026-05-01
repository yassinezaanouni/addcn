"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useOrgContext } from "@/components/org-switcher";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  IconPencil,
  IconPlus,
  IconSearch,
  IconTerminal2,
  IconX,
} from "@tabler/icons-react";

import { joinSteps, type CommandResolvers } from "@/lib/command-utils";
import { CopyCommandButton } from "./copy-command-button";
import { DeleteCommandButton } from "./delete-command-button";
import { useCommandEditor } from "./command-editor-context";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

function CommandCardSkeleton() {
  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-1 h-4 w-56" />
      </CardHeader>
      <CardContent className="space-y-2">
        <Skeleton className="h-7 w-full rounded-md" />
        <Skeleton className="h-5 w-24" />
      </CardContent>
    </Card>
  );
}

function CommandCard({
  command,
  resolvers,
}: {
  command: Doc<"commands">;
  resolvers: CommandResolvers;
}) {
  const { open } = useCommandEditor();
  const joined = useMemo(
    () => joinSteps(command.steps, resolvers),
    [command.steps, resolvers],
  );

  return (
    <Card className="border-border/50 bg-card/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-mono text-base">
          <IconTerminal2 className="size-4 text-emerald-500" />
          {command.name}
        </CardTitle>
        {command.description && (
          <CardDescription className="line-clamp-1">
            {command.description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="group relative rounded-md border border-border/50 bg-muted/40 px-3 py-2">
          <code className="block truncate font-mono text-xs">{joined}</code>
        </div>

        {command.tags && command.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {command.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-md bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400"
              >
                #{tag}
              </span>
            ))}
            {command.tags.length > 3 && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                +{command.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground">
            {command.steps.length} step{command.steps.length !== 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <CopyCommandButton text={joined} />
            <Button
              variant="ghost"
              size="icon-sm"
              title="Edit command"
              onClick={() => open(command._id)}
            >
              <IconPencil className="size-4" />
            </Button>
            <DeleteCommandButton
              commandId={command._id}
              commandName={command.name}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SearchInput({
  value,
  onChange,
  onClear,
}: {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative max-w-md">
      <div className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 items-center text-muted-foreground">
        <IconSearch className="size-4" />
      </div>
      <Input
        type="text"
        placeholder="Search commands..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 border-border/50 bg-background/50 pl-9 pr-9 font-mono text-sm transition-colors focus:border-primary/50"
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

export function CommandList() {
  const context = useOrgContext();
  const { open } = useCommandEditor();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const queryContext: "personal" | typeof context =
    context === "personal" ? "personal" : context!;

  const { data: allCommands = [], isLoading } = useQuery(
    convexQuery(api.commands.getMyCommandsFiltered, {
      context: queryContext as "personal" | undefined,
    }),
  );

  const { data: searchResults = [], isLoading: isSearchLoading } = useQuery({
    ...convexQuery(api.commands.search, { query: debouncedSearch }),
    enabled: !!debouncedSearch,
  });

  // Pre-fetch all snippets the user can see so we can resolve refSnippetId.
  const { data: allSnippets = [] } = useQuery(
    convexQuery(api.snippets.getMySnippets, {}),
  );
  const { data: user } = useQuery(convexQuery(api.users.getMe, {}));
  const { data: orgs = [] } = useQuery(
    convexQuery(api.organizations.getMyOrgs, {}),
  );

  // Build resolvers used by every card to render its preview.
  const resolvers: CommandResolvers = useMemo(() => {
    const cmdMap = new Map(allCommands.map((c) => [c._id, c]));
    const snippetMap = new Map(allSnippets.map((s) => [s._id, s]));
    const orgSlugById = new Map(orgs.map((o) => [o._id, o.slug]));
    return {
      resolveCommand: (id) => {
        const c = cmdMap.get(id);
        return c ? { _id: c._id, name: c.name, steps: c.steps } : null;
      },
      resolveSnippet: (id) => {
        const s = snippetMap.get(id);
        if (!s) return null;
        const namespace =
          s.userId && user
            ? user.username
            : s.orgId
              ? (orgSlugById.get(s.orgId) ?? "")
              : "";
        return {
          title: s.title,
          name: s.name,
          namespace,
          isPublic: s.isPublic,
        };
      },
      registrySiteUrl: SITE_URL,
    };
  }, [allCommands, allSnippets, user, orgs]);

  const commands = debouncedSearch
    ? searchResults.filter(
        (c): c is NonNullable<typeof c> =>
          c !== null &&
          (queryContext === "personal" ? !!c.userId : c.orgId === queryContext),
      )
    : allCommands;

  if (isLoading || (debouncedSearch && isSearchLoading)) {
    return (
      <div className="space-y-4">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
        />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <CommandCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  if (commands.length === 0 && !debouncedSearch) {
    return (
      <div className="flex min-h-[400px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20 p-8">
        <div className="flex size-16 items-center justify-center rounded-full border border-border/50 bg-card">
          <IconTerminal2 className="size-8 text-emerald-500" />
        </div>
        <h3 className="mt-6 font-mono text-lg font-medium">
          No commands yet
        </h3>
        <p className="mt-2 max-w-sm text-center text-sm text-muted-foreground">
          Save your first command or build a workflow that chains commands
          together.
        </p>
        <Button
          onClick={() => open("new")}
          className="mt-6 gap-2 font-mono"
        >
          <IconPlus className="size-4" />
          New Command
        </Button>
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

      {commands.length === 0 && debouncedSearch && (
        <div className="flex min-h-[300px] flex-col items-center justify-center rounded-lg border border-dashed border-border/50 bg-muted/20 p-8">
          <IconSearch className="size-5 text-muted-foreground" />
          <h3 className="mt-3 font-mono text-base font-medium">
            No commands match &quot;{debouncedSearch}&quot;
          </h3>
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

      {commands.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {commands.map((command) => (
            <CommandCard
              key={command._id}
              command={command}
              resolvers={resolvers}
            />
          ))}
        </div>
      )}
    </div>
  );
}
