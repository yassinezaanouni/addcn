import { create } from "zustand";
import type { Id } from "@/convex/_generated/dataModel";
import type { CommandOperator, CommandStep } from "@/types/command";
import { MAX_TAGS_PER_SNIPPET, normalizeTag } from "@/lib/validators";

interface CommandEditorState {
  convexId: Id<"commands"> | null;
  name: string;
  description: string;
  steps: CommandStep[];
  tags: string[];
  isDirty: boolean;
  validationDialogOpen: boolean;

  setConvexId: (id: Id<"commands"> | null) => void;
  setMetadata: (data: { name?: string; description?: string }) => void;
  setIsDirty: (dirty: boolean) => void;
  setValidationDialogOpen: (open: boolean) => void;

  addInlineStep: () => void;
  addCommandRefStep: (commandId: Id<"commands">) => void;
  addSnippetRefStep: (snippetId: Id<"snippets">) => void;
  removeStep: (index: number) => void;
  updateInlineCommand: (index: number, text: string) => void;
  updateStepOperator: (index: number, operator: CommandOperator) => void;
  moveStep: (from: number, to: number) => void;

  addTag: (tag: string) => void;
  removeTag: (tag: string) => void;

  reset: () => void;
  loadCommand: (command: {
    _id: Id<"commands">;
    name: string;
    description: string;
    steps: CommandStep[];
    tags?: string[];
  }) => void;
}

function initialSteps(): CommandStep[] {
  return [{ inlineCommand: "" }];
}

const initialState = {
  convexId: null as Id<"commands"> | null,
  name: "",
  description: "",
  steps: initialSteps(),
  tags: [] as string[],
  isDirty: false,
  validationDialogOpen: false,
};

export const useCommandEditorStore = create<CommandEditorState>()((set) => ({
  ...initialState,

  setConvexId: (id) => set({ convexId: id }),

  setMetadata: (data) =>
    set(() => ({
      ...data,
      isDirty: true,
    })),

  setIsDirty: (dirty) => set({ isDirty: dirty }),

  setValidationDialogOpen: (open) => set({ validationDialogOpen: open }),

  addInlineStep: () =>
    set((state) => ({
      steps: [
        ...state.steps.map((step, i) =>
          i === state.steps.length - 1 && step.operator === undefined
            ? { ...step, operator: "&&" as CommandOperator }
            : step,
        ),
        { inlineCommand: "" },
      ],
      isDirty: true,
    })),

  addCommandRefStep: (commandId) =>
    set((state) => ({
      steps: [
        ...state.steps.map((step, i) =>
          i === state.steps.length - 1 && step.operator === undefined
            ? { ...step, operator: "&&" as CommandOperator }
            : step,
        ),
        { refCommandId: commandId },
      ],
      isDirty: true,
    })),

  addSnippetRefStep: (snippetId) =>
    set((state) => ({
      steps: [
        ...state.steps.map((step, i) =>
          i === state.steps.length - 1 && step.operator === undefined
            ? { ...step, operator: "&&" as CommandOperator }
            : step,
        ),
        { refSnippetId: snippetId },
      ],
      isDirty: true,
    })),

  removeStep: (index) =>
    set((state) => {
      if (state.steps.length <= 1) return {};
      const next = state.steps.filter((_, i) => i !== index);
      // Strip the operator from the new last step (it can't connect to anything)
      if (next.length > 0) {
        const lastIndex = next.length - 1;
        next[lastIndex] = { ...next[lastIndex], operator: undefined };
      }
      return { steps: next, isDirty: true };
    }),

  updateInlineCommand: (index, text) =>
    set((state) => ({
      steps: state.steps.map((step, i) =>
        i === index ? { ...step, inlineCommand: text } : step,
      ),
      isDirty: true,
    })),

  updateStepOperator: (index, operator) =>
    set((state) => ({
      steps: state.steps.map((step, i) =>
        i === index ? { ...step, operator } : step,
      ),
      isDirty: true,
    })),

  moveStep: (from, to) =>
    set((state) => {
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.steps.length ||
        to >= state.steps.length
      )
        return {};
      const next = [...state.steps];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      // Re-strip operator from the last step
      const lastIndex = next.length - 1;
      next[lastIndex] = { ...next[lastIndex], operator: undefined };
      return { steps: next, isDirty: true };
    }),

  addTag: (raw) =>
    set((state) => {
      const tag = normalizeTag(raw);
      if (!tag) return {};
      if (state.tags.includes(tag)) return {};
      if (state.tags.length >= MAX_TAGS_PER_SNIPPET) return {};
      return { tags: [...state.tags, tag], isDirty: true };
    }),

  removeTag: (tag) =>
    set((state) => ({
      tags: state.tags.filter((t) => t !== tag),
      isDirty: true,
    })),

  reset: () =>
    set(() => ({
      ...initialState,
      steps: initialSteps(),
    })),

  loadCommand: (command) =>
    set(() => ({
      convexId: command._id,
      name: command.name,
      description: command.description,
      steps: command.steps,
      tags: command.tags ?? [],
      isDirty: false,
      validationDialogOpen: false,
    })),
}));

export const useIsNewCommand = () =>
  useCommandEditorStore((s) => s.convexId === null);
