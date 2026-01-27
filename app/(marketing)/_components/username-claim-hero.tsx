"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { motion, AnimatePresence } from "motion/react";
import { api } from "@/convex/_generated/api";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { validateUsernameFormat, USERNAME_RULES } from "@/lib/validators";
import { IconCheck, IconX, IconLoader2 } from "@tabler/icons-react";

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
  const [username, setUsername] = useState("");
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [clientError, setClientError] = useState<string | null>(null);

  // Debounce the username for server-side checking
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

  // Determine current state
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

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");

    setUsername(filtered);

    if (filtered.length >= USERNAME_RULES.minLength) {
      setClientError(validateUsernameFormat(filtered));
    } else {
      setClientError(null);
    }
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (state !== "available") return;
    localStorage.setItem(CLAIMED_USERNAME_KEY, username);
    router.push("/login?callbackUrl=/onboarding");
  };

  const errorMessage =
    clientError || (state === "taken" && availabilityResult?.reason);

  const getInputClassName = () => {
    const base = "h-12 text-base font-mono pl-4 pr-12";
    switch (state) {
      case "available":
        return `${base} border-primary focus-visible:border-primary focus-visible:ring-primary/50`;
      case "taken":
      case "invalid":
        return `${base} border-destructive focus-visible:border-destructive focus-visible:ring-destructive/50`;
      default:
        return base;
    }
  };

  const displayUsername = username || "your-username";

  return (
    <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
      {/* Left content */}
      <div>
        <div className="inline-flex items-center gap-2 font-mono text-xs text-primary">
          <span className="size-2 animate-pulse rounded-full bg-primary" />
          REGISTRY ONLINE
        </div>

        <h1 className="mt-6 font-mono text-[clamp(2rem,5vw,3.5rem)] font-bold leading-tight text-foreground">
          npm install
          <br />
          <span className="text-primary">your-components</span>
        </h1>

        <p className="mt-6 max-w-md font-mono text-sm leading-relaxed text-muted-foreground">
          Turn your React components into a personal npm registry. Share with
          your team or the world. Compatible with shadcn/ui CLI.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Input
                type="text"
                placeholder="your-username"
                value={username}
                onChange={handleChange}
                className={getInputClassName()}
                maxLength={USERNAME_RULES.maxLength}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {state === "checking" && (
                  <IconLoader2 className="size-5 animate-spin text-muted-foreground" />
                )}
                {state === "available" && (
                  <IconCheck className="size-5 text-primary" />
                )}
                {(state === "taken" || state === "invalid") && (
                  <IconX className="size-5 text-destructive" />
                )}
              </div>
            </div>
            {errorMessage && (
              <p className="text-sm text-destructive">{errorMessage}</p>
            )}
          </div>

          <Button
            type="submit"
            size="lg"
            className="rounded-none px-8 font-mono"
            disabled={state !== "available"}
          >
            {state === "available"
              ? `Claim @${username}`
              : "Claim your username"}
          </Button>
        </form>
      </div>

      {/* Right terminal */}
      <div className="relative">
        <div className="overflow-hidden rounded-lg border border-border bg-card font-mono text-sm shadow-2xl">
          {/* Terminal header */}
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <div className="size-3 rounded-full bg-destructive/80" />
            <div className="size-3 rounded-full bg-yellow-500/80" />
            <div className="size-3 rounded-full bg-primary/80" />
            <span className="ml-4 text-xs text-muted-foreground">terminal</span>
          </div>
          {/* Terminal content */}
          <div className="space-y-3 p-4 text-foreground">
            <div>
              <span className="text-primary">~</span>{" "}
              <span className="">$</span> npx shadcn@latest add \
            </div>
            <div className="pl-4">
              <span className="">https://{APP_NAME}.dev/r/</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={displayUsername}
                  initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="text-primary"
                >
                  {displayUsername}
                </motion.span>
              </AnimatePresence>
              <span className="">/data-table</span>
            </div>
            <div className="mt-4 text-muted-foreground">
              ✓ Installing dependencies...
            </div>
            <div className="text-muted-foreground">
              ✓ Creating components/ui/...
            </div>
            <div className="text-primary">✓ Done! Component installed.</div>
            <div className="mt-2 flex items-center">
              <span className="text-primary">~</span>{" "}
              <span className="text-muted-foreground">$</span>
              <span className="ml-2 h-4 w-2 animate-pulse bg-primary" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export { CLAIMED_USERNAME_KEY };
