import { CodeSandbox } from "@codesandbox/sdk";

// Initialize CodeSandbox SDK with API key
// This should only be used on the server side
export const codesandboxSdk = new CodeSandbox(process.env.CSB_API_KEY!);

// Default template for component development
// To use a custom template: create a sandbox on CodeSandbox with your setup,
// then use its sandbox ID here (e.g., "abc123" from codesandbox.io/s/abc123)
// For now, we use undefined to get the SDK's default universal template
export const DEFAULT_TEMPLATE: string | undefined = undefined;

// Sandbox hibernation timeout in seconds
export const DEFAULT_HIBERNATION_TIMEOUT = 120; // 2 minutes for dev work

// Default privacy setting
export const DEFAULT_PRIVACY = "public" as const;
