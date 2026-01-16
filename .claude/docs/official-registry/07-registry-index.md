# Add a Registry - shadcn/ui Documentation

## Open Source Registry Index

The open source registry index serves as a centralized list of all publicly available registries that can be used immediately. When developers execute `shadcn add` or `shadcn search` commands, the CLI automatically queries this registry index to locate and add the requested registry to the `components.json` file.

The complete list of available registries can be viewed at: https://ui.shadcn.com/r/registries.json

## How to Add Your Registry

To contribute your registry to the public index, follow these steps:

1. **Submit your registry configuration** to the file located at `apps/v4/registry/directory.json`
2. **Create a pull request** against the repository at https://github.com/shadcn-ui/ui
3. **Wait for validation and review** by the maintainers

## Registry Requirements

Before submission, ensure your registry meets these criteria:

1. **Open Source & Public Access**: The registry must be freely available and accessible to everyone
2. **Valid JSON Schema**: The registry file must conform to the specification outlined in the registry schema documentation
3. **Flat Structure**: Registry items should use a flat hierarchy with files located at the root level (e.g., `/registry.json` and individual `/component-name.json` files)
4. **No Embedded Content**: The `files` array must not include a `content` property for any items

## Example Registry Configuration

```json
{
  "$schema": "https://ui.shadcn.com/schema/registry.json",
  "name": "acme",
  "homepage": "https://acme.com",
  "items": [
    {
      "name": "login-form",
      "type": "registry:component",
      "title": "Login Form",
      "description": "A login form component.",
      "files": [
        {
          "path": "registry/new-york/auth/login-form.tsx",
          "type": "registry:component"
        }
      ]
    },
    {
      "name": "example-login-form",
      "type": "registry:component",
      "title": "Example Login Form",
      "description": "An example showing how to use the login form component.",
      "files": [
        {
          "path": "registry/new-york/examples/example-login-form.tsx",
          "type": "registry:component"
        }
      ]
    }
  ]
}
```
