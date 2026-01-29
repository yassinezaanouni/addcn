"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { motion, AnimatePresence } from "motion/react";
import posthog from "posthog-js";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { validateUsernameFormat, USERNAME_RULES } from "@/lib/validators";
import {
  IconCheck,
  IconX,
  IconLoader2,
  IconArrowRight,
  IconStack2,
} from "@tabler/icons-react";

const ROTATING_WORDS = ["components", "files", "utilities"] as const;
const WORD_ROTATION_MS = 2500;

const DEBOUNCE_MS = 400;
const CLAIMED_USERNAME_KEY = "addcn_claimed_username";

type AvailabilityState =
  | "idle"
  | "checking"
  | "available"
  | "taken"
  | "invalid";

export function UsernameClaimHero() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [wordIndex, setWordIndex] = useState(0);

  // Rotate through words
  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex((prev) => (prev + 1) % ROTATING_WORDS.length);
    }, WORD_ROTATION_MS);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedUsername(username);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [username]);

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

  const getState = useCallback((): AvailabilityState => {
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
  ]);

  const state = getState();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setUsername(filtered);
    if (filtered.length >= USERNAME_RULES.minLength) {
      setClientError(validateUsernameFormat(filtered));
    } else {
      setClientError(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state !== "available") return;
    posthog.capture("username_claim_started", {
      username,
    });
    localStorage.setItem(CLAIMED_USERNAME_KEY, username);
    router.push("/login?callbackUrl=/onboarding");
  };

  const errorMessage =
    clientError || (state === "taken" && availabilityResult?.reason);

  const displayUsername = username || "username";

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
      {/* Left content */}
      <div>
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs text-primary">
          <IconStack2 className="size-4" />
          Free & Open Source
        </div>

        <h1 className="mt-6 font-mono text-3xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-4xl lg:text-5xl">
          <span className="text-muted-foreground/50">$</span> npm install
          <br />
          <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            your-
          </span>
          <span className="relative inline-flex overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={wordIndex}
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "-100%" }}
                transition={{ type: "spring", duration: 0.5, bounce: 0.25 }}
                className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
              >
                {ROTATING_WORDS[wordIndex]}
              </motion.span>
            </AnimatePresence>
          </span>
        </h1>

        <p className="mt-4 max-w-md text-muted-foreground sm:text-lg">
          Turn your React components into a personal registry. Share with your
          team or the world.{" "}
          <span className="text-foreground">
            Compatible with shadcn/ui CLI.
          </span>
        </p>

        <form onSubmit={handleSubmit} className="mt-8">
          <div className="space-y-2">
            {/* Command-line style input */}
            <div
              onClick={() => inputRef.current?.focus()}
              className={`
                group relative cursor-text overflow-hidden rounded-lg border-2 bg-card/50 backdrop-blur-sm transition-all duration-200
                ${
                  state === "available"
                    ? "border-primary shadow-[0_0_20px_-5px] shadow-primary/25"
                    : state === "taken" || state === "invalid"
                      ? "border-destructive shadow-[0_0_20px_-5px] shadow-destructive/25"
                      : isFocused
                        ? "border-primary/50"
                        : "border-border hover:border-border/80"
                }
              `}
            >
              <div className="flex items-center">
                {/* Prompt prefix */}
                <div className="flex items-center gap-2 border-r border-border bg-muted/50 px-3 py-3 font-mono text-sm text-muted-foreground sm:px-4">
                  <span className="text-primary">~</span>
                  <span>$</span>
                </div>

                {/* Input area */}
                <div className="relative flex flex-1 items-center">
                  <span className="pointer-events-none pl-3 font-mono text-sm text-muted-foreground sm:pl-4">
                    claim
                  </span>
                  <span className="pointer-events-none pl-1.5 font-mono text-sm text-foreground">
                    @
                  </span>
                  <input
                    ref={inputRef}
                    type="text"
                    value={username}
                    onChange={handleChange}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="username"
                    maxLength={USERNAME_RULES.maxLength}
                    className="h-11 flex-1 bg-transparent pl-0.5 pr-3 font-mono text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none sm:pr-4"
                  />

                  {/* Status indicator */}
                  <div className="flex items-center gap-2 pr-3 sm:pr-4">
                    <AnimatePresence mode="wait">
                      {state === "checking" && (
                        <motion.div
                          key="checking"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                        >
                          <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
                        </motion.div>
                      )}
                      {state === "available" && (
                        <motion.div
                          key="available"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2 py-0.5"
                        >
                          <IconCheck className="size-3.5 text-primary" />
                          <span className="hidden font-mono text-xs text-primary sm:inline">
                            available
                          </span>
                        </motion.div>
                      )}
                      {(state === "taken" || state === "invalid") && (
                        <motion.div
                          key="taken"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-1.5 rounded-full bg-destructive/10 px-2 py-0.5"
                        >
                          <IconX className="size-3.5 text-destructive" />
                          <span className="hidden font-mono text-xs text-destructive sm:inline">
                            taken
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
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={state !== "available"}
            className="mt-4 h-11 w-full gap-2 font-mono text-sm sm:w-auto"
          >
            {state === "available" ? (
              <>
                Claim @{username}
                <IconArrowRight className="size-4" />
              </>
            ) : (
              "Enter a username to claim"
            )}
          </Button>
        </form>
      </div>

      {/* Right terminal */}
      <div className="relative hidden lg:block">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          {/* Scan line effect */}
          <div className="pointer-events-none absolute inset-0 z-10">
            <div
              className="absolute inset-0 opacity-[0.02]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(0deg, transparent, transparent 2px, currentColor 2px, currentColor 4px)",
              }}
            />
          </div>

          {/* Terminal header */}
          <div className="flex items-center justify-between border-b border-border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="size-3 rounded-full bg-destructive/70" />
              <div className="size-3 rounded-full bg-yellow-500/70" />
              <div className="size-3 rounded-full bg-primary/70" />
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              ~/components
            </span>
            <div className="w-[52px]" />
          </div>

          {/* Terminal content */}
          <div className="space-y-1 p-5 font-mono text-sm">
            {/* Command line */}
            <div className="flex items-start gap-2">
              <span className="text-primary">~</span>
              <span className="text-muted-foreground">$</span>
              <span className="text-foreground">npx shadcn@latest add \</span>
            </div>

            {/* URL with animated username */}
            <div className="pl-6 leading-relaxed">
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
              <span className="text-muted-foreground">/data-table</span>
            </div>

            <div className="h-4" />

            {/* Progress output */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-primary">✓</span>
                <span>Fetching registry...</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-primary">✓</span>
                <span>Installing dependencies...</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <span className="text-primary">✓</span>
                <span>Creating components/ui/data-table.tsx</span>
              </div>
            </div>

            <div className="h-2" />

            {/* Success message */}
            <div className="rounded-md border border-primary/20 bg-primary/5 px-3 py-2">
              <span className="font-medium text-primary">
                Done! Component installed successfully.
              </span>
            </div>

            {/* New prompt */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-primary">~</span>
              <span className="text-muted-foreground">$</span>
              <span className="ml-0.5 inline-block h-5 w-2 animate-pulse bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CLAIMED_USERNAME_KEY };
