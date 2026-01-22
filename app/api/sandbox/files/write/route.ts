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
    const { sandboxId, filePath, content } = body;

    if (!sandboxId || !filePath || content === undefined) {
      return NextResponse.json(
        { error: "sandboxId, filePath, and content are required" },
        { status: 400 }
      );
    }

    // Resume sandbox and connect to get the client
    const sandbox = await codesandboxSdk.sandboxes.resume(sandboxId);
    const client = await sandbox.connect();

    try {
      // Write file content
      await client.fs.writeTextFile(filePath, content, {
        create: true,
        overwrite: true,
      });

      return NextResponse.json({
        success: true,
        filePath,
      });
    } finally {
      await client.disconnect();
    }
  } catch (error) {
    console.error("Error writing file:", error);
    return NextResponse.json(
      { error: "Failed to write file" },
      { status: 500 }
    );
  }
}
