# Deploy QuantumShield (Vercel)

The **Next.js SaaS app lives in the `web/` folder**.

## Vercel — required settings

1. Import: https://github.com/AbdullahYaseen01/Cyber_security
2. **Settings → General → Root Directory → `web`** ← **MUST be set**
   - If you skip this, Vercel may try to run the Python `api/` folder and crash with `FUNCTION_INVOCATION_FAILED`
3. Leave Install/Build commands **empty** when Root Directory is `web` (uses `web/vercel.json`)
4. **Settings → Environment Variables** (Production):
   - `DATABASE_URL` — PostgreSQL connection string
   - `AUTH_SECRET` — min 32 characters (e.g. `openssl rand -base64 32`)
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL (e.g. `https://your-app.vercel.app`)
   - `AUTH_URL` — same as `NEXT_PUBLIC_APP_URL`
5. **Deployments → Redeploy** → enable **Clear build cache**

## Build settings (auto from `web/vercel.json`)

| Setting | Value |
|---------|--------|
| Root Directory | **`web`** |
| Framework | Next.js |
| Install | `npm install` |
| Build | `prisma generate && next build` |

## Troubleshooting failed builds

| Problem | Fix |
|---------|-----|
| `FUNCTION_INVOCATION_FAILED` on every page | **Root Directory must be `web`** — do not deploy repo root (Python `api/` crashes) |
| Old light-theme UI deploys | Root Directory must be `web`, not repo root |
| Build fails after `prisma generate` | Clear build cache and redeploy |
| `AUTH_SECRET` missing | Add env var in Vercel settings |
| Wrong app version | Do **not** use repo-root `legacy-static/` — only `web/` |

## Troubleshooting 500 / FUNCTION_INVOCATION_FAILED

| Problem | Fix |
|---------|-----|
| Serverless function crashes on load | Set **all** required env vars (see below) |
| `DATABASE_URL` points to localhost | Use a **hosted** PostgreSQL (Neon, Supabase, Vercel Postgres) — Vercel cannot reach your local machine |
| Missing `AUTH_SECRET` | Generate with `openssl rand -base64 32` and add in Vercel |
| Login/demo fails | Database must be reachable; run `npx prisma db push` against the hosted DB once |
| OAuth buttons missing | Optional — set `GOOGLE_*` / `GITHUB_*` only if you want social login |

**Required env vars for production:**

```
DATABASE_URL=postgresql://...        # hosted Postgres (not localhost)
AUTH_SECRET=...                    # min 32 chars
AUTH_URL=https://your-app.vercel.app
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

## Demo login (after deploy)

- URL: `/login`
- Email: `demo@quantumshield.io`
- Password: `Demo1234!`

## Local dev

```bash
cd web
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Open http://localhost:3000
