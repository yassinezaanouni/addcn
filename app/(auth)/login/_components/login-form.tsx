"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { IconBrandGithub, IconBrandGoogle } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginForm() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState<"github" | "google" | null>(null);

  // Get callback URL from query params, default to onboarding
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
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGitHubSignIn}
          disabled={isLoading !== null}
        >
          {isLoading === "github" ? (
            <span className="animate-pulse">Signing in...</span>
          ) : (
            <>
              <IconBrandGithub className="size-4" />
              Continue with GitHub
            </>
          )}
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isLoading !== null}
        >
          {isLoading === "google" ? (
            <span className="animate-pulse">Signing in...</span>
          ) : (
            <>
              <IconBrandGoogle className="size-4" />
              Continue with Google
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
