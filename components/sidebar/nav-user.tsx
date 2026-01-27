"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconSelector, IconSettings, IconLogout } from "@tabler/icons-react";
import { authClient } from "@/lib/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

interface NavUserProps {
  user: {
    username: string | null;
    email: string;
    avatarUrl?: string | null;
  } | null;
}

export function NavUser({ user }: NavUserProps) {
  const router = useRouter();
  const { isMobile } = useSidebar();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              <AvatarImage
                src={user.avatarUrl ?? undefined}
                alt={user.username ?? "User"}
              />
              <AvatarFallback className="rounded-lg">
                {user.username?.charAt(0).toUpperCase() ?? "U"}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">@{user.username}</span>
              <span className="truncate text-xs text-muted-foreground group-hover/menu-button:text-sidebar-accent-foreground/70 group-data-[state=open]/menu-button:text-sidebar-accent-foreground/70">
                {user.email}
              </span>
            </div>
            <IconSelector className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage
                      src={user.avatarUrl ?? undefined}
                      alt={user.username ?? "User"}
                    />
                    <AvatarFallback className="rounded-lg">
                      {user.username?.charAt(0).toUpperCase() ?? "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">
                      @{user.username}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/dashboard/settings" />}>
              <IconSettings className="mr-2 size-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} variant="destructive">
              <IconLogout className="mr-2 size-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
