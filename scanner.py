"""NASA VDP-compliant passive security scanner."""

from __future__ import annotations

import asyncio
import re
import ssl
import socket
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from typing import Any
from urllib.parse import urljoin, urlparse, parse_qs, urlencode, urlunparse

import httpx
import dns.resolver

from core.content_validator import validate_sensitive_path

NASA_VDP_TARGETS = [
    {"domain": "nasa.gov", "urls": ["https://www.nasa.gov", "https://nasa.gov"]},
    {"domain": "usgeo.gov", "urls": ["https://www.usgeo.gov", "https://usgeo.gov"]},
    {"domain": "globe.gov", "urls": ["https://www.globe.gov", "https://globe.gov"]},
    {"domain": "nspires.nasaprs.com", "urls": ["https://nspires.nasaprs.com"]},
    {"domain": "nsc.nasa.gov", "urls": ["https://nsc.nasa.gov", "https://www.nsc.nasa.gov"]},
]

# Explicitly excluded per NASA VDP
FORBIDDEN_PATHS = {"/wp-json/wp/v2/users", "/xmlrpc.php"}

SEVERITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3, "info": 4}


def _sanitize(text: str, max_len: int = 500) -> str:
  """Strip control chars that break JSON serialization."""
  cleaned = "".join(" " if ord(c) < 32 else c for c in (text or ""))
  return " ".join(cleaned.split())[:max_len].strip()


@dataclass
class Finding:
  id: str
  target: str
  title: str
  severity: str
  category: str
  description: str
  evidence: str
  remediation: str
  vdp_compliant: bool = True
  exploitable: bool = False
  impact: str = ""
  reproduction_steps: str = ""
  confidence: int = 0
  estimated_priority: str = ""
  submission_ready: bool = False

  def __post_init__(self):
    self.title = _sanitize(self.title, 200)
    self.description = _sanitize(self.description, 500)
    self.evidence = _sanitize(self.evidence, 500)
    self.remediation = _sanitize(self.remediation, 500)
    self.impact = _sanitize(self.impact, 400)
    self.reproduction_steps = _sanitize(self.reproduction_steps, 500)


@dataclass
class ScanResult:
    scan_id: str
    started_at: str
    completed_at: str
    status: str
    targets: list[dict]
    findings: list[dict] = field(default_factory=list)
    summary: dict = field(default_factory=dict)
    policy_notice: str = ""


class NASAVDPScanner:
  """Lightweight, rate-limited scanner aligned with NASA VDP guidelines."""

  def __init__(self, request_delay: float = 1.0, timeout: float = 15.0):
    self.request_delay = request_delay
    self.timeout = timeout
    self._client: httpx.AsyncClient | None = None

  async def __aenter__(self):
    self._client = httpx.AsyncClient(
      timeout=self.timeout,
      follow_redirects=True,
      headers={
        "User-Agent": "NASA-VDP-Research-Scanner/1.0 (Good-Faith Security Research)",
        "Accept": "text/html,application/json,*/*",
      },
      verify=True,
    )
    return self

  async def __aexit__(self, *args):
    if self._client:
      await self._client.aclose()

  async def _get(self, url: str) -> httpx.Response | None:
    await asyncio.sleep(self.request_delay)
    try:
      return await self._client.get(url)
    except Exception:
      return None

  async def _head(self, url: str) -> httpx.Response | None:
    await asyncio.sleep(self.request_delay)
    try:
      return await self._client.head(url)
    except Exception:
      return None

  def _dns_records(self, domain: str) -> list[Finding]:
    findings: list[Finding] = []
    record_types = ["A", "AAAA", "MX", "TXT", "CNAME"]

    for rtype in record_types:
      try:
        answers = dns.resolver.resolve(domain, rtype)
        records = [str(r) for r in answers]
        if records:
          findings.append(
            Finding(
              id=f"dns-{domain}-{rtype.lower()}",
              target=domain,
              title=f"DNS {rtype} Records Discovered",
              severity="info",
              category="Reconnaissance",
              description=f"Public DNS {rtype} records for {domain}.",
              evidence=", ".join(records[:5]) + ("..." if len(records) > 5 else ""),
              remediation="Ensure DNS records do not expose internal infrastructure.",
            )
          )
      except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers):
        pass
      except Exception:
        pass

    # Check for dangling CNAME indicators (informational)
    try:
      cnames = [str(r.target).rstrip(".") for r in dns.resolver.resolve(domain, "CNAME")]
      for cname in cnames:
        try:
          dns.resolver.resolve(cname, "A")
        except Exception:
          findings.append(
            Finding(
              id=f"dns-dangling-{domain}",
              target=domain,
              title="Potential Dangling CNAME",
              severity="medium",
              category="DNS",
              description=f"CNAME {cname} may not resolve — possible subdomain takeover.",
              evidence=f"{domain} -> {cname} (no A record)",
              remediation="Remove unused CNAME records or claim the target hostname.",
              exploitable=True,
            )
          )
    except Exception:
      pass

    return findings

  def _tls_info(self, domain: str) -> list[Finding]:
    findings: list[Finding] = []
    try:
      ctx = ssl.create_default_context()
      with socket.create_connection((domain, 443), timeout=10) as sock:
        with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
          cert = ssock.getpeercert()
          not_after = cert.get("notAfter", "")
          issuer = dict(x[0] for x in cert.get("issuer", []))
          subject = dict(x[0] for x in cert.get("subject", []))
          san = [v for (_, v) in cert.get("subjectAltName", [])]

          findings.append(
            Finding(
              id=f"tls-{domain}",
              target=domain,
              title="TLS Certificate Information",
              severity="info",
              category="TLS",
              description=f"Valid TLS certificate for {domain}.",
              evidence=f"Issuer: {issuer.get('organizationName', 'Unknown')}; "
              f"Expires: {not_after}; SANs: {', '.join(san[:4])}",
              remediation="Monitor certificate expiry and use strong TLS configuration.",
            )
          )

          if not_after:
            expiry = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
            days_left = (expiry - datetime.now(timezone.utc)).days
            if days_left < 30:
              findings.append(
                Finding(
                  id=f"tls-expiry-{domain}",
                  target=domain,
                  title="TLS Certificate Expiring Soon",
                  severity="medium",
                  category="TLS",
                  description=f"Certificate expires in {days_left} days.",
                  evidence=f"Expiry: {not_after}",
                  remediation="Renew TLS certificate before expiration.",
                )
              )
    except ssl.SSLCertVerificationError as e:
      findings.append(
        Finding(
          id=f"tls-invalid-{domain}",
          target=domain,
          title="TLS Certificate Verification Failed",
          severity="high",
          category="TLS",
          description="SSL/TLS certificate could not be verified.",
          evidence=str(e)[:300],
          remediation="Install a valid certificate from a trusted CA.",
          exploitable=True,
        )
      )
    except Exception:
      pass

    return findings

  async def _connectivity(self, url: str) -> list[Finding]:
    findings: list[Finding] = []
    domain = urlparse(url).netloc

    resp = await self._get(url)
    if resp is None:
      findings.append(
        Finding(
          id=f"conn-fail-{domain}",
          target=url,
          title="Target Unreachable",
          severity="info",
          category="Connectivity",
          description=f"Could not connect to {url}.",
          evidence="Connection timeout or refused.",
          remediation="Verify target is online and accessible.",
        )
      )
      return findings

    findings.append(
      Finding(
        id=f"conn-ok-{domain}",
        target=url,
        title="Target Reachable",
        severity="info",
        category="Connectivity",
        description=f"Successfully connected to {url}.",
        evidence=f"HTTP {resp.status_code}; Final URL: {resp.url}",
        remediation="N/A",
      )
    )

    # Check HTTP -> HTTPS redirect
    if url.startswith("https://"):
      http_url = url.replace("https://", "http://", 1)
      http_resp = await self._get(http_url)
      if http_resp and str(http_resp.url).startswith("https://"):
        findings.append(
          Finding(
            id=f"https-redirect-{domain}",
            target=url,
            title="HTTP Redirects to HTTPS",
            severity="info",
            category="Transport Security",
            description="HTTP requests are redirected to HTTPS.",
            evidence=f"{http_url} -> {http_resp.url}",
            remediation="N/A — good practice.",
          )
        )
      elif http_resp:
        findings.append(
          Finding(
            id=f"no-https-redirect-{domain}",
            target=url,
            title="HTTP Does Not Redirect to HTTPS",
            severity="medium",
            category="Transport Security",
            description="Plain HTTP may be served without redirect to HTTPS.",
            evidence=f"{http_url} returned HTTP {http_resp.status_code} without HTTPS redirect.",
            remediation="Enforce HTTPS redirect on all HTTP endpoints.",
            exploitable=True,
          )
        )

    return findings

  async def _cors_check(self, url: str) -> list[Finding]:
    findings: list[Finding] = []
    domain = urlparse(url).netloc
    evil_origin = "https://evil-attacker.example.com"

    try:
      resp = await self._client.get(
        url,
        headers={"Origin": evil_origin},
      )
      acao = resp.headers.get("access-control-allow-origin", "")
      acac = resp.headers.get("access-control-allow-credentials", "")

      if acao == "*":
        findings.append(
          Finding(
            id=f"cors-wildcard-{domain}",
            target=url,
            title="Permissive CORS (Wildcard)",
            severity="info",
            category="CORS",
            description="Access-Control-Allow-Origin is wildcard. Public data readable cross-origin; not credentialed theft unless combined with valid single-origin ACAO.",
            evidence=f"Access-Control-Allow-Origin: {acao}",
            remediation="Restrict CORS to specific trusted origins.",
            exploitable=False,
          )
        )
      elif acao == evil_origin:
        findings.append(
          Finding(
            id=f"cors-reflect-{domain}",
            target=url,
            title="CORS Origin Reflection",
            severity="high",
            category="CORS",
            description="Server reflects arbitrary Origin header — potential data theft.",
            evidence=f"Origin: {evil_origin} reflected as ACAO: {acao}; Credentials: {acac}",
            remediation="Validate Origin against an allowlist; never reflect arbitrary origins.",
            exploitable=True,
          )
        )
    except Exception:
      pass

    return findings

  async def _open_redirect_check(self, url: str) -> list[Finding]:
    findings: list[Finding] = []
    domain = urlparse(url).netloc
    redirect_params = ["url", "redirect", "next", "return", "returnUrl", "dest", "destination", "redir", "redirect_uri"]

    for param in redirect_params:
      evil = "https://evil-attacker.example.com/phish"
      parsed = urlparse(url)
      test_url = urlunparse(parsed._replace(query=urlencode({param: evil})))

      try:
        resp = await self._client.get(test_url, follow_redirects=False)
        location = resp.headers.get("location", "")

        if resp.status_code in (301, 302, 303, 307, 308) and evil in location:
          findings.append(
            Finding(
              id=f"open-redirect-{domain}-{param}",
              target=url,
              title=f"Open Redirect via '{param}' Parameter",
              severity="medium",
              category="Open Redirect",
              description=f"Unvalidated redirect to external domain via ?{param}=.",
              evidence=f"Request: {test_url} -> Location: {location}",
              remediation="Validate redirect URLs against an allowlist of internal paths.",
              exploitable=True,
            )
          )
          break  # One finding per target is enough
      except Exception:
        pass

      await asyncio.sleep(self.request_delay)

    return findings

  async def _sensitive_exposure(self, base_url: str) -> list[Finding]:
    """Check limited paths — excludes NASA-forbidden endpoints."""
    findings: list[Finding] = []
    domain = urlparse(base_url).netloc

    paths = [
      ("/.git/HEAD", "Git Repository Exposure", "critical"),
      ("/.env", "Environment File Exposure", "critical"),
      ("/backup.sql", "Database Backup Exposure", "critical"),
      ("/server-status", "Apache Server Status", "medium"),
      ("/phpinfo.php", "PHP Info Disclosure", "medium"),
      ("/.well-known/security.txt", "security.txt", "info"),
      ("/robots.txt", "robots.txt", "info"),
      ("/sitemap.xml", "sitemap.xml", "info"),
    ]

    for path, title, severity in paths:
      if path in FORBIDDEN_PATHS:
        continue

      test_url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
      resp = await self._head(test_url)
      if resp is None:
        resp = await self._get(test_url)

      if resp and resp.status_code == 200:
        body_preview = resp.text[:200].replace("\n", " ") if resp.content else ""
        is_public_info = path in ("/.well-known/security.txt", "/robots.txt", "/sitemap.xml")
        is_exploitable = False
        evidence = f"Status: {resp.status_code}; Preview: {body_preview[:150]}"

        if not is_public_info:
          vr = validate_sensitive_path(path, resp.text, resp.headers.get("content-type", ""), resp.status_code)
          if not vr.valid:
            continue  # HTTP 200 SPA fallback — not a real finding
          is_exploitable = True
          evidence = vr.reason

        findings.append(
          Finding(
            id=f"exposure-{domain}-{path.replace('/', '-')}",
            target=test_url,
            title=title,
            severity=severity if is_exploitable else "info",
            category="Information Disclosure",
            description=f"Path {path} returned HTTP 200.",
            evidence=evidence,
            remediation="Remove or restrict access to sensitive files and directories.",
            exploitable=is_exploitable,
          )
        )

    return findings

  async def _cookie_security(self, url: str) -> list[Finding]:
    findings: list[Finding] = []
    domain = urlparse(url).netloc

    resp = await self._get(url)
    if not resp:
      return findings

    set_cookies = resp.headers.get_list("set-cookie")
    sensitive_names = {"session", "auth", "token", "jwt", "sid", "csrf", "login", "nasa"}

    for cookie_header in set_cookies:
      name = cookie_header.split("=")[0].lower()
      is_sensitive = any(s in name for s in sensitive_names)

      if not is_sensitive:
        continue

      issues = []
      lower = cookie_header.lower()
      if "secure" not in lower:
        issues.append("Missing Secure flag")
      if "httponly" not in lower:
        issues.append("Missing HttpOnly flag")
      if "samesite" not in lower:
        issues.append("Missing SameSite attribute")

      if issues:
        findings.append(
          Finding(
            id=f"cookie-{domain}-{name}",
            target=url,
            title=f"Insecure Cookie Settings: {name}",
            severity="medium",
            category="Session Security",
            description=f"Session-related cookie '{name}' has weak security attributes.",
            evidence=f"{cookie_header[:200]} — Issues: {', '.join(issues)}",
            remediation="Set Secure, HttpOnly, and SameSite=Strict/Lax on sensitive cookies.",
            exploitable=True,
          )
        )

    return findings

  async def _clickjacking_check(self, url: str) -> list[Finding]:
    """Only flag if sensitive actions likely — check for X-Frame-Options / CSP frame-ancestors."""
    findings: list[Finding] = []
    domain = urlparse(url).netloc

    resp = await self._get(url)
    if not resp:
      return findings

    xfo = resp.headers.get("x-frame-options", "")
    csp = resp.headers.get("content-security-policy", "")
    has_frame_protection = bool(xfo) or "frame-ancestors" in csp.lower()

    # Look for forms with password/login — sensitive action indicator
    has_sensitive_form = bool(
      re.search(r'type=["\']password["\']', resp.text, re.I)
      or re.search(r'login|sign.?in|authenticate', resp.text, re.I)
    )

    if has_sensitive_form and not has_frame_protection:
      findings.append(
        Finding(
          id=f"clickjack-{domain}",
          target=url,
          title="Clickjacking Risk on Login Page",
          severity="medium",
          category="Clickjacking",
          description="Page with login form lacks X-Frame-Options or CSP frame-ancestors.",
          evidence="No X-Frame-Options or frame-ancestors directive detected.",
          remediation="Add X-Frame-Options: DENY or CSP frame-ancestors 'self'.",
          exploitable=True,
        )
      )

    return findings

  async def _security_txt(self, url: str) -> list[Finding]:
    findings: list[Finding] = []
    domain = urlparse(url).netloc
    sec_url = urljoin(url.rstrip("/") + "/", ".well-known/security.txt")

    resp = await self._get(sec_url)
    if resp and resp.status_code == 200 and "contact" in resp.text.lower():
      findings.append(
        Finding(
          id=f"sectxt-{domain}",
          target=sec_url,
          title="security.txt Present",
          severity="info",
          category="Policy",
          description="Target publishes a security.txt file.",
          evidence=resp.text[:300],
          remediation="N/A — positive security practice.",
        )
      )
    return findings

  async def scan_target(self, domain: str, urls: list[str]) -> list[Finding]:
    all_findings: list[Finding] = []

    all_findings.extend(self._dns_records(domain))
    all_findings.extend(self._tls_info(domain))

    primary_url = urls[0]
    for check in (
      self._connectivity,
      self._cors_check,
      self._open_redirect_check,
      self._sensitive_exposure,
      self._cookie_security,
      self._clickjacking_check,
      self._security_txt,
    ):
      all_findings.extend(await check(primary_url))

    return all_findings

  async def run_full_scan(self, scan_id: str) -> ScanResult:
    started = datetime.now(timezone.utc).isoformat()
    all_findings: list[Finding] = []

    for target in NASA_VDP_TARGETS:
      findings = await self.scan_target(target["domain"], target["urls"])
      all_findings.extend(findings)

    # Deduplicate by id
    seen: set[str] = set()
    unique: list[Finding] = []
    for f in all_findings:
      if f.id not in seen:
        seen.add(f.id)
        unique.append(f)

    unique.sort(key=lambda f: SEVERITY_ORDER.get(f.severity, 99))

    exploitable = [f for f in unique if f.exploitable]
    by_severity: dict[str, int] = {}
    for f in unique:
      by_severity[f.severity] = by_severity.get(f.severity, 0) + 1

    return ScanResult(
      scan_id=scan_id,
      started_at=started,
      completed_at=datetime.now(timezone.utc).isoformat(),
      status="completed",
      targets=NASA_VDP_TARGETS,
      findings=[asdict(f) for f in unique],
      summary={
        "total_findings": len(unique),
        "exploitable_findings": len(exploitable),
        "by_severity": by_severity,
        "targets_scanned": len(NASA_VDP_TARGETS),
      },
      policy_notice=(
        "This scan follows NASA VDP v1.6.2 guidelines: rate-limited, no DoS, "
        "no forbidden endpoints (/wp-json/wp/v2/users, xmlrpc.php). "
        "Report validated findings to https://bugcrowd.com/engagements/nasa-vdp"
      ),
    )


def get_targets() -> list[dict[str, Any]]:
  return NASA_VDP_TARGETS
