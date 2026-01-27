"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";
import { IconArrowLeft, IconSettings } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { MemberList } from "./_components/member-list";
import { InviteForm } from "./_components/invite-form";
import { PendingInvites } from "./_components/pending-invites";

export default function OrgSettingsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const { data: org, isLoading: orgLoading } = useQuery(
    convexQuery(api.organizations.getBySlug, { slug }),
  );

  const { data: user } = useQuery(convexQuery(api.users.getMe, {}));

  // Get user's role in this org
  const { data: myOrgs } = useQuery(
    convexQuery(api.organizations.getMyOrgs, {}),
  );
  const myOrgWithRole = myOrgs?.find((o) => o.slug === slug);
  const myRole = myOrgWithRole?.role;

  // Only admins and owners can access settings
  const canAccessSettings = myRole === "admin" || myRole === "owner";

  if (orgLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="size-10" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-medium">Organization not found</h2>
        <p className="text-muted-foreground">
          The organization you&apos;re looking for doesn&apos;t exist.
        </p>
        <Link href="/dashboard/orgs">
          <Button variant="outline" className="mt-4">
            <IconArrowLeft className="mr-2 size-4" />
            Back to Organizations
          </Button>
        </Link>
      </div>
    );
  }

  if (!canAccessSettings) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <h2 className="text-lg font-medium">Access Denied</h2>
        <p className="text-muted-foreground">
          You don&apos;t have permission to access this organization&apos;s
          settings.
        </p>
        <Link href={`/dashboard/orgs/${slug}`}>
          <Button variant="outline" className="mt-4">
            <IconArrowLeft className="mr-2 size-4" />
            Back to Organization
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/orgs/${slug}`}>
          <Button variant="ghost" size="icon">
            <IconArrowLeft className="size-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <IconSettings className="size-6" />
            {org.name} Settings
          </h1>
          <p className="text-muted-foreground">
            Manage members and invitations for @{org.slug}
          </p>
        </div>
      </div>

      {/* Invite Form - Only for admins and owners */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Invite Members</h2>
          <p className="text-sm text-muted-foreground">
            Send an invitation to add new team members.
          </p>
        </div>
        <InviteForm orgId={org._id} />
      </section>

      {/* Pending Invites */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pending Invitations</h2>
          <p className="text-sm text-muted-foreground">
            Invitations that haven&apos;t been accepted yet.
          </p>
        </div>
        <PendingInvites orgId={org._id} />
      </section>

      {/* Member List */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Members</h2>
          <p className="text-sm text-muted-foreground">
            Current members of this organization.
          </p>
        </div>
        <MemberList
          orgId={org._id}
          currentUserRole={myRole}
          currentUserId={user?._id}
        />
      </section>
    </div>
  );
}
