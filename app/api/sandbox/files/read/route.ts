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
    const { sandboxId, filePath } = body;

    if (!sandboxId || !filePath) {
      return NextResponse.json(
        { error: "sandboxId and filePath are required" },
        { status: 400 }
      );
    }

    // Resume sandbox and connect to get the client
    const sandbox = await codesandboxSdk.sandboxes.resume(sandboxId);
    const client = await sandbox.connect();

    try {
      // Read file content
      const content = await client.fs.readTextFile(filePath);

      return NextResponse.json({
        success: true,
        content,
        filePath,
      });
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Error reading file:", error);
    return NextResponse.json(
      { error: "Failed to read file" },
      { status: 500 }
    );
  }
}
