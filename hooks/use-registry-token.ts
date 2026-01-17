"use client";

import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { JWT_EXPIRATION_SECONDS } from "@/lib/constants";

// Cache token for 90% of its lifetime to avoid using expired tokens
const TOKEN_STALE_TIME_MS = JWT_EXPIRATION_SECONDS * 1000 * 0.9;

/**
 * Hook to get the current user's JWT token from Better Auth.
 * Uses the Convex plugin's getToken endpoint which returns a JWT
 * tied to the user's session.
 */
export function useRegistryToken() {
  const { data: session } = authClient.useSession();

  const { data: tokenData, isLoading } = useQuery({
    queryKey: ["registry-token", session?.user?.id],
    queryFn: async () => {
      // Use Better Auth client to call the Convex token endpoint
      const response = await authClient.$fetch<{ token: string }>(
        "/convex/token"
      );
      return response.data;
    },
    enabled: !!session?.user, // Only fetch if user is logged in
    staleTime: TOKEN_STALE_TIME_MS,
    retry: false,
  });

  return {
    token: tokenData?.token ?? null,
    isLoading,
  };
}
