"""Deep security scanners — TLS, headers, JWT, API, GraphQL, auth, DNS, tech fingerprint."""

from __future__ import annotations

import asyncio
import json
import re
import socket
import ssl
from urllib.parse import urljoin, urlparse

import httpx
import dns.resolver

from core.config import HTTP_TIMEOUT, REQUEST_DELAY, USER_AGENT, FORBIDDEN_PATHS

SECURITY_HEADERS = [
    "strict-transport-security",
    "content-security-policy",
    "x-frame-options",
    "x-content-type-options",
    "referrer-policy",
    "permissions-policy",
    "cross-origin-opener-policy",
    "cross-origin-resource-policy",
]

TECH_SIGNATURES = {
    "WordPress": [r"wp-content", r"wp-includes", r"/wp-json/"],
    "Drupal": [r"Drupal\.settings", r"/sites/default/"],
    "Liferay": [r"Liferay", r"/o/headless", r"/api/jsonws/"],
    "React": [r"react", r"__NEXT_DATA__", r"data-reactroot"],
    "Angular": [r"ng-version", r"angular", r"data-beasties"],
    "Vue": [r"vue\.js", r"__vue__", r"v-cloak"],
    "jQuery": [r"jquery[.-]\d", r"\$\(document\)"],
    "ASP.NET": [r"__VIEWSTATE", r"aspnet", r"web.config"],
    "PHP": [r"\.php", r"PHPSESSID", r"X-Powered-By: PHP"],
    "Keycloak": [r"keycloak", r"/auth/realms/"],
    "GraphQL": [r"graphql", r"__schema"],
    "AWS": [r"amazonaws\.com", r"x-amz-"],
}

GRAPHQL_INTROSPECTION = '{"query":"{ __schema { types { name } } }"}'
API_PROBE_PATHS = [
    "/api", "/api/v1", "/api/v2", "/graphql", "/swagger.json", "/openapi.json",
    "/api/docs", "/v1/users", "/v1/me", "/rest", "/actuator/health", "/actuator/env",
    "/.well-known/openid-configuration", "/saml/metadata", "/oauth/token",
    "/o/headless-admin-user/v1.0/my-user-account",
    "/o/headless-admin-user/v1.0/user-accounts",
    "/api/jsonws/", "/user-teams-management",
]

AUTH_BYPASS_PATHS = [
    "//admin", "/./admin", "/%2e/admin", "/admin/..;/", "/api//v1/users",
    "/..;/admin", "/admin%00", "/admin%20", "/admin%09",
]


class DeepScannerSuite:
    """Run all deep scan modules against in-scope targets."""

    def __init__(self):
        self.findings: list[dict] = []
        self.stats = {"modules_run": 0, "checks_run": 0}

    async def run_all(self, urls: list[str], pages: list[dict] | None = None) -> list[dict]:
        self.findings = []
        self.stats = {"modules_run": 0, "checks_run": 0}
        targets = list(dict.fromkeys(urls[:25]))
        pages = pages or []

        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            for url in targets:
                await asyncio.gather(
                    self._scan_security_headers(client, url),
                    self._scan_tls(url),
                    self._scan_http_methods(client, url),
                    self._scan_tech_fingerprint(client, url),
                    self._scan_api_endpoints(client, url),
                    self._scan_graphql(client, url),
                    self._scan_jwt(client, url),
                    self._scan_auth_bypass(client, url),
                    self._scan_saml(client, url),
                    self._scan_cookies(client, url),
                    self._scan_cache_headers(client, url),
                    return_exceptions=True,
                )
                await asyncio.sleep(REQUEST_DELAY)

            # DNS checks per unique domain
            domains = list(dict.fromkeys(urlparse(u).netloc for u in targets if urlparse(u).netloc))
            for domain in domains[:10]:
                await self._scan_dns(domain)

            # Endpoint discovery from crawled source
            if pages:
                await self._discover_endpoints_from_pages(client, pages[:20])

        self.stats["modules_run"] = 12
        return self.findings

    def _add(self, **kwargs) -> None:
        self.stats["checks_run"] += 1
        self.findings.append({
            "id": kwargs.get("id", f"deep-{hash(kwargs.get('target','')) % 10**8}"),
            "target": kwargs["target"],
            "title": kwargs["title"],
            "severity": kwargs.get("severity", "info"),
            "category": kwargs.get("category", "Configuration"),
            "description": kwargs.get("description", ""),
            "evidence": kwargs.get("evidence", ""),
            "remediation": kwargs.get("remediation", "Apply security best practices."),
            "exploitable": kwargs.get("exploitable", False),
            "detection_source": "deep_scanner",
            "scan_module": kwargs.get("scan_module", "unknown"),
        })

    async def _scan_security_headers(self, client: httpx.AsyncClient, url: str) -> None:
        try:
            r = await client.get(url)
            missing = [h for h in SECURITY_HEADERS if h not in {k.lower() for k in r.headers.keys()}]
            if len(missing) >= 5:
                self._add(
                    id=f"headers-missing-{hash(url) % 10**8}",
                    target=url, title="Missing Security Headers",
                    severity="low", category="Security Headers",
                    description=f"{len(missing)} security headers absent.",
                    evidence=f"Missing: {', '.join(missing[:6])}",
                    scan_module="security_headers",
                )
            # Dangerous headers
            server = r.headers.get("server", "")
            powered = r.headers.get("x-powered-by", "")
            if server or powered:
                self._add(
                    id=f"headers-disclose-{hash(url) % 10**8}",
                    target=url, title="Server Version Disclosure",
                    severity="info", category="Information Disclosure",
                    evidence=f"Server: {server}; X-Powered-By: {powered}".strip("; "),
                    scan_module="security_headers",
                )
        except Exception:
            pass

    async def _scan_tls(self, url: str) -> None:
        parsed = urlparse(url)
        if parsed.scheme != "https":
            return
        host = parsed.hostname
        port = parsed.port or 443
        try:
            ctx = ssl.create_default_context()
            with socket.create_connection((host, port), timeout=8) as sock:
                with ctx.wrap_socket(sock, server_hostname=host) as ssock:
                    cert = ssock.getpeercert()
                    cipher = ssock.cipher()
                    proto = ssock.version()
                    if proto in ("TLSv1", "TLSv1.1"):
                        self._add(
                            id=f"tls-weak-{hash(url) % 10**8}",
                            target=url, title=f"Weak TLS Protocol: {proto}",
                            severity="medium", category="TLS",
                            description="Deprecated TLS version in use.",
                            evidence=f"Protocol: {proto}; Cipher: {cipher}",
                            exploitable=True, scan_module="tls",
                        )
                    # Expiry check
                    import datetime
                    not_after = cert.get("notAfter", "")
                    if not_after:
                        exp = datetime.datetime.strptime(not_after, "%b %d %H:%M:%S %Y %Z")
                        days = (exp - datetime.datetime.utcnow()).days
                        if days < 30:
                            self._add(
                                id=f"tls-expiry-{hash(url) % 10**8}",
                                target=url, title="TLS Certificate Expiring Soon",
                                severity="medium", category="TLS",
                                evidence=f"Expires in {days} days ({not_after})",
                                exploitable=days < 7, scan_module="tls",
                            )
        except ssl.SSLCertVerificationError as e:
            self._add(
                id=f"tls-invalid-{hash(url) % 10**8}",
                target=url, title="Invalid TLS Certificate",
                severity="high", category="TLS",
                evidence=str(e)[:200], exploitable=True, scan_module="tls",
            )
        except Exception:
            pass

    async def _scan_http_methods(self, client: httpx.AsyncClient, url: str) -> None:
        try:
            r = await client.request("OPTIONS", url)
            allow = r.headers.get("allow", "")
            if "TRACE" in allow.upper():
                self._add(
                    id=f"trace-{hash(url) % 10**8}",
                    target=url, title="HTTP TRACE Enabled",
                    severity="low", category="HTTP Methods",
                    evidence=f"Allow: {allow}", scan_module="http_methods",
                )
            if "PUT" in allow.upper() or "DELETE" in allow.upper():
                self._add(
                    id=f"dangerous-methods-{hash(url) % 10**8}",
                    target=url, title="Dangerous HTTP Methods Allowed",
                    severity="medium", category="HTTP Methods",
                    evidence=f"Allow: {allow}", scan_module="http_methods",
                )
        except Exception:
            pass

    async def _scan_tech_fingerprint(self, client: httpx.AsyncClient, url: str) -> None:
        try:
            r = await client.get(url)
            body = r.text[:15000]
            headers_str = str(r.headers)
            detected = []
            for tech, patterns in TECH_SIGNATURES.items():
                if any(re.search(p, body + headers_str, re.I) for p in patterns):
                    detected.append(tech)
            if detected:
                self._add(
                    id=f"tech-{hash(url) % 10**8}",
                    target=url, title=f"Technology Stack: {', '.join(detected[:4])}",
                    severity="info", category="Attack Surface",
                    description="Tech fingerprint guides targeted exploitation.",
                    evidence=f"Detected: {', '.join(detected)}",
                    scan_module="tech_fingerprint",
                )
        except Exception:
            pass

    async def _scan_api_endpoints(self, client: httpx.AsyncClient, base_url: str) -> None:
        for path in API_PROBE_PATHS:
            if path in FORBIDDEN_PATHS:
                continue
            test = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
            try:
                r = await client.get(test, headers={"Accept": "application/json"})
                ct = r.headers.get("content-type", "")
                if r.status_code == 200 and "json" in ct and len(r.text) > 20:
                    sensitive = any(k in r.text.lower() for k in (
                        "email", "password", "token", "secret", "phone", "address", "ssn", "user"
                    ))
                    if sensitive:
                        self._add(
                            id=f"api-expose-{hash(test) % 10**8}",
                            target=test, title="API Endpoint Exposes Sensitive Data",
                            severity="high", category="IDOR",
                            description=f"Unauthenticated API at {path} returns sensitive fields.",
                            evidence=r.text[:300],
                            exploitable=True, scan_module="api_discovery",
                        )
                    else:
                        self._add(
                            id=f"api-open-{hash(test) % 10**8}",
                            target=test, title=f"Open API Endpoint: {path}",
                            severity="info", category="Attack Surface",
                            evidence=f"HTTP 200 JSON response ({len(r.text)} bytes)",
                            scan_module="api_discovery",
                        )
                elif r.status_code in (401, 403) and path in ("/actuator/env", "/api/jsonws/"):
                    self._add(
                        id=f"api-protected-{hash(test) % 10**8}",
                        target=test, title=f"Protected Endpoint Found: {path}",
                        severity="info", category="Attack Surface",
                        evidence=f"HTTP {r.status_code} — endpoint exists",
                        scan_module="api_discovery",
                    )
            except Exception:
                pass
            await asyncio.sleep(REQUEST_DELAY * 0.1)

    async def _scan_graphql(self, client: httpx.AsyncClient, base_url: str) -> None:
        for path in ("/graphql", "/api/graphql", "/v1/graphql"):
            test = urljoin(base_url.rstrip("/"), path)
            try:
                r = await client.post(test, content=GRAPHQL_INTROSPECTION,
                                      headers={"Content-Type": "application/json"})
                if r.status_code == 200 and "__schema" in r.text:
                    self._add(
                        id=f"graphql-intro-{hash(test) % 10**8}",
                        target=test, title="GraphQL Introspection Enabled",
                        severity="medium", category="Information Disclosure",
                        description="GraphQL schema introspection is publicly accessible.",
                        evidence=r.text[:250],
                        exploitable=True, scan_module="graphql",
                    )
            except Exception:
                pass

    async def _scan_jwt(self, client: httpx.AsyncClient, url: str) -> None:
        try:
            r = await client.get(url)
            for cookie in r.headers.get_list("set-cookie"):
                if "eyJ" in cookie:
                    # Check alg:none vulnerability pattern
                    parts = cookie.split("eyJ")
                    for part in parts[1:]:
                        token = "eyJ" + part.split(";")[0].split(",")[0].strip()
                        if token.count(".") == 2:
                            header_b64 = token.split(".")[0]
                            import base64
                            try:
                                pad = header_b64 + "=" * (4 - len(header_b64) % 4)
                                header = json.loads(base64.urlsafe_b64decode(pad))
                                if header.get("alg") == "none" or header.get("alg") == "HS256":
                                    self._add(
                                        id=f"jwt-{hash(token[:20]) % 10**8}",
                                        target=url, title="JWT Token Analysis",
                                        severity="info" if header.get("alg") != "none" else "high",
                                        category="Authentication",
                                        evidence=f"JWT alg={header.get('alg')}; header={json.dumps(header)[:100]}",
                                        exploitable=header.get("alg") == "none",
                                        scan_module="jwt",
                                    )
                            except Exception:
                                pass
        except Exception:
            pass

    async def _scan_auth_bypass(self, client: httpx.AsyncClient, base_url: str) -> None:
        parsed = urlparse(base_url)
        for path in AUTH_BYPASS_PATHS[:5]:
            test = urljoin(base_url.rstrip("/"), path)
            try:
                r = await client.get(test, follow_redirects=False)
                if r.status_code == 200 and len(r.text) > 500:
                    admin_hints = ("admin", "dashboard", "control panel", "manage")
                    if any(h in r.text.lower() for h in admin_hints):
                        self._add(
                            id=f"auth-bypass-{hash(test) % 10**8}",
                            target=test, title="Potential Auth Bypass via Path Normalization",
                            severity="high", category="Authentication",
                            description=f"Path traversal variant {path} returned admin content.",
                            evidence=f"HTTP {r.status_code}; admin keywords in body",
                            exploitable=False, scan_module="auth_bypass",
                        )
            except Exception:
                pass

    async def _scan_saml(self, client: httpx.AsyncClient, base_url: str) -> None:
        for path in ("/saml/metadata", "/saml2/metadata", "/Shibboleth.sso/Metadata"):
            test = urljoin(base_url.rstrip("/"), path)
            try:
                r = await client.get(test)
                if r.status_code == 200 and ("EntityDescriptor" in r.text or "SAML" in r.text):
                    self._add(
                        id=f"saml-meta-{hash(test) % 10**8}",
                        target=test, title="SAML Metadata Exposed",
                        severity="info", category="Authentication",
                        evidence=r.text[:200],
                        scan_module="saml",
                    )
            except Exception:
                pass

    async def _scan_cookies(self, client: httpx.AsyncClient, url: str) -> None:
        try:
            r = await client.get(url)
            for cookie in r.headers.get_list("set-cookie"):
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
                    self._add(
                        id=f"cookie-{hash(cookie[:30]) % 10**8}",
                        target=url, title=f"Insecure Cookie: {name}",
                        severity="medium", category="Session Security",
                        evidence=f"{name}: {', '.join(issues)}",
                        scan_module="cookies",
                    )
        except Exception:
            pass

    async def _scan_cache_headers(self, client: httpx.AsyncClient, url: str) -> None:
        try:
            r = await client.get(url, headers={"X-Forwarded-Host": "evil-cache-poison.example.com"})
            if "evil-cache-poison" in r.text:
                self._add(
                    id=f"cache-poison-{hash(url) % 10**8}",
                    target=url, title="Cache Poisoning via X-Forwarded-Host",
                    severity="high", category="Cache Poison",
                    description="Host header reflected in cacheable response.",
                    evidence="X-Forwarded-Host reflected in body",
                    exploitable=True, scan_module="cache_poison",
                )
        except Exception:
            pass

    async def _scan_dns(self, domain: str) -> None:
        for rtype, title in [("TXT", "SPF/DMARC"), ("CAA", "CAA Records")]:
            try:
                answers = dns.resolver.resolve(domain, rtype)
                records = [str(a) for a in answers]
                if rtype == "TXT":
                    has_spf = any("v=spf1" in r for r in records)
                    has_dmarc = False
                    try:
                        dmarc = dns.resolver.resolve(f"_dmarc.{domain}", "TXT")
                        has_dmarc = any("v=DMARC1" in str(d) for d in dmarc)
                    except Exception:
                        pass
                    if not has_spf:
                        self._add(
                            id=f"dns-spf-{hash(domain) % 10**8}",
                            target=f"dns://{domain}", title="Missing SPF Record",
                            severity="info", category="DNS Security",
                            evidence="No SPF TXT record found", scan_module="dns",
                        )
            except Exception:
                pass

    async def _discover_endpoints_from_pages(self, client: httpx.AsyncClient, pages: list[dict]) -> None:
        endpoint_re = re.compile(r'["\'](/(?:api|v\d+|o|rest|graphql)[^"\']{2,80})["\']')
        seen: set[str] = set()
        for page in pages:
            try:
                from pathlib import Path
                content = Path(page["source_path"]).read_text(encoding="utf-8", errors="replace")[:50000]
            except Exception:
                continue
            base = page["url"]
            for match in endpoint_re.findall(content):
                if match in seen or match in FORBIDDEN_PATHS:
                    continue
                seen.add(match)
                test = urljoin(base, match)
                try:
                    r = await client.get(test, headers={"Accept": "application/json"})
                    if r.status_code == 200:
                        self._add(
                            id=f"endpoint-disc-{hash(test) % 10**8}",
                            target=test, title=f"Discovered Endpoint: {match}",
                            severity="info", category="Attack Surface",
                            evidence=f"Found in source; HTTP {r.status_code}",
                            scan_module="endpoint_discovery",
                        )
                except Exception:
                    pass
