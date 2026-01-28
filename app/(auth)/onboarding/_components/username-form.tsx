"use client";

import { useState, useEffect, useCallback, startTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { motion, AnimatePresence } from "motion/react";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { validateUsernameFormat, USERNAME_RULES } from "@/lib/validators";
import { APP_NAME } from "@/lib/constants";
import {
  IconCheck,
  IconX,
  IconLoader2,
  IconArrowRight,
} from "@tabler/icons-react";

const CLAIMED_USERNAME_KEY = "addcn_claimed_username";
const DEBOUNCE_MS = 400;

type AvailabilityState =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid";

export function UsernameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);

  // Pre-fill username from URL params or localStorage
  useEffect(() => {
    const urlUsername = searchParams.get("username");
    if (urlUsername) {
      const filtered = urlUsername.toLowerCase().replace(/[^a-z0-9-]/g, "");
      startTransition(() => {
        setUsername(filtered);
        setDebouncedUsername(filtered);
      });
      return;
    }

    const storedUsername = localStorage.getItem(CLAIMED_USERNAME_KEY);
    if (storedUsername) {
      startTransition(() => {
        setUsername(storedUsername);
        setDebouncedUsername(storedUsername);
      });
    }
  }, [searchParams]);

  // Debounce username for server check
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [username]);

  // Server-side availability check
  const {
    data: availabilityResult,
    isLoading: isChecking,
    isFetched,
  } = useQuery({
    ...convexQuery(api.users.checkUsernameAvailability, {
      username: debouncedUsername,
    }),
    enabled:
      debouncedUsername.length >= USERNAME_RULES.minLength && !clientError,
  });

  const setUsernameMutationFn = useConvexMutation(api.users.setUsername);
  const {
    mutate: setUsernameMutation,
    isPending,
    isSuccess,
  } = useMutation({
    mutationFn: setUsernameMutationFn,
    onSuccess: (_, variables) => {
      // Identify user in PostHog using username as distinct ID
      posthog.identify(variables.username, {
        username: variables.username,
      });
      // Capture username claimed event
      posthog.capture("username_claimed", {
        username: variables.username,
      });
      localStorage.removeItem(CLAIMED_USERNAME_KEY);
      router.push("/dashboard");
    },
    onError: (err) => {
      posthog.captureException(err);
      setClientError(err.message || "Failed to set username");
    },
  });

  const getState = useCallback((): AvailabilityState => {
    // After successful submission, keep showing "available" until redirect completes
    if (isSuccess) {
      return "available";
    }
    if (!username || username.length < USERNAME_RULES.minLength) {
      return "idle";
    }
    if (clientError) {
      return "invalid";
    }
    if (username !== debouncedUsername || isChecking) {
      return "checking";
    }
    if (isFetched && availabilityResult) {
      return availabilityResult.available ? "available" : "taken";
    }
    return "idle";
  }, [
    username,
    debouncedUsername,
    clientError,
    isChecking,
    isFetched,
    availabilityResult,
    isSuccess,
  ]);

  const state = getState();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state !== "available" || isPending) return;

    const validationError = validateUsernameFormat(username);
    if (validationError) {
      setClientError(validationError);
      return;
    }

    setUsernameMutation({ username });
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setUsername(filtered);
    setClientError(null);

    if (filtered.length >= USERNAME_RULES.minLength) {
      setClientError(validateUsernameFormat(filtered));
    }
  };

  // Don't show "taken" error while submitting (race condition with availability check)
  const errorMessage =
    clientError ||
    (!isPending && state === "taken" && availabilityResult?.reason);
  const displayUsername = username || "username";

  return (
    <div className="w-full max-w-lg">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-xs text-primary">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          FINAL STEP
        </div>
        <h1 className="font-mono text-2xl font-bold text-foreground sm:text-3xl">
          Claim your namespace
        </h1>
        <p className="mt-2 text-muted-foreground">
          This will be your unique registry URL
        </p>
      </div>

      {/* URL Preview Card */}
      <div className="mb-6 overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border bg-muted/30 px-4 py-2">
          <span className="font-mono text-xs text-muted-foreground">
            Your registry URL
          </span>
        </div>
        <div className="p-4 font-mono text-sm">
          <span className="text-muted-foreground">
            https://{APP_NAME}.dev/r/
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={displayUsername}
              initial={{ opacity: 0, y: 4, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -4, filter: "blur(4px)" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="font-semibold text-primary"
            >
              {displayUsername}
            </motion.span>
          </AnimatePresence>
          <span className="text-muted-foreground">/</span>
          <span className="text-muted-foreground/60">[component]</span>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        {/* Command-line style input */}
        <div
          className={`
            group relative overflow-hidden rounded-lg border-2 bg-card/50 backdrop-blur-sm transition-all duration-300
            ${
              state === "available"
                ? "border-primary shadow-[0_0_20px_-5px] shadow-primary/30"
                : state === "taken" || state === "invalid"
                  ? "border-destructive shadow-[0_0_20px_-5px] shadow-destructive/30"
                  : isFocused
                    ? "border-primary/50 shadow-lg"
                    : "border-border hover:border-primary/30"
            }
          `}
        >
          <div className="flex items-center">
            {/* Prompt prefix */}
            <div className="flex items-center gap-2 border-r border-border bg-muted/50 px-4 py-3.5 font-mono text-sm text-muted-foreground">
              <span className="text-primary">@</span>
            </div>

            {/* Input area */}
            <div className="relative flex flex-1 items-center">
              <input
                type="text"
                value={username}
                onChange={handleUsernameChange}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="your-username"
                maxLength={USERNAME_RULES.maxLength}
                disabled={isPending}
                autoFocus
                className="h-12 flex-1 bg-transparent px-4 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />

              {/* Status indicator */}
              <div className="flex items-center gap-2 pr-4">
                <AnimatePresence mode="wait">
                  {(state === "checking" || isPending) && (
                    <motion.div
                      key="checking"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                    >
                      <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
                    </motion.div>
                  )}
                  {state === "available" && !isPending && (
                    <motion.div
                      key="available"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-1"
                    >
                      <IconCheck className="size-4 text-primary" />
                      <span className="font-mono text-xs text-primary">
                        available
                      </span>
                    </motion.div>
                  )}
                  {(state === "taken" || state === "invalid") && !isPending && (
                    <motion.div
                      key="taken"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-1"
                    >
                      <IconX className="size-4 text-destructive" />
                      <span className="font-mono text-xs text-destructive">
                        {state === "taken" ? "taken" : "invalid"}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.p
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="font-mono text-sm text-destructive"
            >
              {errorMessage}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Helper text */}
        <p className="text-xs text-muted-foreground">
          {USERNAME_RULES.minLength}-{USERNAME_RULES.maxLength} characters,
          lowercase letters, numbers, and hyphens only
        </p>

        {/* Submit button */}
        <Button
          type="submit"
          size="lg"
          disabled={state !== "available" || isPending}
          className="h-12 w-full gap-2 font-mono text-sm mt-4"
        >
          {isPending ? (
            <>
              <IconLoader2 className="size-4 animate-spin" />
              Creating your registry...
            </>
          ) : state === "available" ? (
            <>
              Continue as @{username}
              <IconArrowRight className="size-4" />
            </>
          ) : (
            "Enter a valid username"
          )}
        </Button>
      </form>
    </div>
  );
}
