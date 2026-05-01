"use client";

import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

import { api } from "@/convex/_generated/api";
import { useEditorStore } from "@/stores/editor-store";
import { TagInput as SharedTagInput } from "@/components/shared/tag-input";

export function TagInput() {
  const tags = useEditorStore((s) => s.tags);
  const addTag = useEditorStore((s) => s.addTag);
  const removeTag = useEditorStore((s) => s.removeTag);

  const { data: knownTags = [] } = useQuery(
    convexQuery(api.snippets.getMyTags, {}),
  );

  return (
    <SharedTagInput
      tags={tags}
      knownTags={knownTags}
      onAdd={addTag}
      onRemove={removeTag}
    />
  );
}
