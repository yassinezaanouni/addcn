"use client";

import { useMemo, useState } from "react";
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
import { IconLink, IconTerminal2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";

interface SavedCommandPickerProps {
  excludeIds: Id<"commands">[];
  onPick: (id: Id<"commands">) => void;
}

export function SavedCommandPicker({
  excludeIds,
  onPick,
}: SavedCommandPickerProps) {
  const [open, setOpen] = useState(false);

  const { data: commands = [] } = useQuery(
    convexQuery(api.commands.getMyCommands, {}),
  );

  const filtered = useMemo(
    () => commands.filter((c) => !excludeIds.includes(c._id)),
    [commands, excludeIds],
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
        nativeButton={false}
      >
        <IconLink className="size-3.5 text-violet-500" />
        Insert saved command…
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-80 gap-0 p-0"
      >
        <Command>
          <CommandInput placeholder="Search your commands…" />
          <CommandList>
            <CommandEmpty>No commands found.</CommandEmpty>
            <CommandGroup>
              {filtered.map((cmd) => (
                <CommandItem
                  key={cmd._id}
                  value={`${cmd.name} ${cmd.description}`}
                  onSelect={() => {
                    onPick(cmd._id);
                    setOpen(false);
                  }}
                  className="flex items-center gap-2"
                >
                  <IconTerminal2 className="size-4 text-emerald-500" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-mono text-xs">
                      {cmd.name}
                    </div>
                    {cmd.description && (
                      <div className="truncate text-[11px] text-muted-foreground">
                        {cmd.description}
                      </div>
                    )}
                  </div>
                  <span className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-muted-foreground">
                    {cmd.steps.length} step{cmd.steps.length !== 1 ? "s" : ""}
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
