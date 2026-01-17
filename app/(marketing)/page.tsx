import Link from "next/link";
import { Button } from "@/components/ui/button";
import { IconArrowRight } from "@tabler/icons-react";
import { APP_NAME } from "@/lib/constants";

export default function Home() {
  return (
    <main className="flex min-h-[calc(100vh-3.5rem)] flex-col items-center justify-center px-4">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
          Build your own{" "}
          <span className="text-primary">shadcn registry</span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-muted-foreground">
          Create, manage, and share custom React components as shadcn-compatible
          registry packages. Install them anywhere with a single command.
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href="/dashboard">
            <Button size="lg">
              Go to Dashboard
              <IconArrowRight className="ml-2 size-4" />
            </Button>
          </Link>
        </div>
        <div className="mt-8">
          <code className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
            npx shadcn@latest add https://{APP_NAME}.dev/r/username/component.json
          </code>
        </div>
      </div>
    </main>
  );
}
