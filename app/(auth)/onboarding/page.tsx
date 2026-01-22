import { redirect } from "next/navigation";
import { fetchAuthQuery } from "@/lib/auth-server";
import { api } from "@/convex/_generated/api";
import { UsernameForm } from "./_components/username-form";

export default async function OnboardingPage() {
  // Middleware ensures we're authenticated
  const user = await fetchAuthQuery(api.users.getMe);

  // If user already has a username, redirect to dashboard
  if (user?.username) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] items-center justify-center p-4">
      <UsernameForm />
    </div>
  );
}
