"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { joinSteps, type CommandResolvers } from "@/lib/command-utils";
import { CopyCommandButton } from "../../_components/copy-command-button";
import { IconTerminal2 } from "@tabler/icons-react";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "";

export function WorkflowPreview() {
  const steps = useCommandEditorStore((s) => s.steps);

  const { data: allCommands = [] } = useQuery(
    convexQuery(api.commands.getMyCommands, {}),
  );
  const { data: allSnippets = [] } = useQuery(
    convexQuery(api.snippets.getMySnippets, {}),
  );
  const { data: user } = useQuery(convexQuery(api.users.getMe, {}));
  const { data: orgs = [] } = useQuery(
    convexQuery(api.organizations.getMyOrgs, {}),
  );

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

  const joined = useMemo(
    () => joinSteps(steps, resolvers),
    [steps, resolvers],
  );

  return (
    <div className="sticky top-0 z-10 border-b border-border/50 bg-card/95 px-4 py-3 backdrop-blur-sm">
      <div className="mb-2 flex items-center gap-2">
        <IconTerminal2 className="size-3.5 text-emerald-500" />
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Preview
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted-foreground/70">
          What you&apos;ll copy
        </span>
      </div>

      <div className="group relative rounded-md border border-border/50 bg-muted/40 px-3 py-2 pr-12">
        <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-foreground">
          {joined || (
            <span className="text-muted-foreground/60">
              (empty — add a step below to start building)
            </span>
          )}
        </pre>
        <div className="absolute right-1.5 top-1.5">
          <CopyCommandButton text={joined} />
        </div>
      </div>
    </div>
  );
}
