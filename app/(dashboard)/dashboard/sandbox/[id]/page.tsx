"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { SandboxEditor } from "../../editor/_components/sandbox";

interface SandboxPageProps {
  params: Promise<{ id: string }>;
}

export default function SandboxPage({ params }: SandboxPageProps) {
  const { id } = use(params);

  // Fetch sandbox record from Convex to get the name
  const { data: sandbox } = useQuery(
    convexQuery(api.sandboxes.getByCodesandboxId, { codesandboxId: id })
  );

  return (
    <div className="h-[calc(100vh-5rem)]">
      <SandboxEditor sandboxId={id} sandboxName={sandbox?.name} />
    </div>
  );
}
