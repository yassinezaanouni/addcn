"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconCode,
  IconPencil,
  IconTrash,
  IconTerminal,
} from "@tabler/icons-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SavedComponent } from "@/types/component";
import { InstallCommand } from "./install-command";
import { useComponentsStore } from "@/stores/components-store";

interface ComponentCardProps {
  component: SavedComponent;
}

export function ComponentCard({ component }: ComponentCardProps) {
  const [showInstall, setShowInstall] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const deleteComponent = useComponentsStore((state) => state.deleteComponent);

  const handleDelete = () => {
    deleteComponent(component.id);
    setShowDelete(false);
  };

  return (
    <>
      <Card className="group relative overflow-hidden transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 space-y-1">
              <CardTitle className="text-base">{component.title}</CardTitle>
              <CardDescription className="line-clamp-2 text-sm">
                {component.description || "No description"}
              </CardDescription>
            </div>
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <IconCode className="size-5 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-xs">
              {component.files.length} file
              {component.files.length !== 1 ? "s" : ""}
            </Badge>
            {component.dependencies.length > 0 && (
              <Badge variant="outline" className="text-xs">
                {component.dependencies.length} dep
                {component.dependencies.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="font-mono text-xs text-muted-foreground">
              {component.name}
            </span>
            <div className="flex items-center gap-1">
              <Tooltip>
                <TooltipTrigger
                  onClick={() => setShowInstall(true)}
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <IconTerminal className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Install command</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  render={
                    <Link
                      href={`/editor/${component.id}`}
                      className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <IconPencil className="size-3.5" />
                    </Link>
                  }
                />
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger
                  onClick={() => setShowDelete(true)}
                  className="inline-flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <IconTrash className="size-3.5" />
                </TooltipTrigger>
                <TooltipContent>Delete</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </CardContent>
      </Card>

      <InstallCommand
        open={showInstall}
        onOpenChange={setShowInstall}
        componentName={component.name}
      />

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Component</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{component.title}&quot;?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function ComponentCardSkeleton() {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="size-10 rounded-lg" />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-1.5">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex gap-1">
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="size-6 rounded-md" />
            <Skeleton className="size-6 rounded-md" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
