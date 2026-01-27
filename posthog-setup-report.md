# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into your addcn project. This integration tracks user behavior across the entire user journey - from initial sign-in attempts through onboarding, component management, and organization collaboration. Both client-side and server-side events are captured, with error tracking enabled throughout.

## Integration Summary

### Files Created

- `instrumentation-client.ts` - Client-side PostHog initialization using Next.js 15.3+ recommended pattern
- `lib/posthog-server.ts` - Server-side PostHog client for API route tracking
- `next.config.ts` - Updated with reverse proxy rewrites to avoid ad blockers

### Environment Variables Added

- `NEXT_PUBLIC_POSTHOG_KEY` - PostHog project API key
- `NEXT_PUBLIC_POSTHOG_HOST` - PostHog host URL

## Events Implemented

| Event Name                     | Description                                                  | File                                                                         |
| ------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| `sign_in_started`              | User initiated social sign in (GitHub or Google)             | `app/(auth)/login/_components/login-form.tsx`                                |
| `username_claimed`             | User successfully claimed a username during onboarding       | `app/(auth)/onboarding/_components/username-form.tsx`                        |
| `username_claim_started`       | User started the username claiming process from landing page | `app/(marketing)/_components/username-claim-hero.tsx`                        |
| `component_created`            | User created a new registry component                        | `app/(dashboard)/dashboard/editor/_components/toolbar.tsx`                   |
| `component_updated`            | User updated an existing registry component                  | `app/(dashboard)/dashboard/editor/_components/toolbar.tsx`                   |
| `component_deleted`            | User deleted a registry component                            | `app/(dashboard)/dashboard/_components/delete-component-button.tsx`          |
| `organization_created`         | User created a new organization                              | `app/(dashboard)/dashboard/orgs/new/page.tsx`                                |
| `organization_invite_sent`     | User sent an organization invite to a team member            | `app/(dashboard)/dashboard/orgs/[slug]/settings/_components/invite-form.tsx` |
| `organization_invite_accepted` | User accepted an organization invitation                     | `app/invite/[token]/page.tsx`                                                |
| `organization_invite_declined` | User declined an organization invitation                     | `app/invite/[token]/page.tsx`                                                |
| `registry_component_fetched`   | Registry component was fetched via API (server-side)         | `app/r/[namespace]/[name]/route.ts`                                          |

## User Identification

Users are identified in PostHog when they claim their username during onboarding. The username is used as the distinct ID, ensuring all subsequent events are associated with the correct user profile.

## Error Tracking

Exception capture (`posthog.captureException`) is enabled for:

- All mutation error handlers (sign-in, component CRUD, organization operations)
- Server-side registry fetch errors

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard

- [Analytics basics](https://us.posthog.com/project/299833/dashboard/1144836) - Core analytics dashboard

### Insights

- [User Sign-in Attempts](https://us.posthog.com/project/299833/insights/r0MvjGyB) - Track sign-in attempts by provider
- [User Onboarding Funnel](https://us.posthog.com/project/299833/insights/sbiUbekL) - Conversion funnel from sign-in to username claim
- [Components Created](https://us.posthog.com/project/299833/insights/XqSHHMk4) - Track component creation over time
- [Organization Growth](https://us.posthog.com/project/299833/insights/D0pOsoWz) - Track organization creation and invites
- [Registry Downloads](https://us.posthog.com/project/299833/insights/ngLCzAFk) - Track component downloads by namespace

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/nextjs-app-router/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
