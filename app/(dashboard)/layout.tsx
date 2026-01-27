import { redirect } from "next/navigation";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { DashboardShell } from "./_components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch user on server - middleware already ensured we're authenticated
  const user = await fetchAuthQuery(api.users.getMe);

  // Redirect to onboarding if user doesn't have a username yet
  if (!user?.username) {
    redirect("/onboarding");
  }

  return <DashboardShell>{children}</DashboardShell>;
}
