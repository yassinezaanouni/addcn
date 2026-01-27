"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { validateUsernameFormat, USERNAME_RULES } from "@/lib/validators";

const CLAIMED_USERNAME_KEY = "addcn_claimed_username";

export function UsernameForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Pre-fill username from URL params or localStorage
  useEffect(() => {
    const urlUsername = searchParams.get("username");
    if (urlUsername) {
      setUsername(urlUsername.toLowerCase());
      return;
    }

    const storedUsername = localStorage.getItem(CLAIMED_USERNAME_KEY);
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, [searchParams]);

  const setUsernameMutationFn = useConvexMutation(api.users.setUsername);
  const { mutate: setUsernameMutation, isPending } = useMutation({
    mutationFn: setUsernameMutationFn,
    onSuccess: () => {
      // Clear the claimed username from localStorage
      localStorage.removeItem(CLAIMED_USERNAME_KEY);
      router.push("/");
    },
    onError: (err) => {
      setError(err.message || "Failed to set username");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateUsernameFormat(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setUsernameMutation({ username });
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase();
    setUsername(value);
    setError(null);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Choose your username</CardTitle>
        <CardDescription>
          This will be your unique identifier on the platform
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="my-username"
              value={username}
              onChange={handleUsernameChange}
              disabled={isPending}
              autoFocus
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <p className="text-xs text-muted-foreground">
              {USERNAME_RULES.minLength}-{USERNAME_RULES.maxLength} characters, lowercase letters, numbers, and hyphens only
            </p>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Setting username..." : "Continue"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
