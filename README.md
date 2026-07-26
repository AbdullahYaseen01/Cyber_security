# QuantumShield

QuantumShield is an all-in-one security platform for **good-faith vulnerability discovery**, with a real-time scanner dashboard, live threat feed, and multi-phase scan pipeline.

> Formerly developed as the NASA VDP Security Scanner; aligned with [NASA Vulnerability Disclosure Policy v1.6.2](https://www.nasa.gov/vulnerability-disclosure-policy/) for in-scope targets.

## In-Scope Targets

| Domain | URLs |
|--------|------|
| nasa.gov | https://www.nasa.gov |
| usgeo.gov | https://www.usgeo.gov |
| globe.gov | https://www.globe.gov |
| nspires.nasaprs.com | https://nspires.nasaprs.com |
| nsc.nasa.gov | https://nsc.nasa.gov |

## Checks Performed

- DNS reconnaissance (A, AAAA, MX, TXT, CNAME, dangling CNAME detection)
- TLS certificate validation and expiry
- HTTP → HTTPS redirect enforcement
- CORS misconfiguration (wildcard / origin reflection)
- Open redirect parameter testing
- Sensitive path exposure (`.git`, `.env`, backups — limited, rate-limited)
- Cookie security on session-related cookies
- Clickjacking on login pages
- security.txt discovery

## Policy Compliance

This tool **does not** perform:

- Denial of Service or rate-limit abuse
- `/wp-json/wp/v2/users` or `xmlrpc.php` checks (explicitly forbidden by NASA VDP)
- Aggressive directory brute-forcing
- Social engineering

All requests are rate-limited (~1 req/sec) with a research User-Agent.

## Quick Start

```bash
cd phone_cyber
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8080
```

Open **http://127.0.0.1:8080** in your browser and click **Start Vulnerability Scan**.

## Reporting Findings

Submit validated, exploitable findings to NASA via Bugcrowd:
https://bugcrowd.com/engagements/nasa-vdp

## Disclaimer

Use only for authorized security research under NASA's VDP. The authors are not responsible for misuse.
