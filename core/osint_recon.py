"""OSINT reconnaissance — Georgia Weidman Ch.5 methodology.

Passive/active information gathering: WHOIS, DNS (MX/NS/TXT/AXFR),
email discovery, and technology fingerprinting from public sources.
"""

from __future__ import annotations

import asyncio
import re
from typing import Any

import dns.resolver
import dns.zone
import dns.query
import httpx

from core.config import HTTP_TIMEOUT, USER_AGENT

_EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_COMMON_EMAIL_PREFIXES = (
    "admin", "info", "contact", "support", "sales", "help", "security",
    "abuse", "webmaster", "postmaster", "noreply", "hr", "jobs",
)


class OSINTRecon:
    """Weidman-style information gathering phase."""

    def __init__(self):
        self.findings: list[dict] = []
        self.intel: dict[str, Any] = {
            "whois": {},
            "dns": {},
            "emails": [],
            "name_servers": [],
            "mail_servers": [],
            "zone_transfer": [],
            "subdomains_from_dns": [],
        }
        self.stats = {"checks": 0, "hits": 0}

    def _add(self, **kw) -> None:
        self.stats["hits"] += 1
        self.findings.append({
            "id": kw.get("id", f"osint-{abs(hash(kw.get('target', ''))) % 10**9}"),
            "target": kw["target"],
            "title": kw["title"],
            "severity": kw.get("severity", "info"),
            "category": kw.get("category", "OSINT"),
            "description": kw.get("description", ""),
            "evidence": (kw.get("evidence") or "")[:400],
            "remediation": kw.get("remediation", "Review exposed information."),
            "exploitable": kw.get("exploitable", False),
            "detection_source": "osint_recon",
            "technique": kw.get("technique", "osint"),
            "confidence": kw.get("confidence", 70),
        })

    async def run(self, domain: str, pages: list[dict] | None = None) -> dict:
        self.findings = []
        self.stats = {"checks": 0, "hits": 0}
        domain = domain.lower().strip().lstrip("www.")

        await asyncio.gather(
            self._whois_lookup(domain),
            self._dns_recon(domain),
            self._zone_transfer(domain),
            self._email_harvest(domain, pages or []),
            self._security_txt(domain),
            return_exceptions=True,
        )
        return {
            "findings": self.findings,
            "intel": self.intel,
            "stats": self.stats,
        }

    async def _whois_lookup(self, domain: str) -> None:
        self.stats["checks"] += 1
        try:
            proc = await asyncio.create_subprocess_exec(
                "whois", domain,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.DEVNULL,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=10)
            text = (stdout or b"").decode("utf-8", errors="replace")
            if not text or "No match" in text:
                return
            self.intel["whois"] = {"raw": text[:2000]}
            for line in text.splitlines():
                low = line.lower()
                if "name server" in low or "nserver" in low:
                    ns = line.split(":")[-1].strip().lower()
                    if ns and "." in ns:
                        self.intel["name_servers"].append(ns)
                if "registrant" in low and "private" not in low:
                    self._add(
                        id=f"whois-reg-{hash(domain) % 10**8}",
                        target=domain,
                        title="WHOIS Registrant Information Exposed",
                        severity="info", category="Information Disclosure",
                        technique="whois",
                        evidence=line[:200],
                        description="WHOIS reveals registrant details (Ch.5 recon).",
                    )
                    break
            if self.intel["name_servers"]:
                self._add(
                    id=f"whois-ns-{hash(domain) % 10**8}",
                    target=domain,
                    title=f"DNS Name Servers Discovered ({len(self.intel['name_servers'])})",
                    severity="info", category="OSINT",
                    technique="whois_ns",
                    evidence=", ".join(self.intel["name_servers"][:5]),
                )
        except (FileNotFoundError, asyncio.TimeoutError, Exception):
            pass

    async def _dns_recon(self, domain: str) -> None:
        resolver = dns.resolver.Resolver()
        resolver.timeout = 3
        resolver.lifetime = 5

        for rtype in ("A", "AAAA", "MX", "NS", "TXT", "SOA", "CNAME"):
            self.stats["checks"] += 1
            try:
                answers = resolver.resolve(domain, rtype)
                records = [str(r).strip() for r in answers]
                self.intel["dns"][rtype] = records

                if rtype == "MX":
                    for mx in records:
                        self.intel["mail_servers"].append(mx.split()[-1] if " " in mx else mx)
                    if records:
                        self._add(
                            id=f"dns-mx-{hash(domain) % 10**8}",
                            target=domain,
                            title="Mail Servers Discovered (MX Records)",
                            severity="info", category="OSINT",
                            technique="dns_mx",
                            evidence="; ".join(records[:4]),
                            description="MX records reveal email infrastructure (Ch.5).",
                        )
                elif rtype == "NS":
                    self.intel["name_servers"].extend(records)
                elif rtype == "TXT":
                    spf = [r for r in records if "spf" in r.lower() or "v=spf" in r.lower()]
                    dmarc_hint = any("dmarc" in r.lower() for r in records)
                    if spf:
                        self._add(
                            id=f"dns-spf-{hash(domain) % 10**8}",
                            target=domain,
                            title="SPF Record Found",
                            severity="info", category="Email Security",
                            technique="dns_txt",
                            evidence=spf[0][:200],
                        )
                    if not dmarc_hint:
                        self._add(
                            id=f"dns-dmarc-{hash(domain) % 10**8}",
                            target=domain,
                            title="No DMARC TXT Record on Apex",
                            severity="low", category="Email Security",
                            technique="dns_dmarc",
                            evidence="No DMARC policy in apex TXT records.",
                            remediation="Add DMARC TXT record at _dmarc subdomain.",
                        )
            except Exception:
                pass

        # DMARC at _dmarc subdomain
        self.stats["checks"] += 1
        try:
            dmarc = resolver.resolve(f"_dmarc.{domain}", "TXT")
            records = [str(r).strip() for r in dmarc]
            self.intel["dns"]["DMARC"] = records
        except Exception:
            pass

    async def _zone_transfer(self, domain: str) -> None:
        """Attempt AXFR zone transfer (Weidman Ch.5 — zoneedit.com technique)."""
        ns_list = list(dict.fromkeys(self.intel.get("name_servers", [])))
        if not ns_list:
            try:
                answers = dns.resolver.resolve(domain, "NS")
                ns_list = [str(r).rstrip(".") for r in answers]
            except Exception:
                return

        for ns in ns_list[:3]:
            self.stats["checks"] += 1
            try:
                zone = await asyncio.to_thread(
                    dns.zone.from_xfr, dns.query.xfr(ns, domain, timeout=5)
                )
                hosts: list[str] = []
                for name in zone.nodes.keys():
                    fqdn = f"{name}.{domain}" if str(name) != "@" else domain
                    hosts.append(fqdn.lower())
                if len(hosts) > 2:
                    self.intel["zone_transfer"] = hosts
                    self.intel["subdomains_from_dns"] = hosts
                    self._add(
                        id=f"axfr-{hash(domain + ns) % 10**8}",
                        target=domain,
                        title="DNS Zone Transfer Allowed (AXFR)",
                        severity="high", category="DNS Misconfiguration",
                        technique="zone_transfer",
                        evidence=f"NS {ns} leaked {len(hosts)} records: {', '.join(hosts[:8])}…",
                        description="Insecure zone transfer exposes full DNS map (Ch.5).",
                        exploitable=True, confidence=95,
                    )
                    return
            except Exception:
                pass

    async def _email_harvest(self, domain: str, pages: list[dict]) -> None:
        """Harvest emails from crawled pages + common prefixes (theHarvester-style)."""
        found: set[str] = set()
        for page in pages[:30]:
            try:
                from pathlib import Path
                content = Path(page.get("source_path", "")).read_text(
                    encoding="utf-8", errors="replace"
                )[:15000]
                for email in _EMAIL_RE.findall(content):
                    if domain in email.lower():
                        found.add(email.lower())
            except Exception:
                pass

        for prefix in _COMMON_EMAIL_PREFIXES:
            found.add(f"{prefix}@{domain}")

        self.intel["emails"] = sorted(found)[:50]
        if found:
            self._add(
                id=f"emails-{hash(domain) % 10**8}",
                target=domain,
                title=f"Email Addresses Discovered ({len(found)})",
                severity="info", category="OSINT",
                technique="email_harvest",
                evidence=", ".join(sorted(found)[:6]),
                description="Harvested emails for credential attacks (Ch.5 theHarvester).",
            )

    async def _security_txt(self, domain: str) -> None:
        self.stats["checks"] += 1
        url = f"https://{domain}/.well-known/security.txt"
        try:
            async with httpx.AsyncClient(timeout=HTTP_TIMEOUT, follow_redirects=True) as client:
                r = await client.get(url, headers={"User-Agent": USER_AGENT})
                if r.status_code == 200 and "contact" in r.text.lower():
                    self._add(
                        id=f"sectxt-{hash(domain) % 10**8}",
                        target=url,
                        title="security.txt Present",
                        severity="info", category="OSINT",
                        technique="security_txt",
                        evidence=r.text[:200],
                    )
        except Exception:
            pass
