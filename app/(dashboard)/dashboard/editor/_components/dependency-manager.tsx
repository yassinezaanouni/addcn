"use client";

import { useState } from "react";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { IconPlus, IconX } from "@tabler/icons-react";

export function DependencyManager() {
  const {
    dependencies,
    registryDependencies,
    addDependency,
    removeDependency,
    addRegistryDependency,
    removeRegistryDependency,
  } = useEditorStore();

  const [npmInput, setNpmInput] = useState("");
  const [registryInput, setRegistryInput] = useState("");

  const handleAddNpm = () => {
    if (npmInput.trim()) {
      addDependency(npmInput.trim());
      setNpmInput("");
    }
  };

  const handleAddRegistry = () => {
    if (registryInput.trim()) {
      addRegistryDependency(registryInput.trim());
      setRegistryInput("");
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="space-y-3">
        <Label>NPM Dependencies</Label>
        <div className="flex gap-2">
          <Input
            value={npmInput}
            onChange={(e) => setNpmInput(e.target.value)}
            placeholder="package-name"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddNpm();
            }}
          />
          <Button size="sm" variant="outline" onClick={handleAddNpm}>
            <IconPlus className="size-4" />
          </Button>
        </div>
        {dependencies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {dependencies.map((dep) => (
              <Badge key={dep} variant="secondary" className="gap-1">
                {dep}
                <button
                  onClick={() => removeDependency(dep)}
                  className="ml-1 hover:text-destructive"
                >
                  <IconX className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <Label>Registry Dependencies</Label>
        <p className="text-xs text-muted-foreground">
          Other shadcn components this depends on
        </p>
        <div className="flex gap-2">
          <Input
            value={registryInput}
            onChange={(e) => setRegistryInput(e.target.value)}
            placeholder="button"
            className="h-8"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddRegistry();
            }}
          />
          <Button size="sm" variant="outline" onClick={handleAddRegistry}>
            <IconPlus className="size-4" />
          </Button>
        </div>
        {registryDependencies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {registryDependencies.map((dep) => (
              <Badge key={dep} variant="outline" className="gap-1">
                {dep}
                <button
                  onClick={() => removeRegistryDependency(dep)}
                  className="ml-1 hover:text-destructive"
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
