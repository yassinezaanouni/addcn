import { redirect } from "next/navigation";

export default function NewComponentPage() {
  // Redirect to the sandbox flow for creating new components
  redirect("/dashboard/sandbox/new");
}
