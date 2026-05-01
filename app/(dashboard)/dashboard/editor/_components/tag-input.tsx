"use client";

import { useId, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";

import { api } from "@/convex/_generated/api";
import { useEditorStore } from "@/stores/editor-store";
import {
  MAX_TAGS_PER_SNIPPET,
  normalizeTag,
  TAG_RULES,
} from "@/lib/validators";
import { cn } from "@/lib/utils";
import { IconHash, IconPlus, IconX } from "@tabler/icons-react";

export function TagInput() {
  const tags = useEditorStore((s) => s.tags);
  const addTag = useEditorStore((s) => s.addTag);
  const removeTag = useEditorStore((s) => s.removeTag);

  const { data: knownTags = [] } = useQuery(
    convexQuery(api.snippets.getMyTags, {}),
  );

  const [input, setInput] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  const reachedMax = tags.length >= MAX_TAGS_PER_SNIPPET;
  const remaining = MAX_TAGS_PER_SNIPPET - tags.length;

  const lowerInput = input.trim().toLowerCase();

  // Suggestions: known tags the user already used, minus tags on this snippet,
  // optionally filtered by what's typed.
  const suggestions = useMemo(() => {
    return knownTags
      .filter((t) => !tags.includes(t))
      .filter((t) => !lowerInput || t.includes(lowerInput))
      .slice(0, 6);
  }, [knownTags, tags, lowerInput]);

  // Whether to surface a "Create …" row for a new tag the user is typing.
  const normalized = normalizeTag(input);
  const showCreate =
    !!normalized &&
    !knownTags.includes(normalized) &&
    !tags.includes(normalized);

  const totalOptions = suggestions.length + (showCreate ? 1 : 0);

  // Reset highlight whenever the option set rebuilds (React's recommended
  // "adjust state during render" pattern instead of a useEffect with setState).
  const optionsKey = `${lowerInput}|${suggestions.length}|${showCreate ? 1 : 0}`;
  const [prevOptionsKey, setPrevOptionsKey] = useState(optionsKey);
  if (prevOptionsKey !== optionsKey) {
    setPrevOptionsKey(optionsKey);
    setHighlighted(0);
  }

  const commit = (value: string) => {
    const tag = normalizeTag(value);
    if (!tag) return;
    if (tags.includes(tag)) return;
    if (tags.length >= MAX_TAGS_PER_SNIPPET) return;
    addTag(tag);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
      setHighlighted((h) => Math.min(h + 1, Math.max(totalOptions - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (isOpen && totalOptions > 0 && highlighted < suggestions.length) {
        commit(suggestions[highlighted]);
      } else if (showCreate && normalized) {
        commit(normalized);
      } else if (input.trim()) {
        // last-ditch — try to commit whatever they typed
        commit(input);
      }
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setInput("");
    }
  };

  const handleFocus = () => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    setIsOpen(true);
  };

  const handleBlur = () => {
    // Defer so click on a suggestion lands before we close.
    blurTimer.current = setTimeout(() => setIsOpen(false), 120);
  };

  return (
    <div className="space-y-1.5">
      {/* Combobox: pills + input on one line */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-xs transition-colors",
          "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20",
          reachedMax && "border-amber-500/40",
        )}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          {tags.map((tag) => (
            <motion.span
              key={tag}
              layout
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.12 }}
              className="group flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400"
            >
              <IconHash className="size-3 opacity-60" />
              {tag}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTag(tag);
                }}
                aria-label={`Remove tag ${tag}`}
                className="ml-0.5 rounded p-0.5 opacity-60 transition-all hover:bg-emerald-500/20 hover:opacity-100"
              >
                <IconX className="size-3" />
              </button>
            </motion.span>
          ))}
        </AnimatePresence>

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={reachedMax}
          placeholder={
            reachedMax
              ? ""
              : tags.length === 0
                ? "Add tags…"
                : "+ tag"
          }
          maxLength={TAG_RULES.maxLength}
          className="min-w-[6ch] flex-1 bg-transparent font-mono text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:cursor-not-allowed"
          role="combobox"
          aria-expanded={isOpen && totalOptions > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            isOpen && totalOptions > 0
              ? `${listboxId}-${highlighted}`
              : undefined
          }
        />
      </div>

      {/* Helper text */}
      <p className="text-[10px] text-muted-foreground/70">
        {reachedMax
          ? `Maximum of ${MAX_TAGS_PER_SNIPPET} tags reached`
          : `Press Enter to add. ${remaining} ${remaining === 1 ? "tag" : "tags"} left.`}
      </p>

      {/* Suggestions dropdown */}
      <AnimatePresence>
        {isOpen && totalOptions > 0 && !reachedMax && (
          <motion.ul
            id={listboxId}
            role="listbox"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="max-h-48 space-y-0.5 overflow-y-auto rounded-md border border-border/50 bg-popover/60 p-1"
          >
            {suggestions.map((tag, i) => (
              <li
                key={tag}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={highlighted === i}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(tag);
                  inputRef.current?.focus();
                }}
                onMouseEnter={() => setHighlighted(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[11px] text-foreground/80 transition-colors",
                  highlighted === i &&
                    "bg-foreground/8 text-foreground dark:bg-foreground/10",
                )}
              >
                <IconHash className="size-3 text-emerald-500" />
                {tag}
              </li>
            ))}
            {showCreate && normalized && (
              <li
                id={`${listboxId}-${suggestions.length}`}
                role="option"
                aria-selected={highlighted === suggestions.length}
                onMouseDown={(e) => {
                  e.preventDefault();
                  commit(normalized);
                  inputRef.current?.focus();
                }}
                onMouseEnter={() => setHighlighted(suggestions.length)}
                className={cn(
                  "flex cursor-pointer items-center gap-1.5 rounded-sm px-2 py-1 font-mono text-[11px] text-muted-foreground transition-colors",
                  highlighted === suggestions.length &&
                    "bg-foreground/8 text-foreground dark:bg-foreground/10",
                )}
              >
                <IconPlus className="size-3 text-emerald-500" />
                Create{" "}
                <span className="text-foreground">
                  &quot;{normalized}&quot;
                </span>
              </li>
            )}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
