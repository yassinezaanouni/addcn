"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import {
  IconCheck,
  IconCopy,
  IconKey,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { toast } from "sonner";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ExtensionTokensCard() {
  const queryClient = useQueryClient();
  const { data: tokens = [], isPending } = useQuery(
    convexQuery(api.extensionTokens.listMyTokens, {}),
  );

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [newToken, setNewToken] = useState<string | null>(null);

  const generateMutationFn = useConvexMutation(
    api.extensionTokens.generateToken,
  );
  const generate = useMutation({
    mutationFn: generateMutationFn,
    onSuccess: (result) => {
      setNewToken(result.token);
      setName("");
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ["extensionTokens"] });
    },
    onError: (err) => {
      toast.error("Failed to generate token", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    },
  });

  const revokeMutationFn = useConvexMutation(api.extensionTokens.revokeToken);
  const revoke = useMutation({
    mutationFn: revokeMutationFn,
    onSuccess: () => {
      toast.success("Token revoked");
      queryClient.invalidateQueries({ queryKey: ["extensionTokens"] });
    },
    onError: (err) => {
      toast.error("Failed to revoke token", {
        description: err instanceof Error ? err.message : "An error occurred",
      });
    },
  });

  const { copied, copy } = useCopyToClipboard();

  return (
    <>
      <Card className="max-w-2xl">
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <IconKey className="size-4 text-emerald-500" />
              Extension tokens
            </CardTitle>
            <CardDescription>
              Generate a token to authenticate the addcn VS Code extension.
              The token is shown once at creation time.
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setShowCreate(true)}
            className="gap-1.5"
          >
            <IconPlus className="size-4" />
            New token
          </Button>
        </CardHeader>
        <CardContent>
          {isPending ? (
            <div className="space-y-2">
              <div className="h-12 animate-pulse rounded-md bg-muted/50" />
              <div className="h-12 animate-pulse rounded-md bg-muted/50" />
            </div>
          ) : tokens.length === 0 ? (
            <div className="rounded-md border border-dashed border-border/50 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                No tokens yet. Generate one to use the VS Code extension.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {tokens.map((token) => (
                <li
                  key={token._id}
                  className="flex items-center justify-between gap-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{token.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {token.prefix}…
                      <span className="ml-3">
                        Created {formatDate(token.createdAt)}
                      </span>
                      {token.lastUsedAt && (
                        <span className="ml-3">
                          Last used {formatDate(token.lastUsedAt)}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon-sm"
                    variant="ghost"
                    className="text-destructive/80 hover:text-destructive"
                    title="Revoke"
                    onClick={() =>
                      revoke.mutate({ id: token._id as Id<"extensionTokens"> })
                    }
                    disabled={revoke.isPending}
                  >
                    <IconTrash className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Generate dialog */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreate(false);
            setName("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate extension token</DialogTitle>
            <DialogDescription>
              Give it a recognisable name so you can revoke it later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="token-name">Name</Label>
            <Input
              id="token-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My laptop"
              maxLength={60}
              autoFocus
            />
          </div>
          <DialogFooter showCloseButton>
            <Button
              onClick={() => generate.mutate({ name: name.trim() })}
              disabled={!name.trim() || generate.isPending}
            >
              {generate.isPending ? "Generating…" : "Generate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New token reveal — shown ONCE */}
      <Dialog
        open={newToken !== null}
        onOpenChange={(open) => {
          if (!open) setNewToken(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy your token</DialogTitle>
            <DialogDescription>
              Save this somewhere safe. You won&apos;t be able to see it again
              — if you lose it, just generate a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-md border bg-muted/40 p-3">
            <code className="block break-all font-mono text-xs">
              {newToken}
            </code>
          </div>
          <DialogFooter showCloseButton>
            <Button
              onClick={async () => {
                if (newToken) {
                  await copy(newToken);
                  toast.success("Copied to clipboard");
                }
              }}
              className="gap-1.5"
            >
              {copied ? (
                <IconCheck className="size-4" />
              ) : (
                <IconCopy className="size-4" />
              )}
              {copied ? "Copied" : "Copy token"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
