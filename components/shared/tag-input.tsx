"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import {
  MAX_TAGS_PER_SNIPPET,
  normalizeTag,
  TAG_RULES,
} from "@/lib/validators";
import { cn } from "@/lib/utils";
import { IconHash, IconPlus, IconX } from "@tabler/icons-react";

interface TagInputProps {
  tags: string[];
  knownTags: string[];
  onAdd: (tag: string) => void;
  onRemove: (tag: string) => void;
  /**
   * Cap on tags. Defaults to the snippet limit; commands reuse it.
   */
  maxTags?: number;
}

export function TagInput({
  tags,
  knownTags,
  onAdd,
  onRemove,
  maxTags = MAX_TAGS_PER_SNIPPET,
}: TagInputProps) {
  const [input, setInput] = useState("");
  const [highlighted, setHighlighted] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [fieldRect, setFieldRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fieldRef = useRef<HTMLDivElement>(null);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listboxId = useId();

  // Track the input field's screen position while the dropdown is open. The
  // initial read is intentional — this is the documented "sync with the DOM"
  // pattern; the rule prohibits inadvertent re-render loops which we don't
  // trigger.
  useEffect(() => {
    if (!isOpen) return;
    const update = () => {
      const el = fieldRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      setFieldRect({ top: rect.bottom, left: rect.left, width: rect.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [isOpen]);

  const reachedMax = tags.length >= maxTags;
  const remaining = maxTags - tags.length;

  const lowerInput = input.trim().toLowerCase();

  const suggestions = useMemo(() => {
    return knownTags
      .filter((t) => !tags.includes(t))
      .filter((t) => !lowerInput || t.includes(lowerInput))
      .slice(0, 6);
  }, [knownTags, tags, lowerInput]);

  const normalized = normalizeTag(input);
  const showCreate =
    !!normalized &&
    !knownTags.includes(normalized) &&
    !tags.includes(normalized);

  const totalOptions = suggestions.length + (showCreate ? 1 : 0);

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
    if (tags.length >= maxTags) return;
    onAdd(tag);
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
        commit(input);
      }
    } else if (e.key === "Backspace" && input === "" && tags.length > 0) {
      e.preventDefault();
      onRemove(tags[tags.length - 1]);
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
    blurTimer.current = setTimeout(() => setIsOpen(false), 120);
  };

  const showDropdown =
    isOpen &&
    totalOptions > 0 &&
    !reachedMax &&
    fieldRect &&
    typeof document !== "undefined";

  return (
    <div className="space-y-1.5">
      <div
        ref={fieldRef}
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5 text-xs transition-colors",
          "focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/20",
          reachedMax && "border-amber-500/40",
        )}
      >
        {tags.map((tag) => (
          <span
            key={tag}
            className="group flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 font-mono text-[11px] text-emerald-600 dark:text-emerald-400"
          >
            <IconHash className="size-3 opacity-60" />
            {tag}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(tag);
              }}
              aria-label={`Remove tag ${tag}`}
              className="ml-0.5 rounded p-0.5 opacity-60 transition-all hover:bg-emerald-500/20 hover:opacity-100"
            >
              <IconX className="size-3" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          disabled={reachedMax}
          placeholder={
            reachedMax ? "" : tags.length === 0 ? "Add tags…" : "+ tag"
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

      <p className="text-[10px] text-muted-foreground/70">
        {reachedMax
          ? `Maximum of ${maxTags} tags reached`
          : `Press Enter to add. ${remaining} ${remaining === 1 ? "tag" : "tags"} left.`}
      </p>

      {showDropdown &&
        createPortal(
          <ul
            id={listboxId}
            role="listbox"
            style={{
              position: "fixed",
              top: fieldRect.top + 4,
              left: fieldRect.left,
              width: fieldRect.width,
              maxHeight: "12rem",
            }}
            className="z-50 space-y-0.5 overflow-y-auto rounded-md border border-border/50 bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/5"
            onMouseDown={(e) => e.preventDefault()}
          >
            {suggestions.map((tag, i) => (
              <li
                key={tag}
                id={`${listboxId}-${i}`}
                role="option"
                aria-selected={highlighted === i}
                onMouseDown={() => {
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
                onMouseDown={() => {
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
          </ul>,
          document.body,
        )}
    </div>
  );
}
