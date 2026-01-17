"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import {
  IconLayoutDashboard,
  IconComponents,
  IconBuilding,
  IconSettings,
  IconLogout,
} from "@tabler/icons-react";
import { OrgSwitcher } from "@/components/org-switcher";
import { api } from "@/convex/_generated/api";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { APP_NAME } from "@/lib/constants";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/dashboard/components", label: "Components", icon: IconComponents },
  { href: "/dashboard/orgs", label: "Organizations", icon: IconBuilding },
  { href: "/dashboard/settings", label: "Settings", icon: IconSettings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { data: session, isPending: isSessionPending } =
    authClient.useSession();
  const { data: user, isPending: isUserPending } = useQuery(
    convexQuery(api.users.getMe, {})
  );

  const isLoading = isSessionPending || isUserPending;
  const isAuthenticated = !!session?.user;

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isLoading, isAuthenticated, router]);

  // Redirect to onboarding if authenticated but no username
  useEffect(() => {
    if (!isLoading && isAuthenticated && user === null) {
      router.push("/onboarding");
    }
  }, [isLoading, isAuthenticated, user, router]);

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen">
        {/* Sidebar skeleton */}
        <aside className="hidden w-64 shrink-0 border-r border-border bg-background md:block">
          <div className="flex h-14 items-center border-b border-border px-4">
            <Skeleton className="h-8 w-32" />
          </div>
          <nav className="space-y-1 p-4">
            {navItems.map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </nav>
        </aside>
        {/* Main content skeleton */}
        <div className="flex flex-1 flex-col">
          <header className="flex h-14 items-center justify-end border-b border-border px-4">
            <Skeleton className="size-8 rounded-full" />
          </header>
          <main className="flex-1 p-6">
            <Skeleton className="h-64 w-full" />
          </main>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-background md:block">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">A</span>
            </div>
            <span className="text-lg font-semibold">{APP_NAME}</span>
          </Link>
        </div>
        <nav className="space-y-1 p-4">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
              >
                <item.icon className="size-4" />
                {item.label}
              </Button>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b border-border px-4">
          {/* Mobile logo */}
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <span className="text-sm font-bold">A</span>
            </div>
          </Link>

          {/* Context switcher - hidden on mobile, shown on desktop */}
          <div className="hidden md:block">
            <OrgSwitcher />
          </div>

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="size-8">
                  <AvatarImage
                    src={user?.avatarUrl}
                    alt={user?.username ?? "User"}
                  />
                  <AvatarFallback>
                    {user?.username?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="flex items-center gap-2 p-2">
                <Avatar className="size-8">
                  <AvatarImage
                    src={user?.avatarUrl}
                    alt={user?.username ?? "User"}
                  />
                  <AvatarFallback>
                    {user?.username?.charAt(0).toUpperCase() ?? "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    @{user?.username}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {user?.email}
                  </span>
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/dashboard/settings" className="cursor-pointer">
                  <IconSettings className="mr-2 size-4" />
                  Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <IconLogout className="mr-2 size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
