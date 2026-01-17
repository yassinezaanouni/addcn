"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { UsernameForm } from "./_components/username-form";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: user, isLoading } = useQuery(convexQuery(api.users.getMe, {}));

  useEffect(() => {
    // If user already has a username, redirect to dashboard
    if (user?.username) {
      router.replace("/");
    }
  }, [user, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If user already has username, show nothing while redirecting
  if (user?.username) {
    return null;
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <UsernameForm />
    </div>
  );
}
