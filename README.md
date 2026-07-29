# QuantumShield — Enterprise Cybersecurity SaaS Platform

World-class subscription-only cybersecurity platform built around a flagship **Deep Web Vulnerability Scanner** with 9 integrated security modules.

## Architecture

| Layer | Stack |
|-------|-------|
| **Frontend** | Next.js 14, TypeScript, Tailwind, shadcn/ui, Framer Motion, Recharts |
| **Scanner API** | Python FastAPI, 13-phase pipeline, SSE threat stream |
| **Platform DB** | PostgreSQL (Prisma), Redis |
| **Billing** | Stripe (no free tier, $1 Starter minimum) |

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
| Starter | $1/mo | 1 | 10 |
| Professional | $29/mo | 5 | 100 |
| Business | $99/mo | 25 | 500 |
| Enterprise | $299/mo | Unlimited | Unlimited |

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
