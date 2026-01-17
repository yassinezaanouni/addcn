"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { EditorLayout } from "./_components/editor-layout";

export default function NewComponentPage() {
  const reset = useEditorStore((state) => state.reset);

  useEffect(() => {
    // Reset the editor store for a new component
    reset();
  }, [reset]);

  return <EditorLayout />;
}
