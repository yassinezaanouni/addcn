# Open in v0 - shadcn/ui Registry Integration

## Overview

The "Open in v0" feature enables integration between your registry and v0, allowing users to open registry items directly in the v0 editor for customization and further development.

## Basic Implementation

### URL Endpoint

To open a registry item in v0, use this endpoint format:

```
https://v0.dev/chat/api/open?url=[URL]
```

**Example:**

```
https://v0.dev/chat/api/open?url=https://ui.shadcn.com/r/styles/new-york/login-01.json
```

## Important Limitations

The "Open in v0" feature does not currently support:

- `cssVars`
- `css`
- `envVars`
- Namespaced registries
- Advanced authentication methods

## Creating an Open in v0 Button

### Simple Implementation

```jsx
import { Button } from "@/components/ui/button"

export function OpenInV0Button({ url }: { url: string }) {
  return (
    <Button
      aria-label="Open in v0"
      className="h-8 gap-1 rounded-[6px] bg-black px-3 text-xs text-white hover:bg-black hover:text-white dark:bg-white dark:text-black"
      asChild
    >
      <a
        href={`https://v0.dev/chat/api/open?url=${url}`}
        target="_blank"
        rel="noreferrer"
      >
        Open in <svg>...</svg>
      </a>
    </Button>
  )
}
```

### Usage

```jsx
<OpenInV0Button url="https://example.com/r/hello-world.json" />
```

## Authentication

### Query Parameter Method

v0 supports query parameter authentication for registry access:

```
https://registry.company.com/r/hello-world.json?token=your_secure_token_here
```

### Implementation Steps

1. Check for the `token` query parameter on your server
2. Validate the token against your authentication system
3. Return `401 Unauthorized` if the token is invalid or missing
4. Both the shadcn CLI and v0 handle 401 responses appropriately

### Server Example (Next.js)

```javascript
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token")

  if (!isValidToken(token)) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message: "Invalid or missing token",
      },
      { status: 401 }
    )
  }

  return NextResponse.json(registryItem)
}
```

## Security Considerations

- Always encrypt and expire tokens
- Never expose production tokens in documentation or examples
- Validate tokens server-side before serving registry items
