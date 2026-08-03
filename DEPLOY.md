# Deploy QuantumShield (Vercel + Supabase)

The **Next.js SaaS app lives in the `web/` folder**.

**Production URL:** https://cyber-security-ruddy.vercel.app

---

## Step 1 — Create Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project**
2. Save your database password
3. Wait for the project to finish provisioning

---

## Step 2 — Get Supabase credentials

In **Supabase Dashboard → Project Settings**:

### Database (Settings → Database → Connection string)

| Variable | Which string to copy |
|----------|---------------------|
| `DATABASE_URL` | **Transaction pooler** (port **6543**, add `?pgbouncer=true`) |
| `DIRECT_URL` | **Session mode** or **Direct** (port **5432**) |

### API (Settings → API)

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_ROLE_KEY` | `service_role` key (keep secret) |

---

## Step 3 — Initialize database (run once)

On your machine, from the `web/` folder:

```bash
cd web
cp .env.example .env
# Paste your Supabase values into .env

npm install
npm run db:setup
```

This runs `prisma db push` + seeds the demo user.

---

## Step 4 — Vercel environment variables

**Vercel → Project → Settings → Environment Variables → Production:**

```
DATABASE_URL=postgresql://postgres.[ref]:[pass]@...pooler.supabase.com:6543/postgres?pgbouncer=true
DIRECT_URL=postgresql://postgres.[ref]:[pass]@...pooler.supabase.com:5432/postgres
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
AUTH_SECRET=<run: openssl rand -base64 32>
AUTH_URL=https://cyber-security-ruddy.vercel.app
NEXT_PUBLIC_APP_URL=https://cyber-security-ruddy.vercel.app
SETUP_SECRET=<any random string for one-time setup>
```

> **Note:** If you set `SUPABASE_SERVICE_ROLE_KEY` but forget `AUTH_SECRET`, auth will still work (auto-derived secret).

---

## Step 5 — Vercel project settings

1. **Root Directory → `web`** (required)
2. **Deployments → Redeploy** with **Clear build cache**

---

## Step 6 — Verify deployment

```bash
curl https://cyber-security-ruddy.vercel.app/api/health
```

Expected:
```json
{
  "authSecret": true,
  "database": true,
  "supabase": true,
  "databaseReachable": true,
  "ready": true
}
```

If `databaseReachable` is false, run `npm run db:setup` locally with your Supabase `DIRECT_URL`.

**Or** call the setup API once (after deploy):

```bash
curl -X POST https://cyber-security-ruddy.vercel.app/api/setup \
  -H "Authorization: Bearer YOUR_SETUP_SECRET"
```

---

## Demo login

- URL: https://cyber-security-ruddy.vercel.app/login
- Email: `demo@quantumshield.io`
- Password: `Demo1234!`

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| "Server configuration" error on login | Add `AUTH_SECRET` (32+ chars) or `SUPABASE_SERVICE_ROLE_KEY` to Vercel |
| Demo login fails | Run `npm run db:setup` with Supabase `DIRECT_URL` |
| `FUNCTION_INVOCATION_FAILED` | Root Directory must be `web` |
| Database connection timeout | Use pooler URL (port 6543) for `DATABASE_URL` |
| Build fails on `DIRECT_URL` | Add `DIRECT_URL` env var in Vercel |

## Local dev

```bash
cd web
cp .env.example .env
# For local Postgres, set DIRECT_URL same as DATABASE_URL
npm install
npm run db:setup
npm run dev
```

Open http://localhost:3000
