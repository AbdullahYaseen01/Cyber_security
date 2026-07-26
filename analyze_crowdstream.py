"""Analyze all 843 NASA VDP crowdstream submissions."""

import json
from collections import Counter, defaultdict

with open("crowdstream_all.json") as f:
    data = json.load(f)

print("=" * 70)
print("NASA VDP CROWDSTREAM INTELLIGENCE — 43 pages / 843 submissions")
print("=" * 70)

print(f"\nTotal submissions: {len(data)}")
print(f"Disclosed: {sum(1 for x in data if x.get('disclosed'))}")
print(f"Public: {sum(1 for x in data if x.get('visibility_public'))}")
print(f"Unresolved: {sum(1 for x in data if x.get('substate') == 'unresolved')}")

print("\n--- By substate ---")
for k, v in Counter(x.get("substate") for x in data).most_common():
    print(f"  {k}: {v}")

print("\n--- By priority ---")
for k, v in sorted(Counter(x.get("priority") or 0 for x in data).items()):
    print(f"  P{k}: {v}")

print("\n--- Top vulnerability themes ---")
themes = Counter()
for x in data:
    t = (x.get("title") or "").lower()
    for kw in ["xss", "open redirect", "idor", "sqli", "ssrf", "rce", "cors",
               "host header", "broken link", "hijack", "subdomain takeover",
               "information disclosure", "exposed", "authentication bypass"]:
        if kw in t:
            themes[kw] += 1
for k, v in themes.most_common(15):
    print(f"  {k}: {v}")

print("\n--- By target domain ---")
targets = Counter()
for x in data:
    t = x.get("target") or "unknown"
    if "globe" in t.lower():
        targets["globe.gov"] += 1
    elif "nasa" in t.lower():
        targets["nasa.gov"] += 1
    elif "usgeo" in t.lower():
        targets["usgeo.gov"] += 1
    else:
        targets[t[:40]] += 1
for k, v in targets.most_common(10):
    print(f"  {k}: {v}")

print("\n--- globe.gov report history (40 reports) ---")
globe = [x for x in data if x.get("title") and ("globe" in (x.get("target") or "").lower() or "globe" in x.get("title", "").lower())]
for x in sorted(globe, key=lambda i: (i.get("priority") or 9, i.get("title", "")))[:15]:
    print(f"  P{x.get('priority')} [{x.get('substate')}] {x.get('title', '')[:65]}")

print("\n--- LIVE VERIFICATION RESULT ---")
print("""
STRONGEST STILL-PRESENT FINDING:

  [MEDIUM-HIGH] CORS Misconfiguration on www.globe.gov API (Liferay JSONWS)

  URL: https://www.globe.gov/api/jsonws/

  Evidence (live, verified 2026-07-23):
    Access-Control-Allow-Origin: *, https://evil-attacker.example.com
    Access-Control-Allow-Credentials: true
    Access-Control-Allow-Methods: *
    Access-Control-Allow-Headers: *

  Why this matters:
    - globe.gov had 11 IDOR reports, 6 stored XSS, multiple PII disclosure reports
    - APIs like /o/headless-admin-user/v1.0/my-user-account hold session user data

  UPDATE (browser verification):
    The jsonws endpoint sends TWO separate ACAO headers (* and reflected origin).
    Chrome rejects this as invalid — NOT exploitable for cross-origin data theft.
    dataentry.globe.gov sends ACAO:* + ACAC:true — also browser-blocked.
    Do NOT report as exploitable CORS without demonstrating JS can read the response.

  PoC: cors_poc.html — serve with: python3 -m http.server 8080
""")
