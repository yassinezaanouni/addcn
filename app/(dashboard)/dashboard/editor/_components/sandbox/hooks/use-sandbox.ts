"use client";

import { useEffect, useState, useRef } from "react";
import { SandboxClient } from "@codesandbox/sdk";
import { connectToSandbox as connectToCodeSandboxSDK } from "@codesandbox/sdk/browser";
import { connectToSandbox } from "../api";

// CodeSandbox embed URL base (for "Open in CodeSandbox" button)
const CODESANDBOX_EMBED_URL = "https://codesandbox.io/p/sandbox";

// Common dev server ports to check
const DEV_SERVER_PORTS = [5173, 3000, 8080, 4000];

export interface UseSandboxOptions {
  sandboxId: string;
}

export interface UseSandboxReturn {
  sandboxId: string;
  sandboxRef: React.MutableRefObject<SandboxClient | null>;
  previewURL: string | null;
  embedURL: string | null;
  isSandboxLoading: boolean;
  reconnectSandbox: () => Promise<void>;
  error: Error | null;
}

export function useSandbox({ sandboxId }: UseSandboxOptions): UseSandboxReturn {
  const sandboxRef = useRef<SandboxClient | null>(null);
  const [previewURL, setPreviewURL] = useState<string | null>(null);
  const [embedURL, setEmbedURL] = useState<string | null>(null);
  const [isSandboxLoading, setIsSandboxLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const isInitializingRef = useRef(false);
  const currentSandboxIdRef = useRef(sandboxId);

  // Initialize sandbox connection
  useEffect(() => {
    // Skip if already initializing or sandboxId hasn't changed
    if (isInitializingRef.current) return;
    if (sandboxRef.current && currentSandboxIdRef.current === sandboxId) return;

    currentSandboxIdRef.current = sandboxId;
    isInitializingRef.current = true;

    const initialize = async () => {
      setIsSandboxLoading(true);
      setError(null);
      setPreviewURL(null);

      try {
        // Call API to start sandbox and get session
        console.log("Fetching session for sandbox:", sandboxId);
        const response = await connectToSandbox(sandboxId);

        if (!response.session) {
          throw new Error("Failed to get sandbox session");
        }

        // Connect to sandbox using browser SDK
        console.log("Connecting to sandbox via browser SDK...");
        const connectedSandbox = await connectToCodeSandboxSDK({
          session: response.session,
          getSession: async (id: string) => {
            console.log("getSession called for:", id);
            const newResponse = await connectToSandbox(id);
            return newResponse.session;
          },
        });
        console.log("Connected to sandbox:", connectedSandbox.id);
        sandboxRef.current = connectedSandbox;

        // Set embed URL for "Open in CodeSandbox" button
        setEmbedURL(`${CODESANDBOX_EMBED_URL}/${sandboxId}`);

        // Check what ports are available
        let allPorts = await connectedSandbox.ports.getAll();
        console.log("Available ports:", allPorts);

        // Try to find a working preview URL
        let previewFound = false;

        // Check if there's already a dev server port open (not SSH 2222)
        let devPort = allPorts.find(p => DEV_SERVER_PORTS.includes(p.port)) ||
                      allPorts.find(p => p.port !== 2222);

        if (devPort?.host) {
          const newPreviewURL = `https://${devPort.host}`;
          console.log("Using existing port preview URL:", newPreviewURL);
          setPreviewURL(newPreviewURL);
          previewFound = true;
        }

        // If no dev port found, try to start a dev server
        if (!previewFound) {
          console.log("No dev server running, setting up Vite project...");
          try {
            // Check if package.json exists with a dev script
            const checkResult = await connectedSandbox.commands.run(
              "cd /project/sandbox && cat package.json 2>/dev/null | grep -q '\"dev\"' && echo 'HAS_DEV' || echo 'NO_DEV'"
            );
            console.log("Package check result:", checkResult.trim());

            if (checkResult.trim() === "NO_DEV") {
              // Initialize a Vite React project
              console.log("Initializing Vite React project...");
              await connectedSandbox.commands.run(
                "cd /project/sandbox && npm create vite@latest . -- --template react-ts --yes && npm install"
              );
              console.log("Vite project initialized");
            }

            // Start the dev server
            console.log("Starting dev server...");
            const command = await connectedSandbox.commands.runBackground(
              "cd /project/sandbox && npm run dev -- --host",
              { name: "dev-server" }
            );
            console.log("Dev server command started:", command.status);
          } catch (cmdError) {
            console.log("Could not setup/start dev server:", cmdError);
          }

          // Wait for the dev server port
          console.log("Waiting for dev server port (30s timeout)...");
          try {
            const portInfo = await connectedSandbox.ports.waitForPort(5173, {
              timeoutMs: 30000,
            });
            if (portInfo?.host) {
              const newPreviewURL = `https://${portInfo.host}`;
              console.log("Preview URL from waitForPort:", newPreviewURL);
              setPreviewURL(newPreviewURL);
              previewFound = true;
            }
          } catch {
            console.log("Port 5173 not available within timeout");
            // Try other common ports
            allPorts = await connectedSandbox.ports.getAll();
            devPort = allPorts.find(p => DEV_SERVER_PORTS.includes(p.port)) ||
                      allPorts.find(p => p.port !== 2222);
            if (devPort?.host) {
              const newPreviewURL = `https://${devPort.host}`;
              console.log("Found dev port after waiting:", newPreviewURL);
              setPreviewURL(newPreviewURL);
              previewFound = true;
            }
          }
        }

        // No preview available - sandbox might not have a web project
        if (!previewFound) {
          console.log("No preview available - sandbox may not have a web server configured");
          setPreviewURL(null);
        }

        setIsSandboxLoading(false);
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        console.error("Failed to initialize sandbox:", error);
        setError(error);
        sandboxRef.current = null;
        setPreviewURL(null);
        setIsSandboxLoading(false);
      } finally {
        isInitializingRef.current = false;
      }
    };

    initialize();
  }, [sandboxId]);

  // Reconnect to sandbox
  const reconnectSandbox = async () => {
    isInitializingRef.current = false;
    sandboxRef.current = null;
    currentSandboxIdRef.current = "";
    setPreviewURL(null);
    setEmbedURL(null);
    // Trigger re-initialization by changing the ref
    currentSandboxIdRef.current = sandboxId;
  };

  return {
    sandboxId,
    sandboxRef,
    previewURL,
    embedURL,
    isSandboxLoading,
    reconnectSandbox,
    error,
  };
}
