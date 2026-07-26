"""Domain resolution — universal SaaS + optional VDP presets."""

from __future__ import annotations

import re

from core.config import PRIMARY_URLS, SCOPE_DOMAINS, UNIVERSAL_MODE


def normalize_domain(domain: str) -> str:
    d = (domain or "").strip().lower()
    d = re.sub(r"^https?://", "", d)
    d = d.split("/")[0].split("?")[0].split(":")[0].rstrip(".")
    if not d or "." not in d:
        raise ValueError(f"Invalid domain: '{domain}'")
    if not re.match(r"^[a-z0-9]([a-z0-9\-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9\-]*[a-z0-9])?)+$", d):
        raise ValueError(f"Invalid domain format: '{d}'")
    return d


def scope_root(domain: str) -> str:
    """Return matching preset root, or the domain itself in universal mode."""
    d = normalize_domain(domain)
    for scope in SCOPE_DOMAINS:
        if d == scope or d.endswith("." + scope):
            return scope
    if UNIVERSAL_MODE:
        # Use registrable-ish host (last 2 labels) for crawl scope
        parts = d.split(".")
        if len(parts) >= 2:
            return ".".join(parts[-2:]) if parts[-2] not in ("co", "com", "org", "net", "gov", "ac") else d
        return d
    raise ValueError(f"Domain '{d}' is not in scope. Allowed: {', '.join(SCOPE_DOMAINS)}")


def is_in_scope(domain: str) -> bool:
    try:
        scope_root(domain)
        return True
    except ValueError:
        return False


def urls_for_domain(domain: str) -> list[str]:
    d = normalize_domain(domain)
    root = scope_root(d)
    urls = [f"https://{d}"]
    if not d.startswith("www."):
        urls.append(f"https://www.{d}")
    urls.extend(PRIMARY_URLS.get(root, []))
    filtered = []
    for u in urls:
        host = normalize_domain(u.replace("https://", "").replace("http://", ""))
        try:
            # Prefer exact host when user typed a specific subdomain
            if d != root:
                if host == d or host == f"www.{d}":
                    filtered.append(f"https://{host}" if not u.startswith("http") else u.replace("http://", "https://"))
            else:
                if scope_root(host) == root or host == d:
                    filtered.append(u if u.startswith("http") else f"https://{u}")
        except ValueError:
            continue
    if not filtered:
        filtered = [f"https://{d}"]
    return list(dict.fromkeys(filtered))
