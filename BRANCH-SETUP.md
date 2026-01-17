# Branch Setup: ralph/multi-user-namespaces

All 32 user stories implemented. Setup required:

## 1. OAuth Apps

**GitHub:**
- Go to GitHub Settings → Developer Settings → OAuth Apps → New
- Homepage URL: `http://localhost:3000`
- Callback URL: `http://localhost:3000/api/auth/callback/github`

**Google:**
- Go to Google Cloud Console → APIs & Services → Credentials → Create OAuth Client
- Authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

## 2. Environment Variables

**.env.local** (Next.js):
```
NEXT_PUBLIC_CONVEX_URL=<your-convex-url>
NEXT_PUBLIC_CONVEX_SITE_URL=<your-convex-site-url>
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

**Convex Dashboard** (or `npx convex env set`):
```
SITE_URL=http://localhost:3000
GITHUB_CLIENT_ID=<from-github-oauth>
GITHUB_CLIENT_SECRET=<from-github-oauth>
GOOGLE_CLIENT_ID=<from-google-oauth>
GOOGLE_CLIENT_SECRET=<from-google-oauth>
```

## 3. Deploy

```bash
pnpm install
npx convex dev   # Deploy schema + functions
pnpm dev         # Start Next.js
```

## 4. Test

- Visit `http://localhost:3000/login`
- Sign in with GitHub or Google
- Complete onboarding (set username)
- Dashboard should load at `/dashboard`
