# shadcn/ui Registry Getting Started Guide

## Overview

This guide walks you through setting up your own component registry. It assumes you already have a project with components and want to turn it into a registry.

For new registry projects, the [registry template](https://github.com/shadcn-ui/registry-template) is available as a starting point with pre-configuration included.

## Requirements

You have freedom in designing and hosting your custom registry. The primary requirement is that registry items must be valid JSON files conforming to the "registry-item schema specification."

## Setting Up registry.json

The `registry.json` file serves as your registry's entry point, containing the registry's name, homepage, and all items within it. This file must be present at the root of your registry endpoint.

The `shadcn` CLI automatically generates this file when you run the `build` command.

### Example Structure

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": []
}
```

## Adding Your First Component

### Step 1: Create the Component

Create a component file (e.g., `registry/new-york/hello-world/hello-world.tsx`):

```typescript
import { Button } from "@/components/ui/button"

export function HelloWorld() {
  return <Button>Hello World</Button>
}
```

**Note:** Use the `registry/[STYLE]/[NAME]` directory structure, where "new-york" is customizable.

### Step 2: Add to registry.json

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": [
    {
      "name": "hello-world",
      "type": "registry:block",
      "title": "Hello World",
      "description": "A simple hello world component.",
      "files": [
        {
          "path": "registry/new-york/hello-world/hello-world.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```

For each file, specify the relative path and file type.

## Building Your Registry

### Install the CLI

```bash
pnpm add shadcn@latest
```

### Add Build Script

In `package.json`:

```json
{
  "scripts": {
    "registry:build": "shadcn build"
  }
}
```

### Run the Build

```bash
pnpm registry:build
```

By default, files generate in `public/r` (e.g., `public/r/hello-world.json`). Use the `--output` option to customize the directory.

## Serving Your Registry

For Next.js projects:

```bash
pnpm dev
```

Files will be accessible at `http://localhost:3000/r/[NAME].json`.

## Publishing

Deploy your project to a public URL to make it available to other developers.

## Key Guidelines

- Place items in `registry/[STYLE]/[NAME]` directories
- Required properties: `name`, `description`, `type`, `files`
- List all registry dependencies in `registryDependencies`
- List all package dependencies in `dependencies` (use format: `package@version`)
- **Imports must use the `@/registry` path**
- Organize files within components, hooks, or lib directories
- Add descriptive names and details to help LLMs understand components

## Installing Registry Items via CLI

To install a registry item:

```bash
pnpm dlx shadcn@latest add http://localhost:3000/r/hello-world.json
```

See the Namespaced Registries documentation for information on installing from namespaced registries.
