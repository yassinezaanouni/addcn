# Registry Authentication Documentation

## Overview

Authentication enables securing private registries and controlling component access. Key use cases include:

- **Private Components**: Keep your business logic and internal components secure
- **Team-Specific Resources**: Distribute different components to various teams
- **Access Control**: Limit visibility of sensitive or experimental components
- **Usage Analytics**: Track organizational component adoption
- **Licensing**: Manage premium or licensed component distribution

## Common Authentication Patterns

### Token-Based Authentication

Bearer tokens in request headers provide the most common approach:

```json
{
  "registries": {
    "@private": {
      "url": "https://registry.company.com/{name}.json",
      "headers": {
        "Authorization": "Bearer ${REGISTRY_TOKEN}"
      }
    }
  }
}
```

Store tokens in environment variables:

```
REGISTRY_TOKEN=your_secret_token_here
```

### API Key Authentication

Alternative header-based approach:

```json
{
  "registries": {
    "@company": {
      "url": "https://api.company.com/registry/{name}.json",
      "headers": {
        "X-API-Key": "${API_KEY}",
        "X-Workspace-Id": "${WORKSPACE_ID}"
      }
    }
  }
}
```

### Query Parameter Authentication

Simpler implementation using URL parameters:

```json
{
  "registries": {
    "@internal": {
      "url": "https://registry.company.com/{name}.json",
      "params": {
        "token": "${ACCESS_TOKEN}"
      }
    }
  }
}
```

Result: `https://registry.company.com/button.json?token=your_token`

## Server-Side Implementation

### Next.js API Route Example

```typescript
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { name: string } },
) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  const queryToken = request.nextUrl.searchParams.get("token");

  if (!isValidToken(token || queryToken)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasAccessToComponent(token, params.name)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const component = await getComponent(params.name);
  return NextResponse.json(component);
}

function isValidToken(token: string | null) {
  return token === process.env.VALID_TOKEN;
}

function hasAccessToComponent(token: string, componentName: string) {
  return true; // Your logic here
}
```

### Express.js Example

```javascript
app.get("/registry/:name.json", (req, res) => {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!isValidToken(token)) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const component = getComponent(req.params.name);
  if (!component) {
    return res.status(404).json({ error: "Component not found" });
  }

  res.json(component);
});
```

## Advanced Patterns

### Team-Based Access

Route components based on team membership:

```typescript
async function GET(request: NextRequest) {
  const token = extractToken(request);
  const team = await getTeamFromToken(token);

  const components = await getComponentsForTeam(team);
  return NextResponse.json(components);
}
```

### User-Personalized Registries

Deliver customized component versions:

```typescript
async function GET(request: NextRequest) {
  const user = await authenticateUser(request);

  const preferences = await getUserPreferences(user.id);
  const component = await getPersonalizedComponent(params.name, preferences);

  return NextResponse.json(component);
}
```

### Temporary Access Tokens

Implement time-limited tokens for enhanced security:

```typescript
interface TemporaryToken {
  token: string;
  expiresAt: Date;
  scope: string[];
}

async function validateTemporaryToken(token: string) {
  const tokenData = await getTokenData(token);

  if (!tokenData) return false;
  if (new Date() > tokenData.expiresAt) return false;

  return true;
}
```

## Multi-Registry Setup

Combine multiple authenticated and public registries:

```json
{
  "registries": {
    "@public": "https://public.company.com/{name}.json",
    "@internal": {
      "url": "https://internal.company.com/{name}.json",
      "headers": {
        "Authorization": "Bearer ${INTERNAL_TOKEN}"
      }
    },
    "@premium": {
      "url": "https://premium.company.com/{name}.json",
      "headers": {
        "X-License-Key": "${LICENSE_KEY}"
      }
    }
  }
}
```

## Security Best Practices

### Environment Variables

Never commit credentials to version control:

```
REGISTRY_TOKEN=your_secret_token_here
API_KEY=your_api_key_here
```

### HTTPS Only

Always use encrypted connections:

```json
{
  "@secure": "https://registry.company.com/{name}.json"
}
```

### Rate Limiting

Protect against abuse:

```typescript
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});

app.use("/registry", limiter);
```

### Token Rotation

Generate expiring credentials regularly:

```typescript
function generateToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return { token, expiresAt };
}
```

### Access Logging

Track registry usage for security auditing:

```typescript
async function logAccess(request: Request, component: string, userId: string) {
  await db.accessLog.create({
    timestamp: new Date(),
    userId,
    component,
    ip: request.ip,
    userAgent: request.headers["user-agent"],
  });
}
```

## Testing

Verify authentication locally:

```bash
curl -H "Authorization: Bearer your_token" \
  https://registry.company.com/button.json

REGISTRY_TOKEN=your_token npx shadcn@latest add @private/button
```

## Error Handling

The CLI handles these status codes:

- **401 Unauthorized**: Invalid or missing token
- **403 Forbidden**: Insufficient permissions
- **429 Too Many Requests**: Rate limit exceeded

### Custom Error Messages

Provide context-specific guidance:

```typescript
if (!token) {
  return NextResponse.json(
    {
      error: "Unauthorized",
      message: "Set REGISTRY_TOKEN in .env.local",
    },
    { status: 401 },
  );
}

if (isExpiredToken(token)) {
  return NextResponse.json(
    {
      error: "Unauthorized",
      message: "Token expired. Request new token at company.com/tokens",
    },
    { status: 401 },
  );
}

if (!hasTeamAccess(token, component)) {
  return NextResponse.json(
    {
      error: "Forbidden",
      message: `Component '${component}' restricted to Design team`,
    },
    { status: 403 },
  );
}
```
