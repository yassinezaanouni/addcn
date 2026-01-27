# registry.json Documentation

## Overview

The `registry.json` schema defines how to configure a custom component registry for shadcn/ui.

## Schema Reference

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "shadcn",
  "homepage": "https://ui.shadcn.com",
  "items": [
    {
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
        }
      ]
    }
  ]
}
```

## Key Properties

### `$schema`

Points to the official JSON schema for validation: `https://ui.shadcn.com/schema/registry.json`

### `name`

Identifier for your registry, used in data attributes and metadata. Example: `"acme"`

### `homepage`

The registry's public URL, used for metadata purposes. Example: `"https://acme.com"`

### `items`

Array of registry items, each following the [registry-item schema specification](https://ui.shadcn.com/schema/registry-item.json). Each item represents a component, block, or resource available in your registry.

## Registry Items

Each item in the `items` array supports:

- **name**: Unique identifier
- **type**: Item classification (e.g., `registry:block`, `registry:component`)
- **title**: Display name
- **description**: Brief explanation
- **registryDependencies**: References to other registry items
- **dependencies**: NPM package dependencies with versions
- **files**: Array of file definitions with paths and types

## Related Documentation

For detailed specifications about individual registry items, refer to the [registry-item.json documentation](https://ui.shadcn.com/schema/registry-item-json).
