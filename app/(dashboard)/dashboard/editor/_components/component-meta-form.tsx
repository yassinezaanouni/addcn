"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEditorStore } from "@/stores/editor-store";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

// Convert to kebab-case
function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function RequiredIndicator() {
  return <span className="text-destructive">*</span>;
}

export function ComponentMetaForm() {
  const { name, title, description, setMetadata, validationDialogOpen } = useEditorStore();

  return (
    <div className="space-y-4 px-4 pb-4">
      <AnimatePresence mode="popLayout">
        {!validationDialogOpen && (
          <>
            {/* Name field */}
            <motion.div
              key="sidebar-name"
              className="space-y-2"
              layoutId="field-name"
              initial={false}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            >
              <Label htmlFor="name">
                Slug <RequiredIndicator />
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setMetadata({ name: toKebabCase(e.target.value) })}
                placeholder="my-component"
                className="font-mono"
              />
              <p className="text-[11px] text-muted-foreground">
                URL: /r/namespace/<span className="text-foreground">{name || "slug"}</span>
              </p>
            </motion.div>

            {/* Title field */}
            <motion.div
              key="sidebar-title"
              className="space-y-2"
              layoutId="field-title"
              initial={false}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            >
              <Label htmlFor="title">
                Title <RequiredIndicator />
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setMetadata({ title: e.target.value })}
                placeholder="My Component"
              />
            </motion.div>

            {/* Description field */}
            <motion.div
              key="sidebar-description"
              className="space-y-2"
              layoutId="field-description"
              initial={false}
              exit={{ opacity: 0 }}
              transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
            >
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setMetadata({ description: e.target.value })}
                placeholder="A brief description of your component..."
                rows={3}
                className="resize-none"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
