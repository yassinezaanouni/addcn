"use client";

import { useEffect } from "react";
import { useCommandEditorStore } from "@/stores/command-editor-store";
import { CommandEditorLayout } from "./_components/command-editor-layout";

export default function NewCommandPage() {
  const reset = useCommandEditorStore((s) => s.reset);

  useEffect(() => {
    reset();
  }, [reset]);

  return <CommandEditorLayout />;
}
