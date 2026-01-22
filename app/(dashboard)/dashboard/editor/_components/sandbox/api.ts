// Client API for sandbox operations

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface CreateSandboxResponse {
  success: boolean;
  sandboxId: string;
  shortSandboxId: string;
  name: string;
}

export interface ConnectSandboxResponse {
  success: boolean;
  // Session from CodeSandbox SDK - used to connect from browser
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  session: any;
  sandboxId: string;
  cluster?: string;
  bootupType?: string;
}

// Create a new sandbox
export async function createNewSandbox(name?: string): Promise<CreateSandboxResponse> {
  const response = await fetch("/api/sandbox/new", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to create sandbox");
  }

  return response.json();
}

// Connect to an existing sandbox with retry logic
export async function connectToSandbox(
  sandboxId: string,
  retries = MAX_RETRIES
): Promise<ConnectSandboxResponse> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch("/api/sandbox/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sandboxId }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(error.error || "Failed to connect to sandbox");
      }

      return response.json();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.warn(`Sandbox connection attempt ${attempt + 1} failed:`, lastError.message);

      if (attempt < retries - 1) {
        await sleep(RETRY_DELAY);
      }
    }
  }

  throw lastError ?? new Error("Failed to connect to sandbox after retries");
}

// Publish a sandbox (mark for review)
export async function publishSandbox(sandboxId: string): Promise<{ success: boolean }> {
  const response = await fetch("/api/sandbox/publish", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to publish sandbox");
  }

  return response.json();
}

// Update sandbox metadata
export async function updateSandbox(
  sandboxId: string,
  data: { name?: string; status?: string }
): Promise<{ success: boolean }> {
  const response = await fetch("/api/sandbox/edit", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, ...data }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to update sandbox");
  }

  return response.json();
}

// File system operations

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface ListFilesResponse {
  success: boolean;
  files: FileEntry[];
  path: string;
}

export interface ReadFileResponse {
  success: boolean;
  content: string;
  filePath: string;
}

// List files in a directory
export async function listFiles(
  sandboxId: string,
  path = "/"
): Promise<ListFilesResponse> {
  const response = await fetch("/api/sandbox/files/list", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, path }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to list files");
  }

  return response.json();
}

// Read file content
export async function readFile(
  sandboxId: string,
  filePath: string
): Promise<ReadFileResponse> {
  const response = await fetch("/api/sandbox/files/read", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, filePath }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to read file");
  }

  return response.json();
}

// Write file content
export async function writeFile(
  sandboxId: string,
  filePath: string,
  content: string
): Promise<{ success: boolean }> {
  const response = await fetch("/api/sandbox/files/write", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, filePath, content }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to write file");
  }

  return response.json();
}

// Create a directory
export async function createDir(
  sandboxId: string,
  path: string
): Promise<{ success: boolean }> {
  const response = await fetch("/api/sandbox/files/mkdir", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, path }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to create directory");
  }

  return response.json();
}

// Delete file or directory
export async function deleteEntry(
  sandboxId: string,
  path: string
): Promise<{ success: boolean }> {
  const response = await fetch("/api/sandbox/files/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sandboxId, path }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error || "Failed to delete entry");
  }

  return response.json();
}
