# registry-item.json Specification for shadcn/ui

## Overview

The `registry-item.json` schema defines custom registry items for the shadcn/ui component system.

## Basic Structure

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry-item.json",
  "name": "hello-world",
  "type": "registry:block",
  "title": "Hello World",
  "description": "A simple hello world component.",
  "registryDependencies": [
    "button",
    "@acme/input-form",
    "https://example.com/r/foo"
  ],
  "dependencies": ["is-even@3.0.0", "motion"],
  "files": [
    {
      "path": "registry/new-york/hello-world/hello-world.tsx",
      "type": "registry:component"
    },
    {
      "path": "registry/new-york/hello-world/use-hello-world.ts",
      "type": "registry:hook"
    }
  ],
  "cssVars": {
    "theme": {
      "font-heading": "Poppins, sans-serif"
    },
    "light": {
      "brand": "20 14.3% 4.1%"
    },
    "dark": {
      "brand": "20 14.3% 4.1%"
    }
  }
}
```

## Field Definitions

### $schema

Specifies the schema validation endpoint for the file format.

### name

Unique identifier for the registry item within your registry.

### title

Human-readable, concise name for the item.

### description

Detailed explanation of the registry item's purpose and functionality.

### type

Determines the item category and target resolution path. Supported types:

| Type                 | Purpose                                  |
| -------------------- | ---------------------------------------- |
| `registry:block`     | Complex components with multiple files   |
| `registry:component` | Simple, single-purpose components        |
| `registry:lib`       | Library utilities and helper functions   |
| `registry:hook`      | React hook implementations               |
| `registry:ui`        | UI primitives and single-file components |
| `registry:page`      | Page or file-based route templates       |
| `registry:file`      | Miscellaneous file types                 |
| `registry:style`     | Predefined style sets (e.g., "new-york") |
| `registry:theme`     | Theme configurations                     |
| `registry:item`      | Universal registry items                 |

### author

Attribution information formatted as: `"Name <email@domain.com>"`

### dependencies

NPM package dependencies with optional version specifications:

```json
{
  "dependencies": [
    "@radix-ui/react-accordion",
    "zod",
    "lucide-react",
    "name@1.0.2"
  ]
}
```

### registryDependencies

Registry item dependencies supporting three formats:

- **shadcn/ui items**: Use component name directly (`"button"`, `"input"`)
- **Namespaced items**: Include namespace (`"@acme/input-form"`)
- **Custom registries**: Use full URL (`"https://example.com/r/hello-world.json"`)

The CLI automatically resolves remote registry dependencies.

### files

Array defining all component files. Each entry requires:

- **path**: File location within your registry
- **type**: File classification
- **target** (optional): Destination in projects using `registry:page` and `registry:file` types

```json
{
  "files": [
    {
      "path": "registry/new-york/hello-world/page.tsx",
      "type": "registry:page",
      "target": "app/hello/page.tsx"
    },
    {
      "path": "registry/new-york/hello-world/.env",
      "type": "registry:file",
      "target": "~/.env"
    }
  ]
}
```

Use `~` to reference the project root.

### cssVars

Defines CSS custom properties organized by scope:

```json
{
  "cssVars": {
    "theme": {
      "font-heading": "Poppins, sans-serif"
    },
    "light": {
      "brand": "20 14.3% 4.1%",
      "radius": "0.5rem"
    },
    "dark": {
      "brand": "20 14.3% 4.1%"
    }
  }
}
```

### css

Adds custom CSS rules and utilities:

```json
{
  "css": {
    "@plugin @tailwindcss/typography": {},
    "@layer base": {
      "body": {
        "font-size": "var(--text-base)",
        "line-height": "1.5"
      }
    },
    "@keyframes wiggle": {
      "0%, 100%": {
        "transform": "rotate(-3deg)"
      }
    }
  }
}
```

### envVars

Development environment variables (not for production use):

```json
{
  "envVars": {
    "NEXT_PUBLIC_APP_URL": "http://localhost:4000",
    "DATABASE_URL": "postgresql://postgres:postgres@localhost:5432/postgres",
    "OPENAI_API_KEY": ""
  }
}
```

Existing variables are preserved during installation.

### docs

Custom documentation or setup instructions displayed during CLI installation:

```json
{
  "docs": "To obtain an API key, register at https://platform.openai.com."
}
```

### categories

Organizational tags for discovery and filtering:

```json
{
  "categories": ["sidebar", "dashboard"]
}
```

### meta

Arbitrary key-value metadata for additional context:

```json
{
  "meta": { "foo": "bar" }
}
```

## Schema Reference

View the complete JSON Schema at: https://ui.shadcn.com/schema/registry-item.json
