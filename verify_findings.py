"""Verify historically reported NASA VDP bugs still present on live targets."""

import asyncio
import json
import re
from urllib.parse import urljoin, urlparse, quote

import httpx

EVIL = "https://evil-attacker.example.com"
EVIL_HOST = "evil-attacker.example.com"


async def check_cors_wildcard(client: httpx.AsyncClient, url: str) -> dict | None:
    try:
        r = await client.get(url, headers={"Origin": EVIL})
        acao = r.headers.get("access-control-allow-origin", "")
        if acao == "*":
            return {
                "check": "cors_wildcard",
                "url": url,
                "severity": "medium",
                "evidence": f"Access-Control-Allow-Origin: {acao}",
                "historical": "Multiple CORS reports on globe.gov",
            }
        if acao == EVIL:
            return {
                "check": "cors_reflection",
                "url": url,
                "severity": "high",
                "evidence": f"Origin reflected: {acao}",
                "historical": "CORS origin reflection",
            }
    except Exception as e:
        return {"check": "cors_wildcard", "url": url, "error": str(e)}
    return None


async def check_globe_backurl_redirect(client: httpx.AsyncClient) -> dict | None:
    """globe.gov news backUrl bypass via www.globe.gov.attacker.tld pattern."""
    tests = [
        "https://www.globe.gov/news/artikel/news/globe-news?backUrl=https://www.globe.gov.evil-attacker.example.com",
        "https://www.globe.gov/news?backUrl=https://www.globe.gov.evil-attacker.example.com/news",
    ]
    for url in tests:
        try:
            r = await client.get(url, follow_redirects=False)
            body = r.text.lower()
            if "globe.gov.evil" in body or "evil-attacker" in body:
                return {
                    "check": "globe_backurl_open_redirect",
                    "url": url,
                    "severity": "medium",
                    "evidence": "backUrl bypass string found in response body",
                    "historical": "Open Redirection on backUrl argument when using fake but similar subdomain",
                }
            # find return links in page
            links = re.findall(r'href=["\']([^"\']+)["\']', r.text, re.I)
            for link in links:
                if "evil-attacker" in link or "globe.gov.evil" in link:
                    return {
                        "check": "globe_backurl_open_redirect",
                        "url": url,
                        "severity": "medium",
                        "evidence": f"Malicious redirect link in page: {link}",
                        "historical": "Open Redirection on backUrl (resolved Jun 2026?)",
                    }
        except Exception as e:
            pass
    return None


async def check_host_header_base_tag(client: httpx.AsyncClient, url: str) -> dict | None:
    """Base tag hijacking via Host header - still unresolved per Bugcrowd."""
    domain = urlparse(url).netloc
    try:
        r = await client.get(
            url,
            headers={"Host": EVIL_HOST},
            follow_redirects=True,
        )
        m = re.search(r'<base[^>]+href=["\']([^"\']+)["\']', r.text, re.I)
        if m and EVIL_HOST in m.group(1):
            return {
                "check": "base_tag_host_injection",
                "url": url,
                "severity": "medium",
                "evidence": f"<base href={m.group(1)!r}> with injected host",
                "historical": "Base Tag Hijacking via Host Header Injection (UNRESOLVED)",
            }
    except Exception:
        pass

    # Also test X-Forwarded-Host
    try:
        r = await client.get(
            url,
            headers={"X-Forwarded-Host": EVIL_HOST, "Host": domain},
            follow_redirects=True,
        )
        m = re.search(r'<base[^>]+href=["\']([^"\']+)["\']', r.text, re.I)
        if m and EVIL_HOST in m.group(1):
            return {
                "check": "base_tag_xfh_injection",
                "url": url,
                "severity": "medium",
                "evidence": f"<base href={m.group(1)!r}> via X-Forwarded-Host",
                "historical": "Host Header Injection via X-FORWARDED-HOST",
            }
        loc = r.headers.get("location", "")
        if EVIL_HOST in loc:
            return {
                "check": "host_header_open_redirect",
                "url": url,
                "severity": "medium",
                "evidence": f"Redirect to: {loc}",
                "historical": "Host header open redirect",
            }
    except Exception:
        pass
    return None


async def check_open_redirect_params(client: httpx.AsyncClient, base_url: str, params: list[str]) -> dict | None:
    for param in params:
        test = f"{base_url}?{param}={quote(EVIL)}"
        try:
            r = await client.get(test, follow_redirects=False)
            loc = r.headers.get("location", "")
            if EVIL in loc or "evil-attacker" in loc:
                return {
                    "check": "open_redirect",
                    "url": test,
                    "severity": "medium",
                    "evidence": f"Location: {loc}",
                    "historical": f"Open redirect via {param}",
                }
        except Exception:
            pass
    return None


async def check_broken_external_links(client: httpx.AsyncClient, url: str) -> list[dict]:
    """Broken link hijacking - check external links for 404/expired domains."""
    findings = []
    try:
        r = await client.get(url)
        links = re.findall(r'href=["\'](https?://[^"\']+)["\']', r.text, re.I)
        social = [l for l in links if any(s in l.lower() for s in
                  ["youtube.com", "twitter.com", "x.com", "facebook.com", "instagram.com", "tiktok.com"])]
        checked = set()
        for link in social[:15]:
            if link in checked:
                continue
            checked.add(link)
            try:
                hr = await client.head(link, follow_redirects=True)
                if hr.status_code in (404, 410, 451):
                    findings.append({
                        "check": "broken_link_hijacking",
                        "url": url,
                        "severity": "medium",
                        "evidence": f"Broken external link ({hr.status_code}): {link}",
                        "historical": "Identity Theft via Broken Link Hijacking on NASA pages",
                    })
            except Exception:
                findings.append({
                    "check": "broken_link_hijacking",
                    "url": url,
                    "severity": "low",
                    "evidence": f"Unreachable external link: {link}",
                    "historical": "Broken Link Hijacking",
                })
    except Exception:
        pass
    return findings


async def check_vis_globe_xss(client: httpx.AsyncClient) -> dict | None:
    """Reflected XSS on vis.globe.gov from historical reports."""
    payloads = [
        "https://vis.globe.gov/",
        "https://visdev.globe.gov/",
    ]
    xss_probe = "<script>alert(1)</script>"
    param_urls = [
        f"https://vis.globe.gov/?q={quote(xss_probe)}",
        f"https://vis.globe.gov/search?query={quote(xss_probe)}",
    ]
    for url in param_urls:
        try:
            r = await client.get(url)
            if xss_probe in r.text or "alert(1)" in r.text:
                return {
                    "check": "reflected_xss",
                    "url": url,
                    "severity": "high",
                    "evidence": "XSS payload reflected unencoded",
                    "historical": "Cross Site Scripting on vis.globe.gov and visdev.globe.gov",
                }
        except Exception:
            pass
    return None


async def main():
    results: list[dict] = []

    async with httpx.AsyncClient(
        timeout=20.0,
        follow_redirects=True,
        headers={"User-Agent": "NASA-VDP-Research-Scanner/1.0 (Good-Faith Security Research)"},
        verify=True,
    ) as client:
        print("=== CORS checks ===")
        for url in ["https://www.globe.gov", "https://www.nasa.gov", "https://www.usgeo.gov", "https://nsc.nasa.gov"]:
            f = await check_cors_wildcard(client, url)
            if f and "error" not in f:
                print(f"  FOUND: {f}")
                results.append(f)
            await asyncio.sleep(0.5)

        print("\n=== globe.gov backUrl open redirect ===")
        f = await check_globe_backurl_redirect(client)
        if f:
            print(f"  FOUND: {f}")
            results.append(f)
        else:
            print("  Not reproduced")

        print("\n=== Host header / base tag injection ===")
        host_targets = [
            "https://www.nasa.gov",
            "https://www.globe.gov",
            "https://science.nasa.gov",
            "https://www.nasa.gov/news-release/",
        ]
        for url in host_targets:
            f = await check_host_header_base_tag(client, url)
            if f:
                print(f"  FOUND: {f}")
                results.append(f)
            await asyncio.sleep(0.5)

        print("\n=== Open redirect param probes ===")
        redirect_tests = [
            ("https://www.nasa.gov", ["url", "redirect", "next", "return", "returnUrl"]),
            ("https://www.globe.gov", ["backUrl", "redirect", "url", "next"]),
            ("https://openaltimetry.earthdatacloud.nasa.gov/data/auth/login", ["redirect"]),
        ]
        for base, params in redirect_tests:
            f = await check_open_redirect_params(client, base, params)
            if f:
                print(f"  FOUND: {f}")
                results.append(f)

        print("\n=== vis.globe.gov XSS ===")
        f = await check_vis_globe_xss(client)
        if f:
            print(f"  FOUND: {f}")
            results.append(f)
        else:
            print("  Not reproduced")

        print("\n=== Broken link hijacking on NASA news pages ===")
        news_urls = [
            "https://www.nasa.gov/news-release/nasa-astronaut-candidates-2025/",
            "https://www.nasa.gov/citizen-science/",
            "https://www.nasa.gov/humans-in-space/astronauts/",
        ]
        for url in news_urls:
            findings = await check_broken_external_links(client, url)
            for f in findings:
                print(f"  FOUND: {f['evidence'][:100]}")
                results.append(f)
            await asyncio.sleep(0.5)

    # Load crowdstream themes for context
    with open("crowdstream_all.json") as f:
        all_reports = json.load(f)

    globe_issues = [x for x in all_reports if x.get("title") and "globe" in (x.get("title","")+x.get("target","")).lower()]
    print(f"\n=== Analysis: {len(all_reports)} total reports, {len(globe_issues)} globe.gov related ===")

    with open("verification_results.json", "w") as f:
        json.dump(results, f, indent=2)

    print(f"\n=== CONFIRMED STILL PRESENT: {len(results)} ===")
    for r in results:
        print(f"  [{r.get('severity','?').upper()}] {r['check']}: {r.get('evidence','')[:120]}")

    if results:
        best = sorted(results, key=lambda x: {"critical":0,"high":1,"medium":2,"low":3}.get(x.get("severity","low"),9))[0]
        print(f"\n>>> STRONGEST FINDING: {best['check']}")
        print(f"    {best.get('evidence')}")
        print(f"    Historical: {best.get('historical')}")


if __name__ == "__main__":
    asyncio.run(main())
