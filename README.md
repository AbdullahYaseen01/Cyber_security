# QuantumShield — Enterprise Cybersecurity SaaS Platform

> **Deploy the NEW app (dark theme on localhost:3000):** set Vercel **Root Directory** to `web`.  
> The old light-theme UI in `legacy-static/` is not the product — use the Next.js app in `web/`.

World-class subscription-only cybersecurity platform built around a flagship **Deep Web Vulnerability Scanner** with 9 integrated security modules.

## Deploy on Vercel

> **Important:** Set **Root Directory** to `web` in Vercel project settings.  
> Without this, Vercel may deploy the old Python API from the repo root instead of the Next.js app.

See **[DEPLOY.md](./DEPLOY.md)** for full steps and environment variables.

## Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | Next.js 15, TypeScript, Tailwind, shadcn/ui, Framer Motion |
| **Scanner API** | Python FastAPI (optional local), SSE threat stream |
| **Platform DB** | PostgreSQL (Prisma) |
| **Billing** | Stripe (Starter from $5/mo) |

## Quick Start (Local Dev)

### 1. Start infrastructure

```bash
docker compose up -d postgres redis
```

### 2. Scanner backend (Python)

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8080
```

### 3. Web frontend (Next.js)

```bash
cd web
cp .env.example .env
npm install
npx prisma db push
npm run dev
```

Open **http://localhost:3000**

### Full stack with Docker

```bash
docker compose up --build
```

## Modules

1. **Dashboard** — Security score, threat trends, module scores
2. **Deep Scanner** (Flagship) — 13-phase pipeline, holographic progress, live SSE feed
3. **API Security** — Endpoint discovery, BOLA/JWT/injection tests
4. **Agent Security** — FIM, process monitoring, secrets scanning
5. **Cloud Guard (CSPM)** — AWS/Azure/GCP misconfiguration detection
6. **Phishing Shield** — Campaign builder, awareness scorecards
7. **Dark Web Intel** — Breach monitoring, credential leaks
8. **Compliance Hub** — ISO 27001, SOC 2, GDPR, PCI-DSS
9. **Reports Center** — 11 standard reports, PDF/HTML export

## Subscription Tiers

| Tier | Price | Domains | Scans/mo |
|------|-------|---------|----------|
| Starter | $5/mo | 1 | 10 |
| Professional | $39/mo | 5 | 100 |
| Business | $129/mo | 25 | 500 |
| Enterprise | $399/mo | Unlimited | Unlimited |

**No free tier.** 7-day trial on all plans (credit card required).

## Domain Verification

Before scanning, verify domain ownership via DNS TXT:

```
_quantumshield-verify.example.com  TXT  "quantumshield-verify=<token>"
```

## API Endpoints

### Scanner (port 8080)
- `POST /api/scan?domain=example.com&scan_type=mega`
- `GET  /api/scan/{id}/stream` — SSE threat feed
- `GET  /api/platform/dashboard`

### Platform (Next.js /api)
- `POST /api/auth/signup` — Create account + org
- `POST /api/auth/login`
- `GET  /api/domains` — List verified domains
- `POST /api/scans` — Start gated scan

## Environment Variables

See `web/.env.example` and `.env.example` for all required keys.

## Disclaimer

Use only for authorized security testing on domains you own or have permission to test.
