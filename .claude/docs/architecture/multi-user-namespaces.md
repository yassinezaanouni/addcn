# Multi-User Architecture with Namespaces

## Overview

Transform addcn from a local dev tool into a multi-user registry platform where users can publish, share, and install components via namespaced URLs.

## URL Structure

URLs use clean paths (no `@`), display names show `@` for clarity.

```
# User namespace
URL:     https://addcn.dev/r/yassin/button.json
Display: @yassin/button

# Organization namespace
URL:     https://addcn.dev/r/acme/data-table.json
Display: @acme/data-table

# Install command (clean, no escaping needed)
pnpm dlx shadcn@latest add https://addcn.dev/r/yassin/button.json
```

### Why no `@` in URLs?
- No URL encoding issues (`@` becomes `%40` in some contexts)
- Easier to type in terminal
- The `/r/` prefix already indicates registry namespace
- Display/UI still shows `@yassin` for convention

## Authentication with Better Auth + Convex

### Why Better Auth
- Open source, self-hosted
- Full control over auth flow
- No vendor lock-in
- Free (you host it)
- Official Convex integration via `@convex-dev/better-auth`

### Installation
```bash
# Convex + Better Auth
pnpm add convex@latest @convex-dev/better-auth
pnpm add better-auth@1.4.9 --save-exact

# TanStack Query integration
pnpm add @tanstack/react-query @convex-dev/react-query
```
**Note:** Requires Convex 1.25.0 or later.

---

### Step 1: Register Convex Component
`convex/convex.config.ts`
```typescript
import { defineApp } from "convex/server";
import betterAuth from "@convex-dev/better-auth/convex.config";

const app = defineApp();
app.use(betterAuth);

export default app;
```

### Step 2: Auth Config Provider
`convex/auth.config.ts`
```typescript
import { getAuthConfigProvider } from "@convex-dev/better-auth/auth-config";
import type { AuthConfig } from "convex/server";

export default {
  providers: [getAuthConfigProvider()],
} satisfies AuthConfig;
```

### Step 3: Better Auth Server Instance
`convex/auth.ts`
```typescript
import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import { betterAuth } from "better-auth/minimal";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;

export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
  return betterAuth({
    baseURL: siteUrl,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    socialProviders: {
      github: {
        clientId: process.env.GITHUB_CLIENT_ID!,
        clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      },
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID!,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      },
    },
    plugins: [convex({ authConfig })],
  });
};

// Get current authenticated user
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.getAuthUser(ctx);
  },
});
```

### Step 4: HTTP Router
`convex/http.ts`
```typescript
import { httpRouter } from "convex/server";
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

authComponent.registerRoutes(http, createAuth);

export default http;
```

### Step 5: Auth Client
`lib/auth-client.ts`
```typescript
import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient = createAuthClient({
  plugins: [convexClient()],
});
```

### Step 6: Next.js Server Utilities
`lib/auth-server.ts`
```typescript
import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

export const {
  handler,
  preloadAuthQuery,
  isAuthenticated,
  getToken,
  fetchAuthQuery,
  fetchAuthMutation,
  fetchAuthAction,
} = convexBetterAuthNextJs({
  convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL!,
  convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL!,
});
```

### Step 7: Next.js API Route
`app/api/auth/[...all]/route.ts`
```typescript
import { handler } from "@/lib/auth-server";

export const { GET, POST } = handler;
```

### Step 8: Convex Provider with Auth + TanStack Query
`app/ConvexClientProvider.tsx`
```typescript
"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { authClient } from "@/lib/auth-client";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

// TanStack Query + Convex integration
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryKeyHashFn: convexQueryClient.hashFn(),
      queryFn: convexQueryClient.queryFn(),
    },
  },
});
convexQueryClient.connect(queryClient);

export function ConvexClientProvider({
  children,
  initialToken,
}: {
  children: ReactNode;
  initialToken?: string | null;
}) {
  return (
    <ConvexBetterAuthProvider
      client={convex}
      authClient={authClient}
      initialToken={initialToken}
    >
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </ConvexBetterAuthProvider>
  );
}
```

---

### Usage in Components

**Auth state:** Use Convex's auth components (NOT Better Auth's `useSession()`):

```typescript
"use client";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { authClient } from "@/lib/auth-client";

export function AuthButton() {
  return (
    <>
      <AuthLoading>
        <Skeleton className="h-9 w-20" />
      </AuthLoading>

      <Unauthenticated>
        <Button onClick={() => authClient.signIn.social({ provider: "github" })}>
          Sign in with GitHub
        </Button>
      </Unauthenticated>

      <Authenticated>
        <Button onClick={() => authClient.signOut()}>
          Sign out
        </Button>
      </Authenticated>
    </>
  );
}
```

**Data fetching:** Use TanStack Query with `convexQuery`:

```typescript
"use client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";
import { api } from "@/convex/_generated/api";

export function ComponentList() {
  // Query with loading/error states
  const { data: components, isPending, isError, error } = useQuery(
    convexQuery(api.components.getMyComponents, {})
  );

  if (isPending) return <Skeleton />;
  if (isError) return <div>Error: {error.message}</div>;

  return (
    <ul>
      {components.map((c) => (
        <li key={c._id}>{c.name}</li>
      ))}
    </ul>
  );
}

export function CreateComponentButton() {
  // Mutation with loading state
  const { mutate, isPending } = useMutation({
    mutationFn: useConvexMutation(api.components.create),
  });

  return (
    <Button
      onClick={() => mutate({ name: "my-component" })}
      disabled={isPending}
    >
      {isPending ? "Creating..." : "Create Component"}
    </Button>
  );
}
```

**Why TanStack Query:**
- `isPending`, `isLoading`, `isError`, `isFetching` out of the box
- Familiar API if you know React Query
- Real-time updates (Convex pushes changes automatically)
- No manual cache invalidation needed

### Usage in Convex Functions

See the "Convex Functions" section below for complete implementations. Key pattern:

```typescript
// Always get user from identity first
const identity = await ctx.auth.getUserIdentity();
if (!identity) throw new Error("Not authenticated");

const user = await ctx.db
  .query("users")
  .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
  .unique();

if (!user) throw new Error("User not found");

// Then use user._id (not identity.subject) for relationships
await ctx.db.insert("components", {
  userId: user._id,  // ✓ Correct: Id<"users">
  createdBy: user._id,
  // ...
});
```

**Important:** `identity.subject` is a string from the auth provider. `userId` fields expect `Id<"users">`. Always look up the user first.

### Component Client Methods

```typescript
// In convex functions, use authComponent methods:

// Get auth object with headers for API calls
const { auth, headers } = await authComponent.getAuth(createAuth, ctx);
await auth.api.changePassword({
  body: { newPassword, currentPassword },
  headers,
});

// Get any user by ID
const user = await authComponent.getAnyUserById(ctx, userId);

// Get current authenticated user
const currentUser = await authComponent.getAuthUser(ctx);
```

---

### Username Selection Flow

After OAuth signup, redirect to onboarding to choose username:

```typescript
// app/onboarding/page.tsx
"use client";
import { useState } from "react";
import { Authenticated, useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";

export default function OnboardingPage() {
  const router = useRouter();
  const user = useQuery(api.users.getMe);
  const setUsername = useMutation(api.users.setUsername);
  const [username, setUsernameValue] = useState("");

  // Already has username, redirect
  if (user?.username) {
    router.push("/dashboard");
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await setUsername({ username });
    router.push("/dashboard");
  }

  return (
    <Authenticated>
      <form onSubmit={handleSubmit}>
        <Input
          value={username}
          onChange={(e) => setUsernameValue(e.target.value)}
          placeholder="Choose a username"
        />
        <Button type="submit">Continue</Button>
      </form>
    </Authenticated>
  );
}
```

## Database Schema (Convex)

### Users Table
```typescript
// convex/schema.ts
users: defineTable({
  username: v.optional(v.string()),  // set during onboarding, unique when set
  email: v.string(),
  avatarUrl: v.optional(v.string()),
  externalId: v.string(),    // auth provider ID (identity.subject)
  createdAt: v.string(),
})
  .index("by_username", ["username"])
  .index("by_external_id", ["externalId"])
```

**Note:** `username` is optional because OAuth users are created without one. They set it during onboarding. The app should redirect users without usernames to `/onboarding`.

## How Organizations Work

Organizations are **containers**, not accounts. They don't have login credentials.

### Org Lifecycle
```
1. User "yassin" creates org "Acme Inc" with slug "acme"
   → yassin becomes owner of @acme

2. yassin invites john@email.com as admin
   → john receives email invite
   → john clicks link, logs in (or signs up)
   → john is now admin of @acme

3. Both yassin and john can:
   → View all @acme components (public + private)
   → Create new components under @acme
   → john can edit (admin), yassin can do everything (owner)
```

### User's Perspective
```
┌─────────────────────────────────────────────┐
│ yassin@email.com                            │
├─────────────────────────────────────────────┤
│ Personal: @yassin                           │
│   └── 5 components                          │
│                                             │
│ Organizations:                              │
│   ├── Acme Inc (@acme) .......... owner     │
│   │   └── 12 components                     │
│   └── Startup (@startup) ........ member    │
│       └── 3 components                      │
└─────────────────────────────────────────────┘
```

### Member Roles

| Role | View Private | Create | Edit | Delete | Manage Members | Delete Org |
|------|--------------|--------|------|--------|----------------|------------|
| Member | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Owner | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

- **Member**: Can view and create, but not edit others' components
- **Admin**: Full component access + can invite/remove members
- **Owner**: Everything + can delete the org (only 1 owner, can transfer)

### Organizations Table
```typescript
organizations: defineTable({
  name: v.string(),          // display name: "Acme Inc"
  slug: v.string(),          // unique namespace: "acme" → @acme
  avatarUrl: v.optional(v.string()),
  createdAt: v.string(),
})
  .index("by_slug", ["slug"])
```

### Organization Members Table
```typescript
orgMembers: defineTable({
  orgId: v.id("organizations"),
  userId: v.id("users"),
  role: v.union(
    v.literal("owner"),    // 1 per org, full control
    v.literal("admin"),    // can manage members + components
    v.literal("member")    // can view + create only
  ),
  invitedBy: v.optional(v.id("users")),
  joinedAt: v.string(),
})
  .index("by_org", ["orgId"])
  .index("by_user", ["userId"])
  .index("by_org_user", ["orgId", "userId"])  // for quick membership lookup
```

### Invites Table
```typescript
invites: defineTable({
  orgId: v.id("organizations"),
  email: v.string(),
  role: v.union(v.literal("admin"), v.literal("member")),
  invitedBy: v.id("users"),
  token: v.string(),        // unique invite token
  expiresAt: v.string(),    // 7 days from creation
  createdAt: v.string(),
})
  .index("by_token", ["token"])
  .index("by_org", ["orgId"])
  .index("by_email", ["email"])
```

### Invite Flow
```typescript
// 1. Admin/Owner invites by email (Convex mutation)
const createInvite = useMutation(api.organizations.createInvite);
await createInvite({ orgId, email: "john@email.com", role: "admin" });

// 2. Mutation creates invite record and sends email with link: /invite/[token]

// 3. User clicks link → /invite/[token] page
const invite = useQuery(api.organizations.getInviteByToken, { token });
const acceptInvite = useMutation(api.organizations.acceptInvite);
//    → If logged in: accept invite, redirect to org page
//    → If not logged in: redirect to signup, then accept

// 4. acceptInvite mutation: validates token, creates orgMember, deletes invite
```

### Components Table
```typescript
// File validator (reusable)
const componentFileValidator = v.object({
  path: v.string(),
  content: v.string(),
  type: v.union(
    v.literal("registry:ui"),
    v.literal("registry:hook"),
    v.literal("registry:lib"),
    v.literal("registry:style"),
    v.literal("registry:file")
  ),
});

components: defineTable({
  // Ownership - either user OR org, not both
  userId: v.optional(v.id("users")),      // personal component owner
  orgId: v.optional(v.id("organizations")), // org component owner
  createdBy: v.id("users"),               // who created it (always set)

  // Component data
  name: v.string(),          // unique within namespace
  title: v.string(),
  description: v.string(),
  files: v.array(componentFileValidator),
  dependencies: v.array(v.string()),
  registryDependencies: v.array(v.string()),

  // Visibility
  isPublic: v.boolean(),     // public or private

  // Stats
  downloads: v.number(),     // download count

  // Timestamps
  createdAt: v.string(),
  updatedAt: v.string(),
})
  .index("by_user_name", ["userId", "name"])
  .index("by_org_name", ["orgId", "name"])
  .index("by_user", ["userId"])
  .index("by_org", ["orgId"])
  .index("by_creator", ["createdBy"])
  .index("by_public", ["isPublic"])
```

### Component Creation Rules
```typescript
// Personal component
{
  userId: currentUser.id,
  orgId: undefined,
  createdBy: currentUser.id,
  isPublic: false,  // default private
}

// Org component (user must be org member)
{
  userId: undefined,
  orgId: selectedOrg.id,
  createdBy: currentUser.id,
  isPublic: false,  // default private
}
```

## Convex Functions

With Convex, you don't use traditional Next.js API routes. Instead, create Convex functions in the `convex/` folder that are called directly from the client.

### Registry Endpoint (HTTP Action)

The registry endpoint is the one exception - it needs to be a public HTTP endpoint for the shadcn CLI.

```typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";  // Use internal, not api
import { authComponent, createAuth } from "./auth";

const http = httpRouter();

// Auth routes
authComponent.registerRoutes(http, createAuth);

// CORS headers for external CLI access
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// Registry endpoint: GET /r/[namespace]/[name].json
http.route({
  path: "/r/{namespace}/{name}.json",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/");
    const namespace = pathParts[2];
    const name = pathParts[3].replace(".json", "");

    // Use internal query - not exposed to clients
    const result = await ctx.runQuery(internal.registry.getPublicComponent, {
      namespace,
      name,
    });

    if (!result) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Increment downloads (fire and forget) - use internal mutation
    ctx.runMutation(internal.registry.incrementDownloads, { componentId: result._id });

    return new Response(JSON.stringify(result.registryJson), {
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }),
});

// Handle CORS preflight
http.route({
  path: "/r/{namespace}/{name}.json",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

export default http;
```

**Best Practice:** HTTP actions should call `internal` functions (via `internal.module.function`), not public ones (via `api.module.function`). This prevents these functions from being directly callable by clients.

### Users Functions

```typescript
// convex/users.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Get current user profile
export const getMe = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    return await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
      .unique();
  },
});

// Update current user profile
export const updateMe = mutation({
  args: {
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, args);
    return user._id;
  },
});

// Get public profile by username
export const getByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (!user) return null;

    // Return only public fields
    return {
      username: user.username,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    };
  },
});

// Set username (onboarding)
export const setUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // Validate username format
    if (!isValidUsername(username)) {
      throw new Error("Invalid username format");
    }

    // Check if username is taken
    const existing = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", username))
      .unique();

    if (existing) throw new Error("Username already taken");

    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    await ctx.db.patch(user._id, { username });
    return user._id;
  },
});

function isValidUsername(username: string): boolean {
  const RESERVED_NAMES = [
    "admin", "api", "app", "auth", "dashboard",
    "editor", "help", "login", "logout", "new",
    "r", "registry", "settings", "signup", "www"
  ];

  const regex = /^[a-z0-9]([a-z0-9-]{1,37}[a-z0-9])?$/;
  if (!regex.test(username)) return false;
  if (username.includes("--")) return false;
  if (RESERVED_NAMES.includes(username)) return false;

  return true;
}
```

### Components Functions

```typescript
// convex/components.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List user's components (personal + org)
export const getMyComponents = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) return [];

    // Get personal components
    const personal = await ctx.db
      .query("components")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get org memberships
    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    // Get org components
    const orgComponents = await Promise.all(
      memberships.map((m) =>
        ctx.db
          .query("components")
          .withIndex("by_org", (q) => q.eq("orgId", m.orgId))
          .collect()
      )
    );

    return [...personal, ...orgComponents.flat()];
  },
});

// File type validator (matches schema)
const fileTypeValidator = v.union(
  v.literal("registry:ui"),
  v.literal("registry:hook"),
  v.literal("registry:lib"),
  v.literal("registry:style"),
  v.literal("registry:file")
);

// Create component
export const create = mutation({
  args: {
    name: v.string(),
    title: v.string(),
    description: v.string(),
    files: v.array(v.object({
      path: v.string(),
      content: v.string(),
      type: fileTypeValidator,
    })),
    dependencies: v.array(v.string()),
    registryDependencies: v.array(v.string()),
    orgId: v.optional(v.id("organizations")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const now = new Date().toISOString();

    return await ctx.db.insert("components", {
      userId: args.orgId ? undefined : user._id,
      orgId: args.orgId,
      createdBy: user._id,
      name: args.name,
      title: args.title,
      description: args.description,
      files: args.files,
      dependencies: args.dependencies,
      registryDependencies: args.registryDependencies,
      isPublic: false,
      downloads: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get single component
export const get = query({
  args: { id: v.id("components") },
  handler: async (ctx, { id }) => {
    return await ctx.db.get(id);
  },
});

// Update component
export const update = mutation({
  args: {
    id: v.id("components"),
    name: v.optional(v.string()),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    files: v.optional(v.array(v.object({
      path: v.string(),
      content: v.string(),
      type: fileTypeValidator,
    }))),
    dependencies: v.optional(v.array(v.string())),
    registryDependencies: v.optional(v.array(v.string())),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, { id, ...updates }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // TODO: Check edit permission

    await ctx.db.patch(id, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  },
});

// Delete component
export const remove = mutation({
  args: { id: v.id("components") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // TODO: Check delete permission

    await ctx.db.delete(id);
  },
});

// Transfer component to org
export const transfer = mutation({
  args: {
    componentId: v.id("components"),
    orgId: v.id("organizations"),
  },
  handler: async (ctx, { componentId, orgId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    const component = await ctx.db.get(componentId);
    if (!component) throw new Error("Component not found");

    // Must own the component personally
    if (component.userId !== user._id) {
      throw new Error("Can only transfer your own components");
    }

    // Must be member of target org
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) => q.eq("orgId", orgId).eq("userId", user._id))
      .unique();

    if (!membership) throw new Error("Not a member of this organization");

    await ctx.db.patch(componentId, {
      userId: undefined,
      orgId: orgId,
      updatedAt: new Date().toISOString(),
    });
  },
});
```

### Organizations Functions

```typescript
// convex/organizations.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// List user's organizations
export const getMyOrgs = query({
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) return [];

    const memberships = await ctx.db
      .query("orgMembers")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const orgs = await Promise.all(
      memberships.map(async (m) => {
        const org = await ctx.db.get(m.orgId);
        return org ? { ...org, role: m.role } : null;
      })
    );

    return orgs.filter(Boolean);
  },
});

// Create organization
export const create = mutation({
  args: {
    name: v.string(),
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", identity.subject))
      .unique();

    if (!user) throw new Error("User not found");

    // Check slug is available
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", args.slug))
      .unique();

    if (existing) throw new Error("Organization slug already taken");

    const now = new Date().toISOString();

    const orgId = await ctx.db.insert("organizations", {
      name: args.name,
      slug: args.slug,
      createdAt: now,
    });

    // Add creator as owner
    await ctx.db.insert("orgMembers", {
      orgId,
      userId: user._id,
      role: "owner",
      joinedAt: now,
    });

    return orgId;
  },
});

// Get organization by slug
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
  },
});

// Add member to organization
export const addMember = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // TODO: Check if current user is admin/owner of org

    const now = new Date().toISOString();

    return await ctx.db.insert("orgMembers", {
      orgId: args.orgId,
      userId: args.userId,
      role: args.role,
      joinedAt: now,
    });
  },
});

// Remove member from organization
export const removeMember = mutation({
  args: {
    orgId: v.id("organizations"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // TODO: Check if current user is admin/owner of org
    // TODO: Prevent removing the last owner

    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) => q.eq("orgId", args.orgId).eq("userId", args.userId))
      .unique();

    if (membership) {
      await ctx.db.delete(membership._id);
    }
  },
});

// Delete organization
export const remove = mutation({
  args: { id: v.id("organizations") },
  handler: async (ctx, { id }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    // TODO: Check if current user is owner
    // TODO: Delete all org components and memberships

    await ctx.db.delete(id);
  },
});
```

### Frontend Usage

```typescript
// Using Convex hooks directly
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const user = useQuery(api.users.getMe);
const components = useQuery(api.components.getMyComponents);
const createComponent = useMutation(api.components.create);

// Using TanStack Query (for isPending, isLoading, etc.)
import { useQuery, useMutation } from "@tanstack/react-query";
import { convexQuery, useConvexMutation } from "@convex-dev/react-query";

const { data: user, isPending } = useQuery(convexQuery(api.users.getMe, {}));
const { mutate, isPending: isCreating } = useMutation({
  mutationFn: useConvexMutation(api.components.create),
});
```

## Namespace Resolution

```typescript
// convex/lib/namespace.ts
// Helper function (not a query) - can be called from other queries/mutations
import { QueryCtx } from "../_generated/server";
import { Id } from "../_generated/dataModel";

type NamespaceOwner =
  | { type: "user"; userId: Id<"users">; username: string }
  | { type: "org"; orgId: Id<"organizations">; slug: string };

export async function resolveNamespace(
  ctx: QueryCtx,
  namespace: string
): Promise<NamespaceOwner | null> {
  // Remove @ prefix if present
  const slug = namespace.replace(/^@/, "");

  // Check users first
  const user = await ctx.db
    .query("users")
    .withIndex("by_username", (q) => q.eq("username", slug))
    .unique();

  if (user && user.username) {
    return { type: "user", userId: user._id, username: user.username };
  }

  // Check organizations
  const org = await ctx.db
    .query("organizations")
    .withIndex("by_slug", (q) => q.eq("slug", slug))
    .unique();

  if (org) {
    return { type: "org", orgId: org._id, slug: org.slug };
  }

  return null;
}
```

```typescript
// convex/registry.ts
import { internalQuery, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";
import { resolveNamespace } from "./lib/namespace";

// Internal query - only called from HTTP action, not exposed to clients
export const getPublicComponent = internalQuery({
  args: { namespace: v.string(), name: v.string() },
  handler: async (ctx, { namespace, name }) => {
    const owner = await resolveNamespace(ctx, namespace);
    if (!owner) return null;

    let component;
    if (owner.type === "user") {
      component = await ctx.db
        .query("components")
        .withIndex("by_user_name", (q) =>
          q.eq("userId", owner.userId).eq("name", name)
        )
        .unique();
    } else {
      component = await ctx.db
        .query("components")
        .withIndex("by_org_name", (q) =>
          q.eq("orgId", owner.orgId).eq("name", name)
        )
        .unique();
    }

    if (!component || !component.isPublic) return null;

    return {
      ...component,
      registryJson: componentToRegistryJson(component, namespace),
    };
  },
});

// Internal mutation - only called from HTTP action
export const incrementDownloads = internalMutation({
  args: { componentId: v.id("components") },
  handler: async (ctx, { componentId }) => {
    const component = await ctx.db.get(componentId);
    if (component) {
      await ctx.db.patch(componentId, {
        downloads: component.downloads + 1,
      });
    }
  },
});

// Helper to convert component to shadcn registry format
function componentToRegistryJson(component: Doc<"components">, namespace: string) {
  return {
    name: component.name,
    type: "registry:ui",
    title: component.title,
    description: component.description,
    dependencies: component.dependencies,
    registryDependencies: component.registryDependencies,
    files: component.files.map((f) => ({
      path: f.path,
      content: f.content,
      type: f.type,
      // Add target for registry:file types
      ...(f.type === "registry:file" ? { target: `~/${f.path}` } : {}),
    })),
  };
}
```

**Important:** `resolveNamespace` is a helper function, not a query. You cannot call queries from inside other queries in Convex. Helper functions can be imported and used within query/mutation handlers.

## Component Ownership & Visibility

### Ownership Model
A component belongs to ONE of:
- **Personal**: Owned by a user (`userId` set, `orgId` null)
- **Organization**: Owned by an org (`orgId` set, `userId` null, `createdBy` tracks creator)

### Visibility Levels
- **Private**: Only owner (personal) or org members (org) can access
- **Public**: Anyone can access/install via registry URL

### User's View
```
My Components
├── Personal (@yassin namespace)
│   ├── button (private)      → /r/yassin/button.json
│   ├── card (public)         → /r/yassin/card.json
│   └── data-table (private)  → /r/yassin/data-table.json
│
└── Acme Inc (@acme namespace)
    ├── dashboard (private)   → /r/acme/dashboard.json (org members only)
    └── chart (public)        → /r/acme/chart.json (anyone)
```

### Publishing Flow
Any component owner can toggle visibility:

```typescript
// Using Convex mutation
const updateComponent = useMutation(api.components.update);

// User publishes their private component
await updateComponent({ id: componentId, isPublic: true });

// Org admin publishes org component
await updateComponent({ id: componentId, isPublic: true });
```

**UI Flow:**
1. Component detail page shows "Private" badge
2. Owner clicks "Publish" button
3. Confirmation modal: "This will make the component publicly accessible at /r/yassin/button.json"
4. Component is now public, badge changes to "Public"
5. Can unpublish anytime (back to private)

## Permissions

### Permission Matrix

| Action | Personal Component | Org Component |
|--------|-------------------|---------------|
| View (private) | Owner only | Org members |
| View (public) | Anyone | Anyone |
| Edit | Owner | Org admin/owner |
| Delete | Owner | Org owner |
| Publish/Unpublish | Owner | Org admin/owner |
| Transfer to Org | Owner | N/A |

### Component Access
```typescript
// convex/lib/permissions.ts
import { Doc, Id } from "../_generated/dataModel";
import { QueryCtx } from "../_generated/server";

export async function canAccessComponent(
  ctx: QueryCtx,
  userId: Id<"users"> | null,
  component: Doc<"components">
): Promise<boolean> {
  // Public components - anyone can access
  if (component.isPublic) return true;

  // Must be logged in for private
  if (!userId) return false;

  // Personal component - owner only
  if (component.userId) {
    return component.userId === userId;
  }

  // Org component - any org member
  if (component.orgId) {
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", component.orgId!).eq("userId", userId)
      )
      .unique();
    return membership !== null;
  }

  return false;
}
```

### Component Edit
```typescript
export async function canEditComponent(
  ctx: QueryCtx,
  userId: Id<"users"> | null,
  component: Doc<"components">
): Promise<boolean> {
  if (!userId) return false;

  // Personal component - owner can edit
  if (component.userId) {
    return component.userId === userId;
  }

  // Org component - admin/owner can edit
  if (component.orgId) {
    const membership = await ctx.db
      .query("orgMembers")
      .withIndex("by_org_user", (q) =>
        q.eq("orgId", component.orgId!).eq("userId", userId)
      )
      .unique();
    return membership?.role === "owner" || membership?.role === "admin";
  }

  return false;
}
```

### Publish Permission
```typescript
export async function canPublishComponent(
  ctx: QueryCtx,
  userId: Id<"users"> | null,
  component: Doc<"components">
): Promise<boolean> {
  // Same as edit permission - if you can edit, you can publish
  return canEditComponent(ctx, userId, component);
}
```

## Transfer Component to Organization

Users can transfer personal components to an organization they're a member of.

### Transfer Flow
```
1. User owns personal component: @yassin/button
2. User clicks "Transfer to Organization"
3. Select org: "Acme Inc"
4. Confirm: "Transfer button to @acme? You will lose personal ownership."
5. Component moves: @yassin/button → @acme/button
```

### Transfer API
```typescript
// Using Convex mutation
const transferComponent = useMutation(api.components.transfer);
await transferComponent({ componentId, orgId });
```

### Transfer Rules
```typescript
// convex/lib/permissions.ts
export async function canTransferComponent(
  ctx: QueryCtx,
  userId: Id<"users">,
  component: Doc<"components">,
  targetOrgId: Id<"organizations">
): Promise<boolean> {
  // Must own the component personally
  if (component.userId !== userId) return false;

  // Must be member of target org
  const membership = await ctx.db
    .query("orgMembers")
    .withIndex("by_org_user", (q) =>
      q.eq("orgId", targetOrgId).eq("userId", userId)
    )
    .unique();
  if (!membership) return false;

  // Check name doesn't conflict in target org
  const existing = await ctx.db
    .query("components")
    .withIndex("by_org_name", (q) =>
      q.eq("orgId", targetOrgId).eq("name", component.name)
    )
    .unique();
  if (existing) return false; // Name already taken in org

  return true;
}
```

### Transfer Implementation
```typescript
// Already implemented in convex/components.ts transfer mutation
// See the "Components Functions" section above
```

## Username/Slug Validation

```typescript
// convex/lib/validation.ts
// Used in both users.ts and organizations.ts

export const RESERVED_NAMES = [
  "admin", "api", "app", "auth", "dashboard",
  "editor", "help", "login", "logout", "new",
  "r", "registry", "settings", "signup", "www"
];

export function isValidUsername(username: string): boolean {
  // 3-39 chars, lowercase alphanumeric + hyphens
  // Cannot start/end with hyphen
  // Cannot have consecutive hyphens
  const regex = /^[a-z0-9]([a-z0-9-]{1,37}[a-z0-9])?$/;

  if (!regex.test(username)) return false;
  if (username.includes("--")) return false;
  if (RESERVED_NAMES.includes(username)) return false;

  return true;
}

// Same validation for org slugs
export const isValidOrgSlug = isValidUsername;
```

## UI Pages

### New Pages Needed
```
/login                    # Login page
/signup                   # Signup + username selection
/settings                 # User settings
/settings/profile         # Profile settings
/[username]               # Public profile page
/[username]/[component]   # Component detail page
/dashboard                # User's components dashboard
/new                      # Create new component (replaces /editor)
/edit/[id]                # Edit component
/orgs/new                 # Create organization
/orgs/[slug]/settings     # Org settings
```

### Dashboard Features
- List all user's components
- Filter by: all, public, private
- Sort by: updated, created, downloads, name
- Quick actions: edit, delete, copy URL, toggle visibility

## Migration Path

### Phase 1: Add Auth + Convex
1. Set up Convex with Better Auth (see auth setup above)
2. Create users table, components table
3. Add user registration with username onboarding
4. Migrate local JSON storage to Convex

### Phase 2: Namespaced Registry
1. Add namespace routes `/r/[username]/[name].json`
2. Update registry HTTP action
3. Keep old `/r/[name]` working temporarily (redirect)

### Phase 3: Organizations
1. Add organizations and orgMembers tables
2. Add org creation UI
3. Add member management
4. Add org-scoped components

### Phase 4: Polish
1. Public profiles
2. Component discovery/search
3. Download stats
4. Component versioning (optional)

## Environment Variables

### Local `.env.local`
```env
# Convex
CONVEX_DEPLOYMENT=dev:adjective-animal-123
NEXT_PUBLIC_CONVEX_URL=https://adjective-animal-123.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://adjective-animal-123.convex.site

# App
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Convex Environment Variables
Set these via CLI:
```bash
# Generate and set auth secret
npx convex env set BETTER_AUTH_SECRET $(openssl rand -base64 32)

# Site URL
npx convex env set SITE_URL http://localhost:3000

# GitHub OAuth
npx convex env set GITHUB_CLIENT_ID your_client_id
npx convex env set GITHUB_CLIENT_SECRET your_client_secret

# Google OAuth (optional)
npx convex env set GOOGLE_CLIENT_ID your_client_id
npx convex env set GOOGLE_CLIENT_SECRET your_client_secret
```

### Getting OAuth Credentials

**GitHub:**
1. Go to https://github.com/settings/developers
2. New OAuth App
3. Homepage URL: `http://localhost:3000`
4. Callback URL: `https://adjective-animal-123.convex.site/api/auth/callback/github`

**Google:**
1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Authorized redirect URI: `https://adjective-animal-123.convex.site/api/auth/callback/google`

**Note:** OAuth callbacks go to the Convex site URL, not localhost.

## Security Considerations

1. **Rate limiting** - Prevent abuse on registry endpoints
2. **Input validation** - Sanitize all user inputs
3. **Private components** - Ensure no data leakage
4. **Username squatting** - Consider verification for popular names
5. **Malicious code** - Consider scanning component content (future)
