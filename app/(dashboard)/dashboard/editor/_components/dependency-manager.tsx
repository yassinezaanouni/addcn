"use client";

import { useEditorStore } from "@/stores/editor-store";
import { DependencyInputs } from "./dependency-inputs";

export function DependencyManager() {
  const {
    dependencies,
    registryDependencies,
    addDependency,
    removeDependency,
    addRegistryDependency,
    removeRegistryDependency,
  } = useEditorStore();

  return (
    <div className="px-4 pb-4">
      <DependencyInputs
        dependencies={dependencies}
        registryDependencies={registryDependencies}
        onAddDependency={addDependency}
        onRemoveDependency={removeDependency}
        onAddRegistryDependency={addRegistryDependency}
        onRemoveRegistryDependency={removeRegistryDependency}
      />
    </div>
  );
}
