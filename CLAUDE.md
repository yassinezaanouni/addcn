# Project: addcn - shadcn Component Registry Builder

A multi-user platform for creating and serving custom shadcn/ui registry components.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Convex (database + backend)
- TanStack Query (data fetching)
- Better Auth (authentication)
- Tabler Icons (`@tabler/icons-react`) - NOT lucide-react

## Key Concepts

### Registry File Types

When outputting registry JSON, map file paths to shadcn registry types:

| Path Pattern      | Registry Type    | Target                      |
| ----------------- | ---------------- | --------------------------- |
| `components/ui/*` | `registry:ui`    | No target (shadcn resolves) |
| `hooks/*`         | `registry:hook`  | No target                   |
| `lib/*`           | `registry:lib`   | No target                   |
| `*.css`           | `registry:style` | No target                   |
| Custom paths      | `registry:file`  | `~/path/to/file`            |

Standard paths (components/ui, hooks, lib) don't need `target` - shadcn CLI resolves them based on user's `components.json` config.

### File Structure

- `app/(marketing)/` - Landing page
- `app/(dashboard)/` - User dashboard (components, orgs, settings)
- `app/(auth)/` - Login and onboarding
- `convex/` - Backend functions, schema, auth
- `convex/lib/` - Shared backend utilities (permissions, validation)
- `types/` - TypeScript interfaces

### URL Format

Registry components are served at: `/r/{namespace}/{name}.json`

- Namespace is either a username or organization slug
- Example: `https://addcn.dev/r/johndoe/my-button.json`

## Code Principles

### Use Technology-Specific Patterns

Don't default to conventional patterns. Understand how each technology actually works:

**Convex:**

- No REST API routes for data operations - use Convex queries/mutations directly
- Client calls `useQuery(api.users.getMe)`, not `fetch('/api/users/me')`
- See https://docs.convex.dev/client/nextjs/app-router/ for more details
- Use Convex with TanStack Query https://docs.convex.dev/client/tanstack/tanstack-query/
- See `.claude/docs/architecture/` for Convex patterns

**General rule:** Before implementing, ask "how does this technology expect me to do this?" not "how is this conventionally done?" Check official docs, not assumptions.

### No Fallbacks or Migrations

This is a new project. Don't add:

- Data migration logic
- Fallback values for missing fields
- Backward compatibility code

### Keep It Simple

- No over-engineering
- No unnecessary abstractions
- Direct, straightforward code

### DRY with Constants

- Use constants for reusable values
- Shared utilities in `lib/`
- Shared types in `types/`

## Commands

```bash
pnpm dev           # Start dev server (runs Next.js + Convex)
pnpm build         # Build for production
pnpm tsc --noEmit  # Type check

# Test registry (replace namespace/name)
curl https://your-deployment.convex.site/r/username/component.json

# Install component
pnpm dlx shadcn@latest add https://your-deployment.convex.site/r/username/component.json
```

## Reference Docs

See `.claude/docs/official-registry/` for shadcn registry documentation.
