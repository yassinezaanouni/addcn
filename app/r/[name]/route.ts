import { NextResponse } from "next/server";
import { componentToRegistry } from "@/lib/registry";
import { getServerComponentByName } from "@/lib/server-storage";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name: rawName } = await params;

  // Remove .json extension if present
  const name = rawName.replace(/\.json$/, "");

  // Look up component by name
  const component = await getServerComponentByName(name);

  if (!component) {
    return NextResponse.json(
      { error: `Component "${name}" not found. Make sure you've saved the component first.` },
      { status: 404 }
    );
  }

  // Convert to registry format
  const registryItem = componentToRegistry(component);

  return NextResponse.json(registryItem, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
