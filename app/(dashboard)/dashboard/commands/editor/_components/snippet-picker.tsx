"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { IconPackage } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface SnippetPickerProps {
  onPick: (id: Id<"snippets">) => void;
}

export function SnippetPicker({ onPick }: SnippetPickerProps) {
  const [open, setOpen] = useState(false);

  const { data: snippets = [] } = useQuery(
    convexQuery(api.snippets.getMySnippets, {}),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 font-normal"
          />
        }
        nativeButton
      >
        <IconPackage className="size-3.5 text-emerald-500" />
        Insert snippet install command…
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-80 gap-0 p-0">
        <Command>
          <CommandInput placeholder="Search your snippets…" />
          <CommandList>
            <CommandEmpty>No snippets found.</CommandEmpty>
            <CommandGroup>
              {snippets.map((snippet) => (
                <CommandItem
                  key={snippet._id}
                  value={`${snippet.title} ${snippet.name} ${snippet.description}`}
                  onSelect={() => {
                    onPick(snippet._id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <IconPackage className="size-4 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs">
                      {snippet.title || snippet.name}
                    </div>
                    <div className="truncate font-mono text-[11px] text-muted-foreground">
                      {snippet.name}
                    </div>
                  </div>
                  <span
                    className={
                      snippet.isPublic
                        ? "rounded bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400"
                        : "rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-600 dark:text-amber-400"
                    }
                  >
                    {snippet.isPublic ? "Public" : "Private"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
