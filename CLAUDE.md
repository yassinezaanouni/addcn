# Project: addcn - shadcn Component Registry Builder

A local dev tool for creating and serving custom shadcn/ui registry components.

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS
- Zustand (state management)
- Convex (database - for future production use)
- Monaco Editor (code editing)

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

- `app/editor/` - Editor UI with Monaco
- `app/r/[name]/` - Registry JSON API endpoint
- `lib/registry.ts` - Converts components to registry format
- `lib/server-storage.ts` - Local JSON file storage
- `stores/editor-store.ts` - Zustand store for editor state
- `types/` - TypeScript interfaces

## Code Principles

### Use Technology-Specific Patterns

Don't default to conventional patterns. Understand how each technology actually works:

**Convex:**

- No REST API routes for data operations - use Convex queries/mutations directly
- Client calls `useQuery(api.users.getMe)`, not `fetch('/api/users/me')`
- See https://docs.convex.dev/client/nextjs/app-router/ for more details
- use convex with tanstack query https://docs.convex.dev/client/tanstack/tanstack-query/
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
pnpm dev           # Start dev server
pnpm build         # Build for production
pnpm tsc --noEmit  # Type check

# Test registry
curl http://localhost:3000/r/[component-name].json

# Install component
pnpm dlx shadcn@latest add http://localhost:3000/r/[name].json
```

## Reference Docs

See `.claude/docs/official-registry/` for shadcn registry documentation.
