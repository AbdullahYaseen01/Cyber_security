"""Passive + limited active subdomain enumeration."""

from __future__ import annotations

import asyncio
import json
import re

import httpx
import dns.resolver

from core.config import SCOPE_DOMAINS, SUBDOMAIN_MAX, HTTP_TIMEOUT, USER_AGENT

COMMON_PREFIXES = [
    "www", "api", "dev", "staging", "test", "mail", "admin", "portal",
    "data", "science", "images", "www-origin", "mobile", "app", "cdn",
    "observer", "dataentry", "vis", "visdev", "open", "earthdata",
]


async def fetch_crtsh(domain: str) -> set[str]:
    hosts: set[str] = set()
    url = f"https://crt.sh/?q=%25.{domain}&output=json"
    try:
        async with httpx.AsyncClient(timeout=HTTP_TIMEOUT) as client:
            r = await client.get(url, headers={"User-Agent": USER_AGENT})
            if r.status_code == 200:
                data = json.loads(r.text)
                for entry in data[:200]:
                    name = entry.get("name_value", "")
                    for part in name.split("\n"):
                        part = part.strip().lower().lstrip("*.")
                        if part.endswith(domain) and "*" not in part:
                            hosts.add(part)
    except Exception:
        pass
    return hosts


def resolve_host(host: str) -> bool:
    try:
        resolver = dns.resolver.Resolver()
        resolver.timeout = 2
        resolver.lifetime = 2
        resolver.resolve(host, "A")
        return True
    except Exception:
        return False


async def enumerate_subdomains(domain: str) -> list[dict]:
    """Discover live subdomains for a scope domain."""
    found: set[str] = set()

    # Passive: certificate transparency
    crt_hosts = await fetch_crtsh(domain)
    found.update(crt_hosts)

    # Limited active: common prefixes only
    for prefix in COMMON_PREFIXES:
        found.add(f"{prefix}.{domain}")

    # Always include apex
    found.add(domain)
    found.add(f"www.{domain}")

    # Filter to scope
    scoped = [h for h in found if h.endswith(domain) or h == domain]
    scoped = sorted(set(scoped))[:SUBDOMAIN_MAX * 2]

    live = await asyncio.to_thread(_check_live_batch, scoped[:SUBDOMAIN_MAX])
    return live


def _check_live_batch(hosts: list[str]) -> list[dict]:
    results = []
    for host in hosts:
        if resolve_host(host):
            scheme = "https"
            results.append({
                "host": host,
                "url": f"{scheme}://{host}",
                "source": "dns_live",
            })
    return results
