# Prompt: Implement Multi-User Architecture for addcn

## Project Context

You are implementing a multi-user system for **addcn**, a shadcn component registry builder. Transform it from a local dev tool into a multi-user platform where users can publish, share, and install components via namespaced URLs (e.g., `@yassin/button`).

## Reference Documentation

**IMPORTANT:** Read these before implementing:

1. **Architecture Doc:** `.claude/docs/architecture/multi-user-namespaces.md` - Complete schema, Convex functions, auth setup, permissions
2. **Better Auth + Convex:** https://docs.convex.dev/auth/database/better-auth
3. **TanStack Query + Convex:** https://docs.convex.dev/client/tanstack/tanstack-query
4. **Convex Best Practices:** https://docs.convex.dev/understanding/best-practices
5. **HTTP Actions:** https://docs.convex.dev/functions/http-actions
6. **Internal Functions:** https://docs.convex.dev/functions/internal-functions

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** Convex
- **Auth:** Better Auth with `@convex-dev/better-auth`
- **State:** TanStack Query with `@convex-dev/react-query`
- **Styling:** Tailwind CSS + shadcn/ui components
- **Icons:** Tabler Icons (`@tabler/icons-react`)

**shadcn Rule:** Always install shadcn components via CLI, never copy-paste:

```bash
pnpm dlx shadcn@latest add <component-name>
```

---

## Implementation Guidelines

### Code Practices

1. **DRY Principle**
   - Extract reusable logic into `convex/lib/` (permissions, validation, namespace resolution)
   - Create shared validators and constants
   - All helpers are plain TypeScript functions (not queries/mutations)

2. **Convex Patterns**
   - Use `internalQuery`/`internalMutation` for functions called only from HTTP actions
   - Use `internal` import (not `api`) when calling from HTTP actions
   - Always get user via `ctx.auth.getUserIdentity()` then lookup in DB
   - Never accept user identity as function arguments

### UI/UX Practices

1. **States** - Handle loading (`isPending`), error, and empty states for all data
2. **Feedback** - Toast for success/error, inline errors on forms
3. **Confirmations** - AlertDialog for destructive actions
4. **Accessibility** - ARIA labels, keyboard nav, proper heading hierarchy
5. **Responsive** - Mobile-first, collapsible sidebar

---

## Implementation Phases

### Phase 1: Auth + Database Foundation

1. Set up Convex schema (all tables from architecture doc)
2. Configure Better Auth with GitHub/Google OAuth (follow the 8 steps in architecture doc)
3. Set up ConvexClientProvider with TanStack Query
4. Implement user functions (getMe, updateMe, setUsername)
5. Create onboarding flow for username selection

### Phase 2: Components & Registry

1. Update components table schema (add userId, orgId, isPublic, downloads)
2. Implement component CRUD with permission checks
3. Create internal registry functions + HTTP action
4. Build dashboard UI with component list
5. Add publish/unpublish toggle

### Phase 3: Organizations

1. Implement organization CRUD
2. Build member management (invite, remove, change role)
3. Create invite flow
4. Add org context selector (OrgSwitcher)

### Phase 4: Polish

1. Public profile pages (`/[username]`)
2. Component detail pages (`/[username]/[component]`)
3. Search and discovery
4. Settings pages

---

## Component Patterns

### Existing Components to Reuse

- **Empty State:** See `app/_components/empty-state.tsx` for the pattern - extend it to be reusable with props for icon, title, description, action
- **UI Components:** All shadcn components in `components/ui/`
- **Editor Components:** `app/editor/[[...slug]]/_components/` for Monaco, file tree, etc.

### Key Patterns

**Data Fetching:** Use TanStack Query's `isPending`, `isError` for loading/error states.

**Mutations:** Use async/await pattern, NOT onSuccess callbacks:

```typescript
const { mutateAsync, isPending } = useMutation({
  mutationFn: useConvexMutation(api.components.remove),
});

async function handleDelete() {
  try {
    await mutateAsync({ id: componentId });
    toast.success("Component deleted");
    setOpen(false);
  } catch (error) {
    toast.error(error.message);
  }
}
```

**Confirmations:** Use AlertDialog from shadcn for destructive actions.

---

## File Organization

**Co-located components pattern:** Route-specific components live next to their pages in `_components/` folders.

```
app/
├── (auth)/
│   ├── login/
│   │   ├── page.tsx
│   │   └── _components/
│   │       └── login-form.tsx
│   └── onboarding/
│       ├── page.tsx
│       └── _components/
│           └── username-form.tsx
├── (dashboard)/
│   ├── layout.tsx
│   ├── page.tsx
│   └── _components/
│       └── component-list.tsx
├── orgs/
│   ├── page.tsx
│   ├── new/
│   │   └── page.tsx
│   ├── [slug]/
│   │   ├── page.tsx
│   │   ├── settings/
│   │   │   └── page.tsx
│   │   └── members/
│   │       └── page.tsx
│   └── _components/
│       ├── org-card.tsx
│       └── member-list.tsx
├── [username]/
│   ├── page.tsx
│   └── [component]/
│       └── page.tsx
└── invite/
    └── [token]/
        └── page.tsx
```

- **Route-specific:** `_components/` folders alongside pages
- **Shared across routes:** `components/` at project root (layout, shadcn UI)
- **Convex helpers:** `convex/lib/` for permissions, validation, etc.

---

## Quality Checklist

- [ ] Convex functions have argument validation with `v.` validators
- [ ] Permission checks on all mutations
- [ ] Loading/error/empty states handled
- [ ] Destructive actions require confirmation
- [ ] TypeScript passes (`pnpm tsc --noEmit`)

---

## Notes

- Reference the architecture doc for all schema and function implementations
- Reuse existing Monaco editor and file tree components
- Follow `CLAUDE.md` for code style
- Test registry: `curl https://[convex-site-url]/r/[namespace]/[name].json`
- Test CLI: `pnpm dlx shadcn@latest add https://[convex-site-url]/r/[namespace]/[name].json`
