# MCP Server for shadcn/ui Registry Developers

## Overview

The shadcn MCP server enables compatibility with any shadcn-compatible registry without requiring special configuration. This allows registry consumers to browse, search, and install components directly through Claude Code.

## Prerequisites

Your registry must include a registry index file at its root:

- **Location**: `https://yourdomain.com/r/registry.json` or `https://yourdomain.com/r/registry`
- **Format**: Valid JSON conforming to the registry schema
- **Purpose**: Enables the MCP server to request and access your registry items

## Configuration Steps

### 1. Configure the Registry

Registry consumers should add your registry to their `components.json` file:

```json
{
  "registries": {
    "@acme": "https://acme.com/r/{name}.json"
  }
}
```

### 2. Install the MCP Server

Run this command in the project:

```bash
pnpm dlx shadcn@latest mcp init --client claude
```

### 3. Restart and Test

After restarting Claude Code, users can try these prompts:

- "Show me the components in the acme registry"
- "Create a landing page using items from the acme registry"

**Debugging**: Use the `/mcp` command in Claude Code to troubleshoot the MCP server.

## Best Practices for MCP-Compatible Registries

1. **Clear Descriptions**: Provide concise, informative descriptions explaining component purpose and usage

2. **Accurate Dependencies**: List all `dependencies` precisely to enable automatic installations

3. **Registry Dependencies**: Use `registryDependencies` to indicate relationships between items

4. **Consistent Naming**: Employ kebab-case for component names across your registry

These practices help AI assistants understand and effectively utilize your registry items.
