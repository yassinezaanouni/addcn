"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconBrandGithub, IconBrandGoogle, IconLoader2 } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/lib/constants";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<"github" | "google" | null>(null);

  const callbackUrl = searchParams.get("callbackUrl") || "/onboarding";

  const handleGitHubSignIn = async () => {
    setIsLoading("github");
    try {
      await authClient.signIn.social({
        provider: "github",
        callbackURL: callbackUrl,
      });
    } catch {
      setIsLoading(null);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading("google");
    try {
      await authClient.signIn.social({
        provider: "google",
        callbackURL: callbackUrl,
      });
    } catch {
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
          SECURE LOGIN
        </div>
        <h1 className="font-mono text-2xl font-bold text-foreground sm:text-3xl">
          Welcome to {APP_NAME}
        </h1>
        <p className="mt-2 text-muted-foreground">
          Sign in to access your component registry
        </p>
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

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 font-mono text-xs text-muted-foreground">
            SECURE AUTHENTICATION
          </span>
        </div>
      </div>

      {/* Footer text */}
      <p className="text-center text-xs text-muted-foreground">
        By continuing, you agree to our{" "}
        <a href="/terms" className="link-underline text-foreground">
          Terms of Service
        </a>{" "}
        and{" "}
        <a href="/privacy" className="link-underline text-foreground">
          Privacy Policy
        </a>
      </p>
    </div>
  );
}
