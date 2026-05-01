"use client";

import { useParams, notFound } from "next/navigation";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { Doc } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IconPackage,
  IconDownload,
  IconCopy,
  IconCheck,
  IconFile,
  IconFileTypeTs,
  IconFileTypeCss,
} from "@tabler/icons-react";
import Link from "next/link";

function SnippetSkeleton() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <div className="mb-8">
        <Skeleton className="mb-2 h-4 w-32" />
        <Skeleton className="mb-2 h-8 w-64" />
        <Skeleton className="mb-4 h-4 w-full max-w-md" />
        <div className="flex gap-2">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-20" />
        </div>
      </div>
      <Skeleton className="mb-6 h-12 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function getFileIcon(file: Doc<"snippets">["files"][number]) {
  if (file.language === "css" || file.type === "style") {
    return <IconFileTypeCss className="size-4" />;
  }
  if (file.language === "typescript") {
    return <IconFileTypeTs className="size-4" />;
  }
  return <IconFile className="size-4" />;
}

function getFileName(path: string): string {
  return path.split("/").pop() || path;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className="shrink-0"
    >
      {copied ? (
        <>
          <IconCheck className="size-4" />
          Copied
        </>
      ) : (
        <>
          <IconCopy className="size-4" />
          Copy
        </>
      )}
    </Button>
  );
}

function InstallCommand({
  namespace,
  snippetName,
}: {
  namespace: string;
  snippetName: string;
}) {
  const siteUrl = process.env.NEXT_PUBLIC_CONVEX_SITE_URL || "";
  const registryUrl = `${siteUrl}/r/${namespace}/${snippetName}.json`;
  const installCommand = `pnpm dlx shadcn@latest add ${registryUrl}`;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Installation</CardTitle>
        <CardDescription>
          Install this snippet using the shadcn CLI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2">
          <code className="flex-1 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-sm">
            {installCommand}
          </code>
          <CopyButton text={installCommand} />
        </div>
      </CardContent>
    </Card>
  );
}

function FilePreview({ files }: { files: Doc<"snippets">["files"] }) {
  const [selectedFileId, setSelectedFileId] = useState(files[0]?.id || "");

  if (files.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <IconFile />
              </EmptyMedia>
              <EmptyTitle>No files</EmptyTitle>
              <EmptyDescription>This snippet has no files.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Files</CardTitle>
        <CardDescription>
          {files.length} file{files.length !== 1 ? "s" : ""} in this snippet
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={selectedFileId} onValueChange={setSelectedFileId}>
          <div className="border-b px-4">
            <TabsList className="h-auto w-full justify-start gap-2 bg-transparent p-0">
              {files.map((file) => (
                <TabsTrigger
                  key={file.id}
                  value={file.id}
                  className="flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 data-[state=active]:border-primary data-[state=active]:bg-transparent"
                >
                  {getFileIcon(file)}
                  <span className="max-w-32 truncate text-xs">
                    {getFileName(file.path)}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
          {files.map((file) => (
            <TabsContent key={file.id} value={file.id} className="m-0">
              <div className="relative">
                <div className="absolute right-4 top-4 z-10">
                  <CopyButton text={file.content} />
                </div>
                <pre className="max-h-[500px] overflow-auto p-4">
                  <code className="font-mono text-sm">{file.content}</code>
                </pre>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default function SnippetDetailPage() {
  const params = useParams();
  const username = params.username as string;
  const snippetName = params.snippet as string;

  const { data: snippet, isLoading } = useQuery(
    convexQuery(api.snippets.getByNamespaceAndName, {
      namespace: username,
      name: snippetName,
    }),
  );

  if (isLoading) {
    return <SnippetSkeleton />;
  }

  if (!snippet) {
    notFound();
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Breadcrumb */}
      <div className="mb-2">
        <Link
          href={`/${username}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          @{username}
        </Link>
        <span className="mx-1 text-muted-foreground">/</span>
        <span className="text-sm font-medium">{snippetName}</span>
      </div>

      {/* Header */}
      <div className="mb-8">
        <h1 className="mb-2 text-2xl font-bold">
          {snippet.title || snippet.name}
        </h1>
        {snippet.description && (
          <p className="mb-4 text-muted-foreground">{snippet.description}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="default">Public</Badge>
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <IconDownload className="size-4" />
            {snippet.downloads ?? 0} downloads
          </span>
          {snippet.dependencies && snippet.dependencies.length > 0 && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <IconPackage className="size-4" />
              {snippet.dependencies.length} dependenc
              {snippet.dependencies.length !== 1 ? "ies" : "y"}
            </div>
          )}
        </div>
      </div>

      {/* Install Command */}
      <div className="mb-6">
        <InstallCommand namespace={username} snippetName={snippetName} />
      </div>

      {/* Dependencies */}
      {snippet.dependencies && snippet.dependencies.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Dependencies</CardTitle>
              <CardDescription>
                npm packages required by this snippet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {snippet.dependencies.map((dep) => (
                  <Badge key={dep} variant="secondary">
                    {dep}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Registry Dependencies */}
      {snippet.registryDependencies &&
        snippet.registryDependencies.length > 0 && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Registry Dependencies
                </CardTitle>
                <CardDescription>
                  shadcn/ui components required by this snippet
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {snippet.registryDependencies.map((dep) => (
                    <Badge key={dep} variant="outline">
                      {dep}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      {/* File Preview */}
      <FilePreview files={snippet.files} />
    </div>
  );
}
