import type { Id } from "@/convex/_generated/dataModel";
import type { CommandOperator, CommandStep } from "@/types/command";

export interface OperatorMeta {
  symbol: CommandOperator;
  label: string;
  description: string;
}

/**
 * Operator presets surfaced in the picker. Order matters: `&&` is the most
 * common default and sits first.
 */
export const OPERATORS: OperatorMeta[] = [
  {
    symbol: "&&",
    label: "if success",
    description: "Run the next step only if this one exits successfully",
  },
  {
    symbol: "||",
    label: "if failure",
    description: "Run the next step only if this one fails",
  },
  {
    symbol: ";",
    label: "always",
    description: "Run the next step regardless of success or failure",
  },
  {
    symbol: "|",
    label: "pipe to",
    description: "Pipe this step's stdout into the next step's stdin",
  },
  {
    symbol: "\n",
    label: "new line",
    description: "Run the next step as a separate command",
  },
];

export function getOperatorMeta(symbol: CommandOperator): OperatorMeta {
  return OPERATORS.find((o) => o.symbol === symbol) ?? OPERATORS[0];
}

export interface ResolvedSnippet {
  title: string;
  name: string;
  namespace: string;
  isPublic: boolean;
}

export interface ResolvedCommand {
  _id: Id<"commands">;
  name: string;
  steps: CommandStep[];
}

export interface CommandResolvers {
  resolveCommand: (id: Id<"commands">) => ResolvedCommand | null;
  resolveSnippet: (id: Id<"snippets">) => ResolvedSnippet | null;
  registrySiteUrl: string;
}

const PLACEHOLDER_BROKEN_REF = "<broken-reference>";

/**
 * Build the shadcn install command line for a given snippet.
 */
export function snippetInstallCommand(
  snippet: ResolvedSnippet,
  registrySiteUrl: string,
): string {
  return `pnpm dlx shadcn@latest add ${registrySiteUrl}/r/${snippet.namespace}/${snippet.name}.json`;
}

/**
 * Render a single step into its raw shell text. Used internally by
 * joinSteps; callers usually want joinSteps directly.
 */
function renderStep(
  step: CommandStep,
  resolvers: CommandResolvers,
  visited: Set<string>,
): string {
  if (step.inlineCommand !== undefined) {
    return step.inlineCommand;
  }

  if (step.refSnippetId) {
    const snippet = resolvers.resolveSnippet(step.refSnippetId);
    if (!snippet) return PLACEHOLDER_BROKEN_REF;
    return snippetInstallCommand(snippet, resolvers.registrySiteUrl);
  }

  if (step.refCommandId) {
    if (visited.has(step.refCommandId)) {
      return PLACEHOLDER_BROKEN_REF;
    }
    const referenced = resolvers.resolveCommand(step.refCommandId);
    if (!referenced) return PLACEHOLDER_BROKEN_REF;

    const nextVisited = new Set(visited);
    nextVisited.add(step.refCommandId);
    const expanded = joinSteps(referenced.steps, resolvers, nextVisited);
    // Compound expansions (more than one step) get parens so shell
    // precedence stays intact when this ref sits next to other operators.
    return referenced.steps.length > 1 ? `(${expanded})` : expanded;
  }

  return PLACEHOLDER_BROKEN_REF;
}

/**
 * Join an ordered list of steps into a single shell-ready string, expanding
 * command references recursively (with cycle protection) and snippet
 * references to their install commands.
 */
export function joinSteps(
  steps: CommandStep[],
  resolvers: CommandResolvers,
  visited: Set<string> = new Set(),
): string {
  if (steps.length === 0) return "";

  return steps.reduce<string>((acc, step, i) => {
    const rendered = renderStep(step, resolvers, visited);
    if (i === 0) return rendered;
    const op = steps[i - 1].operator ?? "&&";
    if (op === "\n") return `${acc}\n${rendered}`;
    return `${acc} ${op} ${rendered}`;
  }, "");
}

/**
 * Whether the given list of steps is "ready to save" — at least one step,
 * each step has a populated source.
 */
export function stepsAreReady(steps: CommandStep[]): boolean {
  if (steps.length === 0) return false;
  return steps.every((s) => {
    if (s.inlineCommand !== undefined) return s.inlineCommand.trim() !== "";
    return s.refCommandId !== undefined || s.refSnippetId !== undefined;
  });
}
