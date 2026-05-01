"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  IconPlus,
  IconX,
  IconPackage,
  IconComponents,
  IconTool,
} from "@tabler/icons-react";

interface DependencyInputsProps {
  dependencies: string[];
  devDependencies: string[];
  registryDependencies: string[];
  onAddDependency: (dep: string) => void;
  onRemoveDependency: (dep: string) => void;
  onAddDevDependency: (dep: string) => void;
  onRemoveDevDependency: (dep: string) => void;
  onAddRegistryDependency: (dep: string) => void;
  onRemoveRegistryDependency: (dep: string) => void;
  twoColumns?: boolean;
}

interface DependencySectionProps {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  values: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
  pillClass: string;
  pillHoverClass: string;
}

function DependencySection({
  icon,
  label,
  placeholder,
  values,
  onAdd,
  onRemove,
  pillClass,
  pillHoverClass,
}: DependencySectionProps) {
  const [input, setInput] = useState("");

  const handleAdd = () => {
    if (input.trim()) {
      onAdd(input.trim());
      setInput("");
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-medium text-foreground/80">{label}</span>
      </div>
      <div className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={placeholder}
          className="h-8 flex-1 font-mono text-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
        />
        <Button
          type="button"
          size="icon-sm"
          variant="outline"
          onClick={handleAdd}
          disabled={!input.trim()}
        >
          <IconPlus className="size-4" />
        </Button>
      </div>

      <AnimatePresence mode="popLayout">
        {values.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1.5"
          >
            {values.map((dep) => (
              <motion.span
                key={dep}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className={`group flex items-center gap-1 rounded-md px-2 py-1 font-mono text-[11px] ${pillClass}`}
              >
                {dep}
                <button
                  type="button"
                  onClick={() => onRemove(dep)}
                  className={`ml-0.5 rounded p-0.5 opacity-60 transition-all ${pillHoverClass} hover:opacity-100`}
                >
                  <IconX className="size-3" />
                </button>
              </motion.span>
            ))}
          </motion.div>
        ) : (
          <p className="text-[11px] italic text-muted-foreground/60">
            None added
          </p>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DependencyInputs({
  dependencies,
  devDependencies,
  registryDependencies,
  onAddDependency,
  onRemoveDependency,
  onAddDevDependency,
  onRemoveDevDependency,
  onAddRegistryDependency,
  onRemoveRegistryDependency,
  twoColumns = false,
}: DependencyInputsProps) {
  return (
    <div className={twoColumns ? "grid grid-cols-2 gap-4" : "space-y-4"}>
      <DependencySection
        icon={<IconPackage className="size-3.5 text-orange-500" />}
        label="NPM Packages"
        placeholder="e.g. framer-motion"
        values={dependencies}
        onAdd={onAddDependency}
        onRemove={onRemoveDependency}
        pillClass="bg-orange-500/10 text-orange-600 dark:text-orange-400"
        pillHoverClass="hover:bg-orange-500/20"
      />

      <DependencySection
        icon={<IconTool className="size-3.5 text-amber-500" />}
        label="Dev Packages"
        placeholder="e.g. @types/node"
        values={devDependencies}
        onAdd={onAddDevDependency}
        onRemove={onRemoveDevDependency}
        pillClass="bg-amber-500/10 text-amber-600 dark:text-amber-400"
        pillHoverClass="hover:bg-amber-500/20"
      />

      <DependencySection
        icon={<IconComponents className="size-3.5 text-violet-500" />}
        label="shadcn/ui Components"
        placeholder="e.g. button, card"
        values={registryDependencies}
        onAdd={onAddRegistryDependency}
        onRemove={onRemoveRegistryDependency}
        pillClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
        pillHoverClass="hover:bg-violet-500/20"
      />
    </div>
  );
}
