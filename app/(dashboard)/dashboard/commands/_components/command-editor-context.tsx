"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { Id } from "@/convex/_generated/dataModel";

type EditingTarget = Id<"commands"> | "new" | null;

interface CommandEditorContextValue {
  editingId: EditingTarget;
  open: (target: Id<"commands"> | "new") => void;
  close: () => void;
}

const CommandEditorContext = createContext<CommandEditorContextValue | null>(
  null,
);

const PARAM = "edit";

function readFromUrl(): EditingTarget {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const value = params.get(PARAM);
  if (!value) return null;
  return value === "new" ? "new" : (value as Id<"commands">);
}

/**
 * Local-state command-editor open/close, with URL sync via
 * `window.history.replaceState`. Driving the sheet from React state instead
 * of Next's router skips the RSC refetch that `<Link>` and `router.replace`
 * trigger on each toggle (very noticeable in dev mode where prefetch is off
 * and there's no router cache). The URL still reflects state, so deep links
 * and refreshes work as before.
 */
export function CommandEditorProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [editingId, setEditingId] = useState<EditingTarget>(() => readFromUrl());

  // Mirror state in a ref so we can read the previous value from inside event
  // handlers without putting side-effects in a setState updater (React can
  // re-run those during render and Next's patched history would then trigger
  // a Router setState mid-render → "Cannot update a component while
  // rendering" warning).
  const editingIdRef = useRef<EditingTarget>(editingId);
  useEffect(() => {
    editingIdRef.current = editingId;
  }, [editingId]);

  const writeUrl = useCallback(
    (target: EditingTarget, mode: "push" | "replace") => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      if (target === null) {
        url.searchParams.delete(PARAM);
      } else {
        url.searchParams.set(PARAM, target);
      }
      const next = url.pathname + (url.search || "") + (url.hash || "");
      if (mode === "push") {
        window.history.pushState(null, "", next);
      } else {
        window.history.replaceState(null, "", next);
      }
    },
    [],
  );

  const open = useCallback(
    (target: Id<"commands"> | "new") => {
      const wasOpen = editingIdRef.current !== null;
      // First open → push so the back button closes the sheet. Switching
      // commands while open → replace, so the back stack doesn't grow.
      writeUrl(target, wasOpen ? "replace" : "push");
      editingIdRef.current = target;
      setEditingId(target);
    },
    [writeUrl],
  );

  const close = useCallback(() => {
    writeUrl(null, "replace");
    editingIdRef.current = null;
    setEditingId(null);
  }, [writeUrl]);

  // React to back/forward navigation so the sheet follows the URL.
  useEffect(() => {
    const onPop = () => {
      setEditingId(readFromUrl());
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  return (
    <CommandEditorContext.Provider value={{ editingId, open, close }}>
      {children}
    </CommandEditorContext.Provider>
  );
}

export function useCommandEditor() {
  const ctx = useContext(CommandEditorContext);
  if (!ctx) {
    throw new Error(
      "useCommandEditor must be used inside CommandEditorProvider",
    );
  }
  return ctx;
}
