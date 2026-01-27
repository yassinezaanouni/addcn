"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { APP_NAME } from "@/lib/constants";
import { DASHBOARD_NAV_ITEMS } from "@/lib/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
} from "@/components/ui/sidebar";
import { NavMain } from "./nav-main";
import { NavUser } from "./nav-user";
import { Logo } from "../shared/logo";
import { ThemeToggle } from "../shared/theme-toggle";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: user, isPending } = useQuery(convexQuery(api.users.getMe, {}));

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              render={<Link href="/" />}
              className="group/logo"
            >
              <div className="flex size-8 items-center justify-center rounded-md border border-primary/20 bg-primary/10 transition-colors group-hover/logo:border-primary/30 group-hover/logo:bg-primary/15">
                <Logo className="[&_.word-mark]:hidden [&_svg]:size-4" />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-mono text-sm font-semibold">
                  {APP_NAME}
                </span>
                <span className="truncate font-mono text-xs text-muted-foreground group-hover/logo:text-background/80">
                  Registry
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={DASHBOARD_NAV_ITEMS} />
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2">
          <div className="flex-1">
            {isPending ? (
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuSkeleton showIcon />
                </SidebarMenuItem>
              </SidebarMenu>
            ) : (
              <NavUser
                user={
                  user
                    ? {
                        username: user.username ?? null,
                        email: user.email,
                        avatarUrl: user.avatarUrl,
                      }
                    : null
                }
              />
            )}
          </div>
          <ThemeToggle />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
