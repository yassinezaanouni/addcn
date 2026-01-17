"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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

const USERNAME_RULES = {
  minLength: 3,
  maxLength: 39,
  pattern: /^[a-z0-9-]+$/,
};

function validateUsername(username: string): string | null {
  if (username.length < USERNAME_RULES.minLength) {
    return `Username must be at least ${USERNAME_RULES.minLength} characters`;
  }
  if (username.length > USERNAME_RULES.maxLength) {
    return `Username must be at most ${USERNAME_RULES.maxLength} characters`;
  }
  if (!USERNAME_RULES.pattern.test(username)) {
    return "Username can only contain lowercase letters, numbers, and hyphens";
  }
  if (username.startsWith("-") || username.endsWith("-")) {
    return "Username cannot start or end with a hyphen";
  }
  if (username.includes("--")) {
    return "Username cannot contain consecutive hyphens";
  }
  return null;
}

export function UsernameForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: setUsernameMutation, isPending } = useMutation({
    mutationFn: useConvexMutation(api.users.setUsername),
    onSuccess: () => {
      router.push("/");
    },
    onError: (err) => {
      setError(err.message || "Failed to set username");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validateUsername(username);
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
              3-39 characters, lowercase letters, numbers, and hyphens only
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
