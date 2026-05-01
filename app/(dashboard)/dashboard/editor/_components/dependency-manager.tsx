"use client";

import { useEditorStore } from "@/stores/editor-store";
import { DependencyInputs } from "./dependency-inputs";

export function DependencyManager() {
  const {
    dependencies,
    devDependencies,
    registryDependencies,
    addDependency,
    removeDependency,
    addDevDependency,
    removeDevDependency,
    addRegistryDependency,
    removeRegistryDependency,
  } = useEditorStore();

  return (
    <div className="px-4 pb-4">
      <DependencyInputs
        dependencies={dependencies}
        devDependencies={devDependencies}
        registryDependencies={registryDependencies}
        onAddDependency={addDependency}
        onRemoveDependency={removeDependency}
        onAddDevDependency={addDevDependency}
        onRemoveDevDependency={removeDevDependency}
        onAddRegistryDependency={addRegistryDependency}
        onRemoveRegistryDependency={removeRegistryDependency}
      />
    </div>
  );
}
