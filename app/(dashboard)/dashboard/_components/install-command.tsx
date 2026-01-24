"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { IconTerminal, IconCopy, IconCheck } from "@tabler/icons-react";
import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard";
import { usePreferencesStore } from "@/stores/preferences-store";
import { toast } from "sonner";

type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

const PACKAGE_MANAGERS: { id: PackageManager; label: string; prefix: string }[] = [
  { id: "pnpm", label: "pnpm", prefix: "pnpm dlx" },
  { id: "npm", label: "npm", prefix: "npx" },
  { id: "yarn", label: "yarn", prefix: "npx" },
  { id: "bun", label: "bun", prefix: "bunx" },
];

interface InstallCommandProps {
  registryUrl: string;
}

export function InstallCommand({ registryUrl }: InstallCommandProps) {
  const packageManager = usePreferencesStore((s) => s.packageManager);
  const setPackageManager = usePreferencesStore((s) => s.setPackageManager);
  const { copied, copy } = useCopyToClipboard();

  const getCommand = (pm: PackageManager) => {
    const manager = PACKAGE_MANAGERS.find((m) => m.id === pm);
    return `${manager?.prefix} shadcn@latest add "${registryUrl}"`;
  };

  const handleCopy = () => {
    copy(getCommand(packageManager));
    toast.success("Command copied");
  };

  return (
    <div className="relative overflow-hidden rounded-md border bg-muted/30">
      <Tabs
        value={packageManager}
        onValueChange={(v) => setPackageManager(v as PackageManager)}
        className="gap-0"
      >
        <div className="flex items-center gap-2 border-b border-border/50 px-3 py-1">
          <div className="flex size-4 items-center justify-center rounded-[1px] bg-foreground opacity-70">
            <IconTerminal className="size-3 text-background" />
          </div>
          <TabsList variant="line" className="h-7 gap-0 rounded-none bg-transparent p-0">
            {PACKAGE_MANAGERS.map((pm) => (
              <TabsTrigger
                key={pm.id}
                value={pm.id}
                className="h-7 rounded-md border border-transparent px-2 pt-0.5 data-[state=active]:border-input data-[state=active]:bg-accent data-[state=active]:shadow-none"
              >
                {pm.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <div className="overflow-hidden">
          {PACKAGE_MANAGERS.map((pm) => (
            <TabsContent key={pm.id} value={pm.id} className="mt-0 px-3 py-2.5 pr-8">
              <code className="block truncate font-mono text-xs leading-none">
                {getCommand(pm.id)}
              </code>
            </TabsContent>
          ))}
        </div>
      </Tabs>
      <Button
        variant="ghost"
        size="icon-sm"
        className="absolute right-1.5 top-1.5 size-6 opacity-70 hover:opacity-100"
        onClick={handleCopy}
      >
        <span className="sr-only">Copy</span>
        {copied ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
      </Button>
    </div>
  );
}
