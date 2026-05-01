"use client";

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { validateUsernameFormat, USERNAME_RULES } from "@/lib/validators";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { ExtensionTokensCard } from "./_components/extension-tokens-card";

function ProfileFormSkeleton() {
  return (
    <Card className="max-w-md">
      <CardHeader>
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-10 w-full" />
        </div>
        <Skeleton className="h-10 w-24" />
      </CardContent>
    </Card>
  );
}

interface User {
  username: string;
  email: string;
  avatarUrl?: string;
}

function ProfileForm({ user }: { user: User }) {
  const [username, setUsername] = useState(user.username);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "");
  const [error, setError] = useState<string | null>(null);

  const updateProfileMutationFn = useConvexMutation(api.users.updateMe);
  const { mutate: updateProfile, isPending: isUpdating } = useMutation({
    mutationFn: updateProfileMutationFn,
    onSuccess: () => {
      toast.success("Profile updated successfully");
    },
    onError: (err) => {
      setError(err.message || "Failed to update profile");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate username
    const validationError = validateUsernameFormat(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Build updates object - only include changed fields
    const updates: { username?: string; avatarUrl?: string } = {};

    if (username !== user.username) {
      updates.username = username;
    }

    const newAvatarUrl = avatarUrl.trim() || undefined;
    if (newAvatarUrl !== user.avatarUrl) {
      updates.avatarUrl = newAvatarUrl;
    }

    // Only submit if there are changes
    if (Object.keys(updates).length === 0) {
      toast.info("No changes to save");
      return;
    }

    updateProfile(updates);
  };

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filtered = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setUsername(filtered);
    setError(null);
  };

  const handleAvatarUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarUrl(e.target.value);
    setError(null);
  };

  const hasChanges =
    username !== user.username ||
    (avatarUrl.trim() || undefined) !== user.avatarUrl;

  return (
    <Card className="max-w-md">
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>
          Update your personal information and avatar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar preview */}
          <div className="flex items-center gap-4">
            <Avatar className="size-16">
              <AvatarImage
                src={avatarUrl || user.avatarUrl}
                alt={username || user.username}
              />
              <AvatarFallback className="text-lg">
                {(username || user.username).charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">@{username || user.username}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          {/* Username field */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">@</span>
              <Input
                id="username"
                type="text"
                placeholder="my-username"
                value={username}
                onChange={handleUsernameChange}
                maxLength={USERNAME_RULES.maxLength}
                disabled={isUpdating}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              3-39 characters, lowercase letters, numbers, and hyphens only
            </p>
          </div>

          {/* Avatar URL field */}
          <div className="space-y-2">
            <Label htmlFor="avatarUrl">Avatar URL</Label>
            <Input
              id="avatarUrl"
              type="url"
              placeholder="https://example.com/avatar.png"
              value={avatarUrl}
              onChange={handleAvatarUrlChange}
              disabled={isUpdating}
            />
            <p className="text-xs text-muted-foreground">
              Enter a URL to an image to use as your avatar
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button type="submit" disabled={isUpdating || !hasChanges}>
            {isUpdating ? "Saving..." : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  const { data: user, isPending } = useQuery(convexQuery(api.users.getMe, {}));

  if (isPending) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and profile information.
          </p>
        </div>
        <ProfileFormSkeleton />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and profile information.
        </p>
      </div>
      <ProfileForm key={user.username} user={user} />
      <ExtensionTokensCard />
    </div>
  );
}
