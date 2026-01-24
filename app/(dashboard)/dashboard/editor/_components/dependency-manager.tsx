"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useEditorStore } from "@/stores/editor-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IconPlus, IconX, IconPackage, IconComponents } from "@tabler/icons-react";

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
    <div className="space-y-4 px-4 pb-4">
      {/* NPM Dependencies */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <IconPackage className="size-3.5 text-orange-500" />
          <span className="text-xs font-medium text-foreground/80">NPM Packages</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={npmInput}
            onChange={(e) => setNpmInput(e.target.value)}
            placeholder="e.g. framer-motion"
            className="h-8 flex-1 font-mono text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddNpm();
            }}
          />
          <Button
            size="icon-sm"
            variant="outline"
            onClick={handleAddNpm}
            disabled={!npmInput.trim()}
          >
            <IconPlus className="size-4" />
          </Button>
        </div>

        {/* NPM dependency tags or empty state */}
        <AnimatePresence mode="popLayout">
          {dependencies.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-1.5"
            >
              {dependencies.map((dep) => (
                <motion.span
                  key={dep}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="group flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1 font-mono text-[11px] text-orange-600 dark:text-orange-400"
                >
                  {dep}
                  <button
                    onClick={() => removeDependency(dep)}
                    className="ml-0.5 rounded p-0.5 opacity-60 transition-all hover:bg-orange-500/20 hover:opacity-100"
                  >
                    <IconX className="size-3" />
                  </button>
                </motion.span>
              ))}
            </motion.div>
          ) : (
            <p className="text-[11px] italic text-muted-foreground/40">None added</p>
          )}
        </AnimatePresence>
      </div>

      {/* Registry Dependencies */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-2">
          <IconComponents className="size-3.5 text-violet-500" />
          <span className="text-xs font-medium text-foreground/80">shadcn/ui Components</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={registryInput}
            onChange={(e) => setRegistryInput(e.target.value)}
            placeholder="e.g. button, card"
            className="h-8 flex-1 font-mono text-xs"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddRegistry();
            }}
          />
          <Button
            size="icon-sm"
            variant="outline"
            onClick={handleAddRegistry}
            disabled={!registryInput.trim()}
          >
            <IconPlus className="size-4" />
          </Button>
        </div>

        {/* Registry dependency tags or empty state */}
        <AnimatePresence mode="popLayout">
          {registryDependencies.length > 0 ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-1.5"
            >
              {registryDependencies.map((dep) => (
                <motion.span
                  key={dep}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="group flex items-center gap-1 rounded-md bg-violet-500/10 px-2 py-1 font-mono text-[11px] text-violet-600 dark:text-violet-400"
                >
                  {dep}
                  <button
                    onClick={() => removeRegistryDependency(dep)}
                    className="ml-0.5 rounded p-0.5 opacity-60 transition-all hover:bg-violet-500/20 hover:opacity-100"
                  >
                    <IconX className="size-3" />
                  </button>
                </motion.span>
              ))}
            </motion.div>
          ) : (
            <p className="text-[11px] italic text-muted-foreground/40">None added</p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
