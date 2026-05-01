"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { joinSteps, snippetInstallCommand } from "@/lib/command-utils";
import type { CommandResolvers } from "@/lib/command-utils";
import { MAX_STEPS_PER_COMMAND } from "@/lib/validators";

import { StepRowInline } from "./step-row-inline";
import { StepRowCommandRef } from "./step-row-command-ref";
import { StepRowSnippetRef } from "./step-row-snippet-ref";
import { OperatorPicker } from "./operator-picker";
import { AddStepMenu } from "./add-step-menu";

const SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "";

export function StepList() {
  const steps = useCommandEditorStore((s) => s.steps);
  const updateStepOperator = useCommandEditorStore(
    (s) => s.updateStepOperator,
  );
  const convexId = useCommandEditorStore((s) => s.convexId);

  // Pre-fetch the user's commands and snippets for resolution + namespace lookup.
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

  const commandMap = useMemo(
    () => new Map<string, Doc<"commands">>(allCommands.map((c) => [c._id, c])),
    [allCommands],
  );
  const snippetMap = useMemo(
    () => new Map<string, Doc<"snippets">>(allSnippets.map((s) => [s._id, s])),
    [allSnippets],
  );
  const orgSlugById = useMemo(
    () => new Map(orgs.map((o) => [o._id, o.slug])),
    [orgs],
  );

  const resolvers: CommandResolvers = useMemo(() => {
    return {
      resolveCommand: (id) => {
        const c = commandMap.get(id);
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
  }, [commandMap, snippetMap, orgSlugById, user]);

  const canRemove = steps.length > 1;
  const reachedMax = steps.length >= MAX_STEPS_PER_COMMAND;
  // Top-level cycle prevention — exclude self from the picker.
  const excludeCommandIds = convexId ? [convexId] : [];

  return (
    <div className="space-y-2 px-4 pb-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          Steps
        </span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {steps.length}/{MAX_STEPS_PER_COMMAND}
        </span>
      </div>

      <div className="space-y-0">
        {steps.map((step, index) => {
          const isFirst = index === 0;
          const isLast = index === steps.length - 1;

          let row: React.ReactNode = null;

          if (step.refCommandId) {
            const resolved = commandMap.get(step.refCommandId) ?? null;
            const previewSteps = resolved?.steps ?? [];
            const preview = joinSteps(previewSteps, resolvers);
            row = (
              <StepRowCommandRef
                index={index}
                refCommandId={step.refCommandId}
                resolved={resolved}
                resolvedPreview={preview}
                isFirst={isFirst}
                isLast={isLast}
                canRemove={canRemove}
              />
            );
          } else if (step.refSnippetId) {
            const resolved = snippetMap.get(step.refSnippetId) ?? null;
            const namespace = resolved
              ? resolved.userId && user
                ? user.username
                : resolved.orgId
                  ? (orgSlugById.get(resolved.orgId) ?? "")
                  : ""
              : "";
            const preview = resolved
              ? snippetInstallCommand(
                  {
                    title: resolved.title,
                    name: resolved.name,
                    namespace,
                    isPublic: resolved.isPublic,
                  },
                  SITE_URL,
                )
              : "";
            row = (
              <StepRowSnippetRef
                index={index}
                resolved={resolved}
                resolvedPreview={preview}
                resolvedNamespace={namespace}
                isFirst={isFirst}
                isLast={isLast}
                canRemove={canRemove}
              />
            );
          } else {
            row = (
              <StepRowInline
                index={index}
                value={step.inlineCommand ?? ""}
                isFirst={isFirst}
                isLast={isLast}
                canRemove={canRemove}
                onRequestAddBelow={() => {
                  // adds a new inline step below — handled by store
                  useCommandEditorStore.getState().addInlineStep();
                }}
              />
            );
          }

          return (
            <div key={index}>
              {row}
              {!isLast && (
                <OperatorPicker
                  value={step.operator ?? "&&"}
                  onChange={(op) => updateStepOperator(index, op)}
                />
              )}
            </div>
          );
        })}
      </div>

      {!reachedMax && <AddStepMenu excludeCommandIds={excludeCommandIds} />}
    </div>
  );
}
