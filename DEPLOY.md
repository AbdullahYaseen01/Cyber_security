# Deploy QuantumShield (Vercel)

The **Next.js SaaS app lives in the `web/` folder**.

## Vercel — required settings

1. Import: https://github.com/AbdullahYaseen01/Cyber_security
2. **Settings → General → Root Directory → `web`** ← **MUST be set**
3. Leave Install/Build commands **empty** (uses `web/vercel.json` automatically)
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
| Old light-theme UI deploys | Root Directory must be `web`, not repo root |
| Build fails after `prisma generate` | Clear build cache and redeploy |
| `AUTH_SECRET` missing | Add env var in Vercel settings |
| Wrong app version | Do **not** use repo-root `legacy-static/` — only `web/` |

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
