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
    const { sandboxId, path = "/project" } = body;

    if (!sandboxId) {
      return NextResponse.json(
        { error: "sandboxId is required" },
        { status: 400 }
      );
    }

    // Resume sandbox and connect to get the client
    const sandbox = await codesandboxSdk.sandboxes.resume(sandboxId);
    const client = await sandbox.connect();

    try {
      // Read directory contents
      const entries = await client.fs.readdir(path);

      // Build file list
      const files = entries.map((entry) => ({
        name: entry.name,
        path: path === "/" ? `/${entry.name}` : `${path}/${entry.name}`,
        isDirectory: entry.type === "directory",
      }));

      return NextResponse.json({
        success: true,
        files,
        path,
      });
    } finally {
      // Disconnect to avoid keeping the connection open
      await client.disconnect();
    }
  } catch (error) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: "Failed to list files" },
      { status: 500 }
    );
  }
}
