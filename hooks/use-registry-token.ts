"use client";

import { authClient } from "@/lib/auth-client";

/**
 * Hook to get the current user's session ID for authenticated registry access.
 * Returns the session ID directly - simpler and more honest than using JWTs
 * when we're only validating the session anyway.
 */
export function useRegistryToken() {
  const { data: sessionData, isPending } = authClient.useSession();

  return {
    // The session object contains the session ID
    token: sessionData?.session?.id ?? null,
    isLoading: isPending,
  };
}
