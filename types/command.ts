import type { Id } from "@/convex/_generated/dataModel";

export type CommandOperator = "&&" | "||" | ";" | "|" | "\n";

export interface CommandStep {
  inlineCommand?: string;
  refCommandId?: Id<"commands">;
  refSnippetId?: Id<"snippets">;
  operator?: CommandOperator;
}

export interface SavedCommand {
  id: string;
  name: string;
  description: string;
  steps: CommandStep[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}
