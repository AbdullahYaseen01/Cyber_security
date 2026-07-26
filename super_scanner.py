"""Intelligence-driven super scanner — deep checks from 843 NASA VDP historical reports."""

from __future__ import annotations

import asyncio
import re
import ssl
import socket
from dataclasses import asdict
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse, urlencode, urlunparse, quote, parse_qs

import httpx
import dns.resolver

from scanner import Finding, SEVERITY_ORDER, _sanitize, FORBIDDEN_PATHS
from intelligence import get_profile, get_model
from core.content_validator import validate_sensitive_path

EVIL = "https://evil-attacker-security-test.example.com"


def _is_external_redirect(location: str, allowed_domains: list[str]) -> bool:
    """True only if Location header points to an external host."""
    if not location:
        return False
    try:
        host = urlparse(location).netloc.lower()
        if not host:
            return False
        for d in allowed_domains:
            if host == d or host.endswith("." + d):
                return False
        return "evil-attacker" in host or not any(d in host for d in ("nasa.gov", "globe.gov", "usgeo.gov", "nasaprs.com"))
    except Exception:
        return False
EVIL_ORIGIN = "http://127.0.0.1:8080"

NASA_VDP_TARGETS = [
    {"domain": "nasa.gov", "urls": ["https://www.nasa.gov", "https://nasa.gov"]},
    {"domain": "usgeo.gov", "urls": ["https://www.usgeo.gov", "https://usgeo.gov"]},
    {"domain": "globe.gov", "urls": ["https://www.globe.gov", "https://globe.gov", "https://dataentry.globe.gov", "https://vis.globe.gov/GLOBE/"]},
    {"domain": "nspires.nasaprs.com", "urls": ["https://nspires.nasaprs.com"]},
    {"domain": "nsc.nasa.gov", "urls": ["https://nsc.nasa.gov", "https://www.nsc.nasa.gov"]},
]

SOCIAL_DOMAINS = ("youtube.com", "twitter.com", "x.com", "facebook.com", "instagram.com", "tiktok.com", "linkedin.com")
XSS_PROBE = "vdp7xssprobe999"
SENSITIVE_PATHS = [
    ("/.git/HEAD", "Git Repository Exposed", "critical"),
    ("/.env", "Environment File Exposed", "critical"),
    ("/backup.sql", "Database Backup Exposed", "critical"),
    ("/.well-known/security.txt", "security.txt", "info"),
    ("/robots.txt", "robots.txt", "info"),
]


class SuperScanner:
    """Deep intelligence-driven scanner using historical NASA VDP patterns."""

    def __init__(self, request_delay: float = 0.05, timeout: float = 8.0):
        self.request_delay = request_delay
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None
        self.model = get_model()
        self.checks_run: list[str] = []

    async def __aenter__(self):
        self._client = httpx.AsyncClient(
            timeout=httpx.Timeout(self.timeout, connect=5.0),
            follow_redirects=True,
            headers={"User-Agent": "NASA-VDP-SuperScanner/2.0 (Good-Faith Security Research)"},
            verify=True,
        )
        return self

    async def _safe(self, coro, label: str = "", limit: float = 30.0):
        """Run check with timeout to prevent hangs."""
        try:
            return await asyncio.wait_for(coro, timeout=limit)
        except asyncio.TimeoutError:
            return []
        except Exception:
            return []

    async def __aexit__(self, *args):
        if self._client:
            await self._client.aclose()

    async def _get(self, url: str, **kwargs) -> httpx.Response | None:
        await asyncio.sleep(self.request_delay)
        try:
            return await self._client.get(url, **kwargs)
        except Exception:
            return None

    async def _head(self, url: str, **kwargs) -> httpx.Response | None:
        await asyncio.sleep(self.request_delay)
        try:
            return await self._client.head(url, **kwargs)
        except Exception:
            return None

    def _finding(self, **kwargs) -> Finding:
        return Finding(
            vdp_compliant=True,
            exploitable=kwargs.pop("exploitable", False),
            **kwargs,
        )

    # ── DNS / TLS ──────────────────────────────────────────────

    async def _dns_checks(self, domain: str) -> list[Finding]:
        return await asyncio.to_thread(self._dns_checks_sync, domain)

    def _dns_checks_sync(self, domain: str) -> list[Finding]:
        findings = []
        resolver = dns.resolver.Resolver()
        resolver.timeout = 3
        resolver.lifetime = 3
        for rtype in ("A", "AAAA", "MX", "TXT", "CNAME"):
            try:
                answers = resolver.resolve(domain, rtype)
                records = [str(r) for r in answers]
                findings.append(self._finding(
                    id=f"dns-{domain}-{rtype.lower()}",
                    target=domain, title=f"DNS {rtype} Records",
                    severity="info", category="Reconnaissance",
                    description=f"Public {rtype} records for {domain}.",
                    evidence=", ".join(records[:5]),
                    remediation="Verify DNS records don't expose internal infra.",
                ))
            except Exception:
                pass

        try:
            cnames = [str(r.target).rstrip(".") for r in resolver.resolve(domain, "CNAME")]
            for cname in cnames:
                try:
                    resolver.resolve(cname, "A")
                except Exception:
                    findings.append(self._finding(
                        id=f"takeover-{domain}-{cname[:20]}",
                        target=domain,
                        title="Potential Subdomain Takeover (Dangling CNAME)",
                        severity="high", category="Subdomain Takeover",
                        description=f"CNAME {cname} does not resolve — attacker may claim it.",
                        evidence=f"{domain} -> {cname} (no A record)",
                        remediation="Remove dangling CNAME or claim the target hostname.",
                        exploitable=True,
                        impact="Full control of subdomain content, cookie theft, phishing.",
                        reproduction_steps=f"1. Check DNS: dig CNAME {domain}\n2. Verify {cname} is unclaimed",
                    ))
        except Exception:
            pass
        return findings

    async def _tls_check(self, domain: str) -> list[Finding]:
        return await asyncio.to_thread(self._tls_check_sync, domain)

    def _tls_check_sync(self, domain: str) -> list[Finding]:
        findings = []
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((domain, 443), timeout=10) as sock:
                with ctx.wrap_socket(sock, server_hostname=domain) as ssock:
                    cert = ssock.getpeercert()
                    not_after = cert.get("notAfter", "")
                    if not_after:
                        expiry = datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
                        days = (expiry.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)).days
                        if days < 30:
                            findings.append(self._finding(
                                id=f"tls-expiry-{domain}", target=domain,
                                title="TLS Certificate Expiring Soon",
                                severity="medium", category="TLS",
                                description=f"Certificate expires in {days} days.",
                                evidence=f"Expiry: {not_after}",
                                remediation="Renew certificate before expiration.",
                                exploitable=True,
                            ))
        except ssl.SSLCertVerificationError as e:
            findings.append(self._finding(
                id=f"tls-bad-{domain}", target=domain,
                title="Invalid TLS Certificate",
                severity="high", category="TLS",
                description="TLS certificate verification failed.",
                evidence=str(e)[:300],
                remediation="Install valid CA-signed certificate.",
                exploitable=True,
            ))
        except Exception:
            pass
        return findings

    # ── CORS (deep — only flag truly exploitable) ──────────────

    async def _cors_deep(self, url: str) -> list[Finding]:
        findings = []
        domain = urlparse(url).netloc
        test_urls = [url]
        if "globe.gov" in domain:
            test_urls += ["https://www.globe.gov/api/jsonws/"]

        for test_url in test_urls:
            resp = await self._get(test_url, headers={"Origin": EVIL_ORIGIN})
            if not resp:
                continue

            acao_list = [v for k, v in resp.headers.multi_items() if k.lower() == "access-control-allow-origin"]
            acac = resp.headers.get("access-control-allow-credentials", "").lower() == "true"

            if len(acao_list) == 1 and acao_list[0] == EVIL_ORIGIN and acac:
                findings.append(self._finding(
                    id=f"cors-exploit-{urlparse(test_url).netloc}",
                    target=test_url, title="Exploitable CORS — Origin Reflection + Credentials",
                    severity="high", category="CORS",
                    description="Server reflects attacker Origin with credentials allowed — cross-origin data theft.",
                    evidence=f"ACAO: {acao_list[0]}, ACAC: true",
                    remediation="Validate Origin against allowlist; never reflect arbitrary origins with credentials.",
                    exploitable=True,
                    impact="Steal authenticated API responses from logged-in users.",
                    reproduction_steps=f'fetch("{test_url}", {{credentials:"include"}}).then(r=>r.text()).then(console.log)',
                ))
            elif len(acao_list) > 1:
                findings.append(self._finding(
                    id=f"cors-malformed-{urlparse(test_url).netloc}",
                    target=test_url, title="Malformed CORS Headers (Duplicate ACAO)",
                    severity="info", category="CORS",
                    description="Multiple Access-Control-Allow-Origin headers — browser blocks, not exploitable.",
                    evidence=f"ACAO headers: {acao_list}",
                    remediation="Send single valid ACAO header.",
                    exploitable=False,
                ))
        return findings

    # ── Open Redirect (standard + bypass patterns) ─────────────

    async def _open_redirect(self, base_url: str, params: list[str]) -> list[Finding]:
        findings = []
        domain = urlparse(base_url).netloc
        parsed = urlparse(base_url)

        bypass_payloads = [EVIL, f"https://www.{domain}.evil-attacker.example.com"]

        for param in params[:2]:
            for payload in bypass_payloads[:1]:
                test = urlunparse(parsed._replace(query=urlencode({param: payload})))
                resp = await self._get(test, follow_redirects=False)
                if not resp:
                    continue
                loc = resp.headers.get("location", "")

                if resp.status_code in (301, 302, 303, 307, 308) and _is_external_redirect(
                    loc, [domain, "nasa.gov", "globe.gov", "usgeo.gov"]
                ):
                    findings.append(self._finding(
                        id=f"redirect-{domain}-{param}",
                        target=test,
                        title=f"Open Redirect via '{param}' Parameter",
                        severity="medium", category="Open Redirect",
                        description=f"Unvalidated redirect to external domain via ?{param}=.",
                        evidence=f"HTTP {resp.status_code} Location: {loc}",
                        remediation="Validate redirect URLs against internal path allowlist.",
                        exploitable=True,
                        impact="Phishing, OAuth token theft, session fixation.",
                        reproduction_steps=f"1. Open {test}\n2. Observe redirect to {loc}",
                    ))
                    return findings

                # Check body for actual external redirect links (globe.gov backUrl pattern)
                if "evil-attacker" in resp.text:
                    link_match = re.search(
                        r'href=["\'](https?://[^"\']*evil-attacker[^"\']*)["\']', resp.text, re.I
                    )
                    if link_match and _is_external_redirect(link_match.group(1), [domain]):
                        findings.append(self._finding(
                            id=f"redirect-body-{domain}-{param}",
                            target=test,
                            title=f"Open Redirect in Page Body via '{param}'",
                            severity="medium", category="Open Redirect",
                            description=f"Parameter {param} injects attacker URL into page link.",
                            evidence=f"Malicious href: {link_match.group(1)}",
                            remediation="Validate backUrl/redirect parameters.",
                            exploitable=True,
                            impact="User clicks trusted .gov link, lands on attacker site.",
                            reproduction_steps=f"1. Visit {test}\n2. Click 'return' link with injected URL",
                        ))
                        return findings

        return findings

    # ── Host Header Injection ──────────────────────────────────

    async def _host_header(self, url: str) -> list[Finding]:
        findings = []
        domain = urlparse(url).netloc
        evil_host = "evil-attacker.example.com"

        for header_name, header_val in [("X-Forwarded-Host", evil_host)]:
            headers = {header_name: header_val}
            if header_name != "Host":
                headers["Host"] = domain

            resp = await self._get(url, headers=headers, follow_redirects=False)
            if not resp:
                continue

            loc = resp.headers.get("location", "")
            if evil_host in loc:
                findings.append(self._finding(
                    id=f"host-redirect-{domain}-{header_name}",
                    target=url,
                    title=f"Host Header Open Redirect via {header_name}",
                    severity="medium", category="Host Header",
                    description=f"{header_name} header causes redirect to attacker domain.",
                    evidence=f"Location: {loc}",
                    remediation="Ignore untrusted Host/X-Forwarded-Host in redirects.",
                    exploitable=True,
                    impact="Redirect users to phishing page for credential theft.",
                    reproduction_steps=f'curl -H "{header_name}: {header_val}" "{url}" -I',
                ))
                return findings

            m = re.search(r'<base[^>]+href=["\']([^"\']+)["\']', resp.text, re.I)
            if m and evil_host in m.group(1):
                findings.append(self._finding(
                    id=f"host-base-{domain}",
                    target=url,
                    title="Base Tag Hijacking via Host Header",
                    severity="medium", category="Host Header",
                    description="Server sets <base href> from injected Host header.",
                    evidence=f"<base href={m.group(1)!r}>",
                    remediation="Use static base URLs; don't derive from Host header.",
                    exploitable=True,
                    impact="Attacker controls all relative resource URLs on page.",
                    reproduction_steps=f'curl -H "Host: {evil_host}" "{url}" | grep base',
                ))
                return findings

        return findings

    # ── Reflected XSS ──────────────────────────────────────────

    async def _xss_reflected(self, url: str) -> list[Finding]:
        findings = []
        domain = urlparse(url).netloc
        parsed = urlparse(url)
        params = ["q", "search", "keywords", "url", "redirect"]

        payloads = [XSS_PROBE]

        for param in params[:3]:
            for payload in payloads:
                test = urlunparse(parsed._replace(query=urlencode({param: payload})))
                resp = await self._get(test)
                if resp and payload in resp.text:
                    # Check if unencoded in HTML context
                    if f'">{XSS_PROBE}' in resp.text or f"'{XSS_PROBE}" in resp.text:
                        findings.append(self._finding(
                            id=f"xss-{domain}-{param}",
                            target=test,
                            title=f"Reflected XSS via '{param}' Parameter",
                            severity="high", category="XSS",
                            description=f"User input in ?{param}= reflected unencoded in HTML.",
                            evidence=f"Payload '{payload}' found in response body.",
                            remediation="Encode all user input; implement CSP.",
                            exploitable=True,
                            impact="Execute arbitrary JavaScript in victim browser — session hijack.",
                            reproduction_steps=f"1. Visit {test}\n2. View page source for reflected payload",
                        ))
                        return findings
        return findings

    # ── IDOR / API probing (globe.gov) ─────────────────────────

    async def _idor_api(self, base_url: str, api_paths: list[str]) -> list[Finding]:
        findings = []
        for path in api_paths:
            url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
            resp = await self._get(url, headers={"Accept": "application/json"})
            if not resp:
                continue

            if resp.status_code == 200:
                body = resp.text.lower()
                sensitive = any(k in body for k in ("email", "password", "token", "ssn", "phone", "address"))
                if sensitive and "json" in resp.headers.get("content-type", ""):
                    findings.append(self._finding(
                        id=f"idor-{urlparse(url).netloc}-{path[:20].replace('/','-')}",
                        target=url,
                        title="Unauthenticated API Data Exposure",
                        severity="high", category="IDOR",
                        description=f"API endpoint {path} returns sensitive data without auth.",
                        evidence=resp.text[:300],
                        remediation="Require authentication; validate object ownership.",
                        exploitable=True,
                        impact="PII disclosure — emails, tokens, or credentials exposed.",
                        reproduction_steps=f"curl -s '{url}' | head",
                    ))
            elif resp.status_code == 403:
                # Endpoint exists but blocked — note for manual testing
                pass
        return findings

    # ── Broken Link Hijacking ──────────────────────────────────

    async def _broken_links(self, url: str) -> list[Finding]:
        findings = []
        resp = await self._get(url)
        if not resp:
            return findings

        links = re.findall(r'href=["\'](https?://[^"\']+)["\']', resp.text, re.I)
        social = [l for l in set(links) if any(s in l.lower() for s in SOCIAL_DOMAINS)]

        for link in social[:5]:
            try:
                hr = await asyncio.wait_for(
                    self._head(link, follow_redirects=True), timeout=6.0
                )
                if hr and hr.status_code in (404, 410, 451):
                    findings.append(self._finding(
                        id=f"broken-link-{hash(link) % 100000}",
                        target=url,
                        title="Broken External Link — Hijackable",
                        severity="medium", category="Broken Link",
                        description=f"External link returns {hr.status_code} — attacker can claim handle/domain.",
                        evidence=f"Broken: {link} (HTTP {hr.status_code}) on {url}",
                        remediation="Update or remove broken social media links.",
                        exploitable=True,
                        impact="Attacker registers expired handle; NASA page links to attacker content.",
                        reproduction_steps=f"1. Visit {url}\n2. Click {link}\n3. Observe {hr.status_code}",
                    ))
            except Exception:
                findings.append(self._finding(
                    id=f"dead-link-{hash(link) % 100000}",
                    target=url,
                    title="Unreachable External Link",
                    severity="low", category="Broken Link",
                    description="External social link is unreachable.",
                    evidence=f"Dead link: {link}",
                    remediation="Verify and update external links.",
                    exploitable=False,
                ))
        return findings

    # ── Sensitive Files ────────────────────────────────────────

    async def _sensitive_files(self, base_url: str) -> list[Finding]:
        domain = urlparse(base_url).netloc

        async def check(path, title, severity):
            if path in FORBIDDEN_PATHS:
                return None
            test = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
            resp = await self._head(test) or await self._get(test)
            if resp and resp.status_code == 200:
                is_info = path in ("/.well-known/security.txt", "/robots.txt")
                if not is_info:
                    vr = validate_sensitive_path(path, resp.text, resp.headers.get("content-type", ""), resp.status_code)
                    if not vr.valid:
                        return None  # SPA fallback / false positive — skip
                    return self._finding(
                        id=f"exposure-{domain}-{path.replace('/','-')}",
                        target=test, title=title,
                        severity=severity,
                        category="Information Disclosure",
                        description=f"Confirmed sensitive file at {path}.",
                        evidence=vr.reason,
                        remediation="Remove or restrict access.",
                        exploitable=True,
                    )
                return self._finding(
                    id=f"exposure-{domain}-{path.replace('/','-')}",
                    target=test, title=title,
                    severity="info",
                    category="Information Disclosure",
                    description=f"Path {path} accessible (HTTP 200).",
                    evidence=f"Status 200; Preview: {resp.text[:150]}",
                    remediation="Remove or restrict access.",
                    exploitable=False,
                )
            return None

        results = await asyncio.gather(*[check(p, t, s) for p, t, s in SENSITIVE_PATHS])
        return [r for r in results if isinstance(r, Finding)]

    # ── Clickjacking ───────────────────────────────────────────

    async def _clickjacking(self, url: str) -> list[Finding]:
        findings = []
        resp = await self._get(url)
        if not resp:
            return findings
        domain = urlparse(url).netloc
        xfo = resp.headers.get("x-frame-options", "")
        csp = resp.headers.get("content-security-policy", "")
        has_protection = bool(xfo) or "frame-ancestors" in csp.lower()
        has_login = bool(re.search(r'type=["\']password["\']', resp.text, re.I))

        if has_login and not has_protection:
            findings.append(self._finding(
                id=f"clickjack-{domain}",
                target=url,
                title="Clickjacking on Login/Auth Page",
                severity="medium", category="Clickjacking",
                description="Login form lacks X-Frame-Options / CSP frame-ancestors.",
                evidence="No frame protection headers on page with password field.",
                remediation="Add X-Frame-Options: DENY or CSP frame-ancestors 'self'.",
                exploitable=True,
                impact="Trick users into clicking hidden login form actions.",
                reproduction_steps=f'<iframe src="{url}"></iframe>',
            ))
        return findings

    # ── Cookie Security ────────────────────────────────────────

    async def _cookie_security(self, url: str) -> list[Finding]:
        findings = []
        resp = await self._get(url)
        if not resp:
            return findings
        domain = urlparse(url).netloc
        for cookie in resp.headers.get_list("set-cookie"):
            name = cookie.split("=")[0].lower()
            if not any(s in name for s in ("session", "auth", "token", "jwt", "sid", "csrf", "login")):
                continue
            issues = []
            lower = cookie.lower()
            if "secure" not in lower:
                issues.append("Missing Secure")
            if "httponly" not in lower:
                issues.append("Missing HttpOnly")
            if "samesite" not in lower:
                issues.append("Missing SameSite")
            if issues:
                findings.append(self._finding(
                    id=f"cookie-{domain}-{name}",
                    target=url,
                    title=f"Insecure Session Cookie: {name}",
                    severity="medium", category="Session Security",
                    description=f"Cookie '{name}' missing security flags.",
                    evidence=f"{cookie[:200]} — {', '.join(issues)}",
                    remediation="Set Secure, HttpOnly, SameSite=Strict.",
                    exploitable=True,
                ))
        return findings

    # ── Liferay-specific (globe.gov) ───────────────────────────

    async def _liferay_paths(self, base_url: str) -> list[Finding]:
        findings = []
        paths = [
            "/api/jsonws",
            "/o/headless-admin-user/v1.0/",
            "/group/control_panel/manage",
            "/c/portal/login",
        ]
        for path in paths:
            url = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
            resp = await self._get(url)
            if resp and resp.status_code in (200, 403, 500):
                ct = resp.headers.get("content-type", "")
                if "json" in ct or path.endswith("/"):
                    findings.append(self._finding(
                        id=f"liferay-{urlparse(url).netloc}-{path.replace('/','-')}",
                        target=url,
                        title=f"Liferay Endpoint Discovered: {path}",
                        severity="info", category="Attack Surface",
                        description=f"Liferay portal endpoint responds ({resp.status_code}).",
                        evidence=f"HTTP {resp.status_code}; Content-Type: {ct}",
                        remediation="Restrict admin/API endpoints; keep Liferay patched.",
                        exploitable=False,
                    ))
        return findings

    async def _empty(self) -> list:
        return []

    # ── Main scan orchestrator ─────────────────────────────────

    async def scan_domain(self, domain: str, urls: list[str]) -> list[Finding]:
        profile = get_profile(domain)
        checks = profile.get("checks", [])
        self.checks_run.extend(checks)
        all_findings: list[Finding] = []

        all_findings.extend(await self._dns_checks(domain))
        all_findings.extend(await self._tls_check(domain))

        primary = urls[0]
        check_map = {
            "cors_deep": lambda: self._cors_deep(primary),
            "open_redirect": lambda: self._open_redirect(primary, profile.get("redirect_params", ["url"])[:4]),
            "open_redirect_backurl": lambda: self._open_redirect(
                "https://www.globe.gov/globe-community/blogs/community-blogs",
                ["backUrl"]
            ) if "globe" in domain else self._empty(),
            "open_redirect_liferay": lambda: self._open_redirect(
                urljoin(primary, "/c/portal/login"), ["redirect"]
            ),
            "host_header": lambda: self._host_header(primary),
            "xss_reflected": lambda: self._xss_reflected(primary),
            "idor_api": lambda: self._idor_api(primary, profile.get("api_paths", [])[:4]),
            "broken_links": lambda: self._broken_links(primary),
            "sensitive_files": lambda: self._sensitive_files(primary),
            "clickjacking": lambda: self._clickjacking(primary),
            "cookie_security": lambda: self._cookie_security(primary),
            "liferay_paths": lambda: self._liferay_paths(primary),
            "tls_dns": lambda: self._empty(),
            "saml_relay": lambda: self._open_redirect(primary, ["RelayState"]),
            "subdomain_takeover": lambda: self._empty(),
        }

        for check_name in checks:
            fn = check_map.get(check_name)
            if fn:
                result = fn()
                if asyncio.iscoroutine(result):
                    findings = await self._safe(result, check_name, limit=25.0)
                    if isinstance(findings, list):
                        all_findings.extend(findings)

        for extra_url in urls[1:2]:  # limit extra URLs
            all_findings.extend(await self._safe(self._cors_deep(extra_url), limit=10.0) or [])
            all_findings.extend(await self._safe(self._open_redirect(extra_url, profile.get("redirect_params", ["url"])[:3]), limit=15.0) or [])

        return all_findings

    async def run_super_scan(self, scan_id: str, progress_cb=None, target_domain: str | None = None) -> dict:
        started = datetime.now(timezone.utc).isoformat()
        all_findings: list[Finding] = []

        if target_domain:
            from core.domain_utils import normalize_domain, scope_root, urls_for_domain
            root = scope_root(target_domain)
            urls = urls_for_domain(target_domain)
            targets = [{"domain": root, "urls": urls}]
        else:
            targets = sorted(
                NASA_VDP_TARGETS,
                key=lambda t: get_profile(t["domain"]).get("priority", 9),
            )

        total = len(targets)
        for i, target in enumerate(targets):
            if progress_cb:
                await progress_cb(target["domain"], int((i / total) * 85))
            findings = await self.scan_domain(target["domain"], target["urls"])
            all_findings.extend(findings)
            if progress_cb:
                await progress_cb(target["domain"], int(((i + 1) / total) * 85))

        seen: set[str] = set()
        unique = []
        for f in all_findings:
            if f.id not in seen:
                seen.add(f.id)
                unique.append(f)

        unique.sort(key=lambda f: SEVERITY_ORDER.get(f.severity, 99))

        return {
            "scan_id": scan_id,
            "scan_type": "super",
            "started_at": started,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "intelligence": {
                "reports_analyzed": self.model.total_reports,
                "checks_run": list(set(self.checks_run)),
                "priority_targets": self.model.priority_targets,
            },
            "findings": [asdict(f) for f in unique],
            "summary": {
                "total_findings": len(unique),
                "exploitable_candidates": sum(1 for f in unique if f.exploitable),
                "by_severity": dict(__import__("collections").Counter(f.severity for f in unique)),
                "targets_scanned": len(targets),
            },
        }
