# Deploy QuantumShield (Vercel)

The **Next.js SaaS app lives in the `web/` folder**. The Python scanner at the repo root is optional for local dev only.

If Vercel deploys an old static/Python UI, the project **Root Directory** was not set to `web`.

## Vercel — correct setup

1. Import: https://github.com/ayaseen-lab/quantum_shield
2. **Settings → General → Root Directory → `web`** (required)
3. **Settings → Environment Variables** (Production):
   - `DATABASE_URL` — PostgreSQL connection string
   - `AUTH_SECRET` — min 32 characters
   - `NEXT_PUBLIC_APP_URL` — your Vercel URL (e.g. `https://your-app.vercel.app`)
   - Stripe keys (optional for billing): `STRIPE_SECRET_KEY`, `STRIPE_*_MONTHLY`, etc.
4. **Deployments → Redeploy** (enable “Clear build cache” if you previously deployed the wrong version)

## Build settings (when Root Directory = `web`)

| Setting | Value |
|---------|--------|
| Framework | Next.js |
| Install | `npm install` |
| Build | `prisma generate && next build` |
| Output | `.next` (default) |

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
