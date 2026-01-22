import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth-server";
import { codesandboxSdk } from "@/lib/codesandbox-sdk";

export async function POST(request: NextRequest) {
  try {
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { sandboxId, path } = body;

    if (!sandboxId || !path) {
      return NextResponse.json(
        { error: "sandboxId and path are required" },
        { status: 400 }
      );
    }

    // Resume sandbox and connect to get the client
    const sandbox = await codesandboxSdk.sandboxes.resume(sandboxId);
    const client = await sandbox.connect();

    try {
      // Remove file or directory (recursive for directories)
      await client.fs.remove(path, true);

      return NextResponse.json({
        success: true,
        path,
      });
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Error deleting entry:", error);
    return NextResponse.json(
      { error: "Failed to delete entry" },
      { status: 500 }
    );
  }
}
