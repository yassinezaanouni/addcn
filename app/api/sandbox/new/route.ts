import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth-server";
import {
  codesandboxSdk,
  DEFAULT_HIBERNATION_TIMEOUT,
  DEFAULT_PRIVACY,
  DEFAULT_TEMPLATE,
} from "@/lib/codesandbox-sdk";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { name } = body;

    // Create a new sandbox using CodeSandbox SDK
    const sandbox = await codesandboxSdk.sandboxes.create({
      ...(DEFAULT_TEMPLATE ? { id: DEFAULT_TEMPLATE } : {}),
      hibernationTimeoutSeconds: DEFAULT_HIBERNATION_TIMEOUT,
      privacy: DEFAULT_PRIVACY,
    });

    // Convert UUID to short ID for user-friendly URLs
    const shortSandboxId = sandbox.id.replace(/-/g, "").slice(0, 8);

    return NextResponse.json({
      success: true,
      sandboxId: sandbox.id,
      shortSandboxId,
      name: name ?? "Untitled Sandbox",
    });
  } catch (error) {
    console.error("Error creating sandbox:", error);
    return NextResponse.json(
      { error: "Failed to create sandbox" },
      { status: 500 }
    );
  }
}
