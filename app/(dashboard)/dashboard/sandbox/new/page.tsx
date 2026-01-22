"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { IconLoader2 } from "@tabler/icons-react";
import { toast } from "sonner";
import { createNewSandbox } from "../../editor/_components/sandbox/api";

export default function NewSandboxPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // Convex mutation to store sandbox record
  const createSandboxRecordFn = useConvexMutation(api.sandboxes.create);
  const createSandboxRecord = useMutation({
    mutationFn: createSandboxRecordFn,
  });

  useEffect(() => {
    async function create() {
      try {
        // Create sandbox in CodeSandbox
        const result = await createNewSandbox();

        // Store in Convex
        await createSandboxRecord.mutateAsync({
          codesandboxId: result.sandboxId,
          name: result.name,
        });

        // Redirect to the sandbox editor
        router.replace(`/dashboard/sandbox/${result.sandboxId}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to create sandbox";
        setError(message);
        toast.error("Failed to create sandbox", { description: message });
      }
    }

    create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  if (error) {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-destructive">Error</h1>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-4 text-primary underline"
          >
            Go back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <IconLoader2 size={32} className="animate-spin text-primary" />
        <div className="text-center">
          <h1 className="text-lg font-semibold">Creating Sandbox</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Setting up your development environment...
          </p>
        </div>
      </div>
    </div>
  );
}
