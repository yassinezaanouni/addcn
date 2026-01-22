import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth-server";
import { codesandboxSdk } from "@/lib/codesandbox-sdk";

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sandboxId } = body;

    if (!sandboxId) {
      return NextResponse.json(
        { error: "sandboxId is required" },
        { status: 400 }
      );
    }

    // Resume the sandbox (starts it if hibernated)
    const sandbox = await codesandboxSdk.sandboxes.resume(sandboxId);

    // Create a session that can be used by the browser SDK
    const session = await sandbox.createSession();

    return NextResponse.json({
      success: true,
      session,
      sandboxId: sandbox.id,
      cluster: sandbox.cluster,
      bootupType: sandbox.bootupType,
    });
  } catch (error) {
    console.error("Error connecting to sandbox:", error);
    return NextResponse.json(
      { error: "Failed to connect to sandbox" },
      { status: 500 }
    );
  }
}
