# shadcn/ui Registry Namespaces Documentation

## Overview

Registry namespaces enable organizing and referencing resources from multiple sources using the `@` prefix. Resources can include components, libraries, utilities, hooks, AI prompts, configuration files, themes, and more.

### Examples of Namespace Usage

- `@shadcn/button` - UI component from shadcn registry
- `@v0/dashboard` - Component from v0 registry
- `@acme/auth-utils` - Utilities from private company registry
- `@ai/chatbot-rules` - AI prompt rules

## Decentralized Namespace System

The system intentionally avoids central authority. You can create any namespace and configure multiple registries for different purposes:

**Organizing strategies:**

- By resource type (UI components, documentation, AI resources)
- By team or department
- By visibility (public vs. private)
- By stability level (stable, beta, experimental)

## Configuration

Add registries to `components.json`:

```json
{
  "registries": {
    "@v0": "https://v0.dev/chat/b/{name}",
    "@acme": "https://registry.acme.com/resources/{name}.json"
  }
}
```

### URL Pattern System

**`{name}` placeholder (required):** Replaced with the resource name during installation.

```
@acme/button → https://registry.acme.com/button.json
@acme/auth-utils → https://registry.acme.com/auth-utils.json
```

**`{style}` placeholder (optional):** Replaced with current style configuration for serving theme variants.

### Advanced Configuration

For registries requiring authentication:

```json
{
  "registries": {
    "@private": {
      "url": "https://api.company.com/registry/{name}.json",
      "headers": {
        "Authorization": "Bearer ${REGISTRY_TOKEN}",
        "X-API-Key": "${API_KEY}"
      },
      "params": {
        "version": "latest"
      }
    }
  }
}
```

## Authentication & Security

### Environment Variables

Store credentials securely using environment variable expansion:

```json
{
  "@private": {
    "url": "https://api.company.com/registry/{name}.json",
    "headers": {
      "Authorization": "Bearer ${REGISTRY_TOKEN}"
    }
  }
}
```

Set in `.env.local`:

```
REGISTRY_TOKEN=your_secret_token_here
```

### Authentication Methods

- **Bearer Token (OAuth 2.0):** `"Authorization": "Bearer ${GITHUB_TOKEN}"`
- **API Key in Headers:** `"X-API-Key": "${API_KEY}"`
- **Basic Authentication:** `"Authorization": "Basic ${BASE64_CREDENTIALS}"`
- **Query Parameters:** Include credentials in URL params

### Security Best Practices

- Use HTTPS exclusively for all registry URLs
- Never commit tokens to version control
- Environment variables are never logged by the CLI
- Resources are validated against JSON schema before installation
- No arbitrary code execution occurs—resources remain data files

## Installation & CLI Commands

### Installing Resources

```bash
pnpm dlx shadcn@latest add @v0/dashboard
pnpm dlx shadcn@latest add @acme/button @lib/auth-utils @ai/prompt
```

### Viewing Resources

Inspect registry items before installation:

```bash
npx shadcn@latest view @acme/button
npx shadcn@latest view https://registry.example.com/button.json
```

### Searching Registries

```bash
npx shadcn@latest search @v0
npx shadcn@latest search @acme --query "auth"
npx shadcn@latest list @acme
```

## Dependency Resolution

Resources can depend on items from different registries:

```json
{
  "name": "dashboard",
  "registryDependencies": [
    "@shadcn/card",
    "@v0/chart",
    "@acme/data-table",
    "@ai/analytics-prompt"
  ]
}
```

The CLI automatically resolves and installs dependencies in the correct order.

### Overriding Third-Party Resources

Create custom resources that override vendor components:

```json
{
  "name": "custom-button",
  "registryDependencies": ["@vendor/button"],
  "cssVars": {
    "light": {
      "--button-bg": "purple"
    }
  }
}
```

Installation order ensures later resources override earlier ones if targeting the same files.

## Versioning

Implement version control using query parameters:

```json
{
  "@versioned": {
    "url": "https://registry.example.com/{name}",
    "params": {
      "version": "v2"
    }
  }
}
```

Use environment variables for environment-specific versions:

```json
{
  "@stable": {
    "url": "https://registry.company.com/{name}",
    "params": {
      "version": "${REGISTRY_VERSION}"
    }
  }
}
```

## Registry Naming Convention

Valid registry names must:

- Start with `@` symbol
- Contain only alphanumeric characters, hyphens, and underscores
- Reference pattern: `@namespace/resource-name`

**Regex pattern:**

```
/^(@[a-zA-Z0-9](?:[a-zA-Z0-9-_]*[a-zA-Z0-9])?)\/(.+)$/
```

## Error Handling

**Unknown registry:**

```
Unknown registry "@non-existent". Configure in components.json
```

**Missing environment variables:**

```
Registry requires: REGISTRY_TOKEN
```

**Resource not found (404):**
Verify resource name spelling and registry URL pattern correctness.

**Authentication failures:**

- 401 Unauthorized: Check credentials and environment variables
- 403 Forbidden: Verify API key permissions

## Creating Your Own Registry

To create a compatible registry:

1. Implement the registry item JSON schema
2. Support the `{name}` URL pattern placeholder
3. Define appropriate resource types (`registry:ui`, `registry:lib`, etc.)
4. Handle authentication via headers or query parameters
5. Document namespace configuration for users

Document configuration:

```json
{
  "registries": {
    "@your-registry": "https://your-domain.com/r/{name}.json"
  }
}
```

## Technical Details

### Resolution Process

1. Parse namespace and component name from `@namespace/component`
2. Look up registry configuration
3. Build URL with placeholder replacement
4. Set authentication headers if configured
5. Fetch component from resolved URL
6. Validate against registry item schema
7. Recursively resolve dependencies

### Cross-Registry Dependencies

The resolver maintains separate authentication contexts for each registry, deduplicates files based on target paths (last one wins), and merges configurations from all sources.

## Best Practices

- Use environment variables for sensitive credentials
- Choose descriptive, unique namespace names
- Document authentication requirements clearly
- Implement proper error responses
- Cache registry responses when possible
- Support style variants if offering themed components
- Provide version discovery endpoints

## Troubleshooting

**Resources not found:**

- Verify registry URL and `{name}` placeholder inclusion
- Confirm resource exists in registry
- Check resource type compatibility

**Authentication issues:**

- Validate environment variables are set correctly
- Verify API keys haven't expired
- Check header format correctness

**Dependency conflicts:**

- Review resources with identical names from different registries
- Use fully qualified names (`@namespace/resource`)
- Check for circular dependencies
- Ensure resource type compatibility
