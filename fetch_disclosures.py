"""Fetch and parse NASA VDP Bugcrowd disclosure reports."""

import json
import re
import html
import time
import httpx
from bs4 import BeautifulSoup

with open("disclosed_public.json") as f:
    disclosures = json.load(f)

client = httpx.Client(headers={"User-Agent": "Mozilla/5.0"}, timeout=30, follow_redirects=True)

SCOPE_DOMAINS = ("nasa.gov", "globe.gov", "usgeo.gov", "nasaprs.com", "nsc.nasa.gov")


def fetch_disclosure(url_path: str) -> dict | None:
    url = "https://bugcrowd.com" + url_path
    r = client.get(url)
    if r.status_code != 200:
        return None

    text = r.text
    out: dict = {"url": url, "title": "", "description": "", "urls_mentioned": []}

    m = re.search(r'<meta property="og:title" content="([^"]+)"', text)
    if m:
        out["title"] = html.unescape(m.group(1))

    soup = BeautifulSoup(text, "html.parser")

    for tag in soup.find_all(attrs={"data-react-props": True}):
        props = html.unescape(tag.get("data-react-props", ""))
        if any(k in props.lower() for k in ("disclosure", "vulnerability", "description", "impact")):
            try:
                out["react_props"] = json.loads(props)
            except json.JSONDecodeError:
                out["raw_props_snippet"] = props[:8000]

    for sel in (".disclosure-report", ".rp-disclosure", "article", ".bc-panel__main"):
        el = soup.select_one(sel)
        if el:
            out["description"] = el.get_text(" ", strip=True)[:8000]
            break

    if not out["description"]:
        for s in soup(["script", "style", "nav", "header", "footer"]):
            s.decompose()
        body = soup.get_text("\n", strip=True)
        keywords = (
            "http", "vulnerability", "impact", "step", "payload", "proof", "poc",
            "target", "url", "injection", "redirect", "xss", "cors", "host",
        )
        lines = [ln for ln in body.split("\n") if any(k in ln.lower() for k in keywords)]
        out["description"] = "\n".join(lines[:80])

    urls = re.findall(r'https?://[^\s"\'<>\)]+', text)
    cleaned = []
    for u in urls:
        u = u.rstrip(".,;)")
        if any(d in u for d in SCOPE_DOMAINS):
            cleaned.append(u)
    out["urls_mentioned"] = sorted(set(cleaned))[:30]
    return out


priority = []
for d in disclosures:
    title = (d.get("title") or "").lower()
    score = 0
    if d.get("substate") == "unresolved":
        score += 100
    if d.get("target") and "globe.gov" in d.get("target", ""):
        score += 20
    for kw, pts in [
        ("cors", 25), ("open redirect", 25), ("redirect", 15), ("xss", 15),
        ("hijack", 20), ("idor", 20), ("broken link", 20), ("host header", 30),
        ("subdomain", 15), ("exposed", 10),
    ]:
        if kw in title:
            score += pts
    if (d.get("priority") or 5) <= 3:
        score += 10
    priority.append((score, d))

priority.sort(key=lambda x: -x[0])

results = []
for i, (score, d) in enumerate(priority[:60]):
    url_path = d.get("disclosure_report_url")
    if not url_path:
        continue
    print(f"[{i + 1}/60] score={score} {(d.get('title') or '')[:60]}")
    detail = fetch_disclosure(url_path)
    if detail:
        detail.update({
            "crowdstream_title": d.get("title"),
            "target": d.get("target"),
            "substate": d.get("substate"),
            "priority": d.get("priority"),
            "score": score,
        })
        results.append(detail)
    time.sleep(0.4)

with open("disclosure_details.json", "w") as f:
    json.dump(results, f, indent=2)

print(f"\nSaved {len(results)} disclosure details")
