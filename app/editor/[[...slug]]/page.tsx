"use client";

import { useEffect, use } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { useComponentsStore } from "@/stores/components-store";
import { EditorLayout } from "./_components/editor-layout";

interface EditorPageProps {
  params: Promise<{ slug?: string[] }>;
}

export default function EditorPage({ params }: EditorPageProps) {
  const { slug } = use(params);
  const componentId = slug?.[0];

  const { reset, loadComponent } = useEditorStore();
  const getComponent = useComponentsStore((state) => state.getComponent);

  useEffect(() => {
    if (componentId) {
      const component = getComponent(componentId);
      if (component) {
        loadComponent(component);
      } else {
        reset();
      }
    } else {
      reset();
    }
  }, [componentId, getComponent, loadComponent, reset]);

  return <EditorLayout />;
}
