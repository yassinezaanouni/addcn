"use client";

import { useState } from "react";
import { IconPlus, IconX } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useEditorStore } from "@/stores/editor-store";

export function DependencyManager() {
  const { dependencies, registryDependencies, setMetadata } = useEditorStore();
  const [npmInput, setNpmInput] = useState("");
  const [registryInput, setRegistryInput] = useState("");

  const addNpmDep = () => {
    const dep = npmInput.trim();
    if (dep && !dependencies.includes(dep)) {
      setMetadata({ dependencies: [...dependencies, dep] });
      setNpmInput("");
    }
  };

  const removeNpmDep = (dep: string) => {
    setMetadata({ dependencies: dependencies.filter((d) => d !== dep) });
  };

  const addRegistryDep = () => {
    const dep = registryInput.trim();
    if (dep && !registryDependencies.includes(dep)) {
      setMetadata({ registryDependencies: [...registryDependencies, dep] });
      setRegistryInput("");
    }
  };

  const removeRegistryDep = (dep: string) => {
    setMetadata({
      registryDependencies: registryDependencies.filter((d) => d !== dep),
    });
  };

  return (
    <div className="space-y-4 p-4">
      <div className="space-y-3">
        <label className="text-sm font-medium">NPM Dependencies</label>
        <div className="flex gap-2">
          <Input
            value={npmInput}
            onChange={(e) => setNpmInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addNpmDep()}
            placeholder="e.g., framer-motion"
            className="text-sm"
          />
          <Button size="icon" variant="outline" onClick={addNpmDep}>
            <IconPlus className="size-4" />
          </Button>
        </div>
        {dependencies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {dependencies.map((dep) => (
              <Badge
                key={dep}
                variant="secondary"
                className="gap-1 pr-1 text-xs"
              >
                {dep}
                <button
                  onClick={() => removeNpmDep(dep)}
                  className="ml-0.5 rounded-sm hover:bg-muted"
                >
                  <IconX className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <label className="text-sm font-medium">Registry Dependencies</label>
        <p className="text-xs text-muted-foreground">
          shadcn components this component depends on
        </p>
        <div className="flex gap-2">
          <Input
            value={registryInput}
            onChange={(e) => setRegistryInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRegistryDep()}
            placeholder="e.g., button, card"
            className="text-sm"
          />
          <Button size="icon" variant="outline" onClick={addRegistryDep}>
            <IconPlus className="size-4" />
          </Button>
        </div>
        {registryDependencies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {registryDependencies.map((dep) => (
              <Badge
                key={dep}
                variant="outline"
                className="gap-1 pr-1 text-xs"
              >
                {dep}
                <button
                  onClick={() => removeRegistryDep(dep)}
                  className="ml-0.5 rounded-sm hover:bg-muted"
                >
                  <IconX className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
