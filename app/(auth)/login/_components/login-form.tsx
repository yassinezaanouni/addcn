"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";

const CLAIMED_USERNAME_KEY = "addcn_claimed_username";
import posthog from "posthog-js";
import {
  IconBrandGithub,
  IconBrandGoogle,
  IconLoader2,
} from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";
import { useTypewriter } from "@/hooks/use-typewriter";

function BlinkingCursor() {
  return (
    <motion.span
      className="ml-0.5 inline-block h-[1em] w-[2px] bg-primary align-middle"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.8, repeat: Infinity, repeatType: "reverse" }}
    />
  );
}

export function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<"github" | "google" | null>(null);
  const [claimedUsername, setClaimedUsername] = useState<string | null>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [showSubtitle, setShowSubtitle] = useState(false);

  const callbackUrl = searchParams.get("callbackUrl") || "/onboarding";

  useEffect(() => {
    // Read from localStorage after hydration to avoid SSR mismatch
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncing localStorage on mount
    setClaimedUsername(localStorage.getItem(CLAIMED_USERNAME_KEY));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: tracking hydration state
    setHasMounted(true);
  }, []);

  const animationSteps = useMemo(() => {
    if (!hasMounted) {
      return [];
    }

    if (claimedUsername) {
      return [
        { type: "type" as const, text: `Welcome to ${APP_NAME}, ` },
        { type: "pause" as const, duration: 300 },
        { type: "type" as const, text: `@${claimedUsername}` },
        { type: "complete" as const },
      ];
    }

    return [
      { type: "type" as const, text: `Welcome to ${APP_NAME}` },
      { type: "complete" as const },
    ];
  }, [claimedUsername, hasMounted]);

  const { displayText, showCursor } = useTypewriter({
    steps: animationSteps,
    onComplete: () => setShowSubtitle(true),
    enabled: hasMounted,
  });

  // Parse display text to highlight @username portion
  const renderDisplayText = () => {
    const atIndex = displayText.indexOf("@");
    if (atIndex !== -1) {
      return (
        <>
          {displayText.slice(0, atIndex)}
          <span className="text-primary">{displayText.slice(atIndex)}</span>
        </>
      );
    }
    return displayText;
  };

  const handleGitHubSignIn = async () => {
    setIsLoading("github");
    posthog.capture("sign_in_started", {
      provider: "github",
    });
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: callbackUrl,
      });
    } catch (error) {
      posthog.captureException(error);
      setIsLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading("google");
    posthog.capture("sign_in_started", {
      provider: "google",
    });
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } catch (error) {
      posthog.captureException(error);
      setIsLoading(null);
    }
  };

  return (
    <div className="w-full max-w-sm">
      {/* Header */}
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 font-mono text-xs text-primary">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          SIGN IN
        </div>
        <h1 className="font-mono text-2xl font-bold text-foreground sm:text-3xl">
          {/* Invisible placeholder for layout stability before hydration */}
          {!hasMounted && (
            <span className="invisible">Welcome to {APP_NAME}</span>
          )}
          {hasMounted && (
            <>
              {renderDisplayText()}
              {showCursor && <BlinkingCursor />}
            </>
          )}
        </h1>
        <motion.p
          className="mt-2 text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: showSubtitle ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {claimedUsername
            ? "Sign in to claim your namespace"
            : "Sign in to access your snippet registry"}
        </motion.p>
      </div>

      {/* Auth buttons */}
      <div className="space-y-3">
        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full gap-3 border-2 font-medium transition-all hover:border-primary/50 hover:bg-primary/5"
          onClick={handleGitHubSignIn}
          disabled={isLoading !== null}
        >
          {isLoading === "github" ? (
            <>
              <IconLoader2 className="size-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <IconBrandGithub className="size-5" />
              Continue with GitHub
            </>
          )}
        </Button>

        <Button
          variant="outline"
          size="lg"
          className="h-12 w-full gap-3 border-2 font-medium transition-all hover:border-primary/50 hover:bg-primary/5"
          onClick={handleGoogleSignIn}
          disabled={isLoading !== null}
        >
          {isLoading === "google" ? (
            <>
              <IconLoader2 className="size-5 animate-spin" />
              Connecting...
            </>
          ) : (
            <>
              <IconBrandGoogle className="size-5" />
              Continue with Google
            </>
          )}
        </Button>
      </div>

      {/* Footer text */}
      <div className="mt-6" />
      <p className="text-center text-xs text-muted-foreground">
        By continuing, you agree to our{" "}
        <Link href="/terms" className="link-underline text-foreground">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link href="/privacy" className="link-underline text-foreground">
          Privacy Policy
        </Link>
      </p>
    </div>
  );
}
