"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useEditorStore } from "@/stores/editor-store";
import { toKebabCase } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { IconDeviceFloppy, IconLoader2, IconX } from "@tabler/icons-react";
import { DependencyInputs } from "./dependency-inputs";
import { RequiredIndicator, SlugLabel } from "./form-elements";
import type { ComponentMetadataErrors } from "@/lib/validators";

interface RequiredFieldsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  errors: ComponentMetadataErrors;
  onClearError?: (field: keyof ComponentMetadataErrors) => void;
  onSave: () => void;
  isSaving: boolean;
  namespace?: string;
}

export function RequiredFieldsDialog({
  open,
  onOpenChange,
  errors,
  onClearError,
  onSave,
  isSaving,
  namespace,
}: RequiredFieldsDialogProps) {
  const {
    name,
    title,
    description,
    setMetadata,
    dependencies,
    registryDependencies,
    addDependency,
    removeDependency,
    addRegistryDependency,
    removeRegistryDependency,
  } = useEditorStore();
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Focus the first error field when dialog opens
  useEffect(() => {
    if (open) {
      // Small delay to allow animation to start
      const timeout = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [open]);

  // Handle escape key
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSaving) {
        onOpenChange(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, isSaving, onOpenChange]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            onClick={() => !isSaving && onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", bounce: 0.2, duration: 0.4 }}
            className="fixed left-1/2 top-1/2 z-50 flex max-h-[85vh] w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 flex-col rounded-xl bg-background p-6 shadow-lg ring-1 ring-foreground/10"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
          >
            {/* Close button */}
            <button
              onClick={() => !isSaving && onOpenChange(false)}
              disabled={isSaving}
              className="absolute right-4 top-4 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <IconX className="size-4" />
              <span className="sr-only">Close</span>
            </button>

            {/* Header */}
            <div className="mb-6 flex flex-col gap-2">
              <h2 id="dialog-title" className="font-medium leading-none">
                Complete Required Fields
              </h2>
              <p className="text-sm text-muted-foreground">
                Please fill in the required fields before saving your component.
              </p>
            </div>

            {/* Form fields */}
            <div className="space-y-4 overflow-y-auto">
              {/* Name field */}
              <div className="space-y-2">
                <SlugLabel htmlFor="dialog-name" />
                <Input
                  ref={nameInputRef}
                  id="dialog-name"
                  value={name}
                  onChange={(e) => {
                    setMetadata({ name: toKebabCase(e.target.value) });
                    onClearError?.("name");
                  }}
                  placeholder="my-component"
                  className="font-mono"
                  aria-invalid={!!errors.name}
                />
                {errors.name ? (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] text-destructive"
                  >
                    {errors.name}
                  </motion.p>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    URL: /r/{namespace || "namespace"}/
                    <span className="text-foreground">{name || "slug"}</span>
                  </p>
                )}
              </div>

              {/* Title field */}
              <div className="space-y-2">
                <Label htmlFor="dialog-title-input">
                  Title
                  <RequiredIndicator />
                </Label>
                <Input
                  id="dialog-title-input"
                  value={title}
                  onChange={(e) => {
                    setMetadata({ title: e.target.value });
                    onClearError?.("title");
                  }}
                  placeholder="My Component"
                  aria-invalid={!!errors.title}
                />
                {errors.title && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[11px] text-destructive"
                  >
                    {errors.title}
                  </motion.p>
                )}
              </div>

              {/* Description field */}
              <div className="space-y-2">
                <Label htmlFor="dialog-description">Description</Label>
                <Textarea
                  id="dialog-description"
                  value={description}
                  onChange={(e) => setMetadata({ description: e.target.value })}
                  placeholder="A brief description of your component..."
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Dependencies section */}
              <div className="border-t pt-4">
                <Label className="mb-4 block">Dependencies</Label>
                <DependencyInputs
                  dependencies={dependencies}
                  registryDependencies={registryDependencies}
                  onAddDependency={addDependency}
                  onRemoveDependency={removeDependency}
                  onAddRegistryDependency={addRegistryDependency}
                  onRemoveRegistryDependency={removeRegistryDependency}
                  twoColumns
                />
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={onSave} disabled={isSaving} className="gap-2">
                {isSaving ? (
                  <IconLoader2 className="size-4 animate-spin" />
                ) : (
                  <IconDeviceFloppy className="size-4" />
                )}
                {isSaving ? "Saving..." : "Save"}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
