"""Nuclei-inspired vulnerability checks — strict verification, 1000+ templates."""

from __future__ import annotations

import asyncio
import re
from urllib.parse import urlencode, urljoin, urlparse, urlunparse

import httpx

from core.config import HTTP_TIMEOUT, REQUEST_DELAY, USER_AGENT, FORBIDDEN_PATHS
from core.content_validator import (
    is_html_response,
    validate_path_traversal,
    validate_sensitive_path,
)
from core.template_engine import build_all_templates, template_count, combinatorial_check_surface

EVIL = "https://evil-attacker-security-test.example.com"
_SQL_ERRORS = (
    "sql syntax", "mysql", "sqlite", "postgresql", "ora-", "odbc",
    "unclosed quotation", "quoted string not properly terminated",
)


def _external_redirect(location: str) -> bool:
    if not location:
        return False
    host = urlparse(location).netloc.lower()
    if not host:
        return False
    allowed = ("nasa.gov", "globe.gov", "usgeo.gov", "nasaprs.com", "localhost")
    return not any(host == d or host.endswith("." + d) for d in allowed)


class NucleiRunner:
    """Run expanded vulnerability templates with live content validation."""

    def __init__(self):
        self.results: list[dict] = []
        self.templates = build_all_templates()
        self.templates_run = 0

    @property
    def template_total(self) -> int:
        return template_count()

    @property
    def check_surface(self) -> int:
        return combinatorial_check_surface()

    async def run_all(self, urls: list[str]) -> list[dict]:
        self.results = []
        self.templates_run = 0
        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            for url in urls[:20]:
                for template in self.templates:
                    finding = await self._run_template(client, url, template)
                    self.templates_run += 1
                    if finding:
                        self.results.append(finding)
                    await asyncio.sleep(REQUEST_DELAY * 0.15)  # faster batch, still rate-limited
        return self.results

    async def _run_template(self, client: httpx.AsyncClient, base_url: str, tmpl: dict) -> dict | None:
        method = tmpl["method"]
        dispatch = {
            "redirect_check": self._redirect_check,
            "xss_check": self._xss_check,
            "file_check": self._file_check,
            "cors_check": self._cors_check,
            "frame_check": self._frame_check,
            "host_check": self._host_check,
            "path_check": self._path_check,
            "sqli_check": self._sqli_check,
            "ssrf_check": self._ssrf_check,
            "ssti_check": self._ssti_check,
            "crlf_check": self._crlf_check,
            "api_probe": self._api_probe,
        }
        if fn:
            return await fn(client, base_url, tmpl)
        return None

    async def _redirect_check(self, client, base_url, tmpl) -> dict | None:
        parsed = urlparse(base_url)
        for param in tmpl.get("params", [])[:4]:
            test = urlunparse(parsed._replace(query=urlencode({param: EVIL})))
            if any(f in test for f in FORBIDDEN_PATHS):
                continue
            try:
                r = await client.get(test, follow_redirects=False)
                loc = r.headers.get("location", "")
                if r.status_code in (301, 302, 303, 307, 308) and _external_redirect(loc):
                    return self._finding(base_url, tmpl, test,
                        f"HTTP {r.status_code} -> {loc}", verified=True, confidence=92)
            except Exception:
                pass
        return None

    async def _xss_check(self, client, base_url, tmpl) -> dict | None:
        payload = tmpl.get("payload", "vdpXSSprobe999")
        parsed = urlparse(base_url)
        for param in tmpl.get("params", [])[:3]:
            test = urlunparse(parsed._replace(query=urlencode({param: payload})))
            try:
                r = await client.get(test)
                if payload in r.text and not is_html_response(r.text[:500], r.headers.get("content-type", "")):
                    pass  # reflected in non-html unlikely
                if payload in r.text:
                    # Must be unescaped reflection
                    escaped = payload.replace("<", "&lt;").replace(">", "&gt;")
                    if escaped not in r.text or payload != escaped:
                        return self._finding(base_url, tmpl, test,
                            "Payload reflected unescaped in response", verified=True, confidence=90)
            except Exception:
                pass
        return None

    async def _file_check(self, client, base_url, tmpl) -> dict | None:
        for path in tmpl.get("paths", []):
            if path in FORBIDDEN_PATHS:
                continue
            test = urljoin(base_url.rstrip("/") + "/", path.lstrip("/"))
            try:
                r = await client.get(test)
                ct = r.headers.get("content-type", "")
                vr = validate_sensitive_path(path, r.text, ct, r.status_code)
                if vr.valid:
                    return self._finding(base_url, tmpl, test, vr.reason, verified=True, confidence=vr.confidence)
            except Exception:
                pass
        return None

    async def _cors_check(self, client, base_url, tmpl) -> dict | None:
        origin = "http://127.0.0.1:8080"
        try:
            r = await client.get(base_url, headers={"Origin": origin})
            acao = [v for k, v in r.headers.multi_items() if k.lower() == "access-control-allow-origin"]
            acac = r.headers.get("access-control-allow-credentials", "").lower() == "true"
            if len(acao) == 1 and acao[0] == origin and acac:
                return self._finding(base_url, tmpl, base_url,
                    f"ACAO reflects origin with credentials: {acao}", verified=True, confidence=93)
        except Exception:
            pass
        return None

    async def _frame_check(self, client, base_url, tmpl) -> dict | None:
        try:
            r = await client.get(base_url)
            xfo = r.headers.get("x-frame-options", "")
            csp = r.headers.get("content-security-policy", "")
            has_login = bool(re.search(r'type=["\']password["\']', r.text, re.I))
            if has_login and not xfo and "frame-ancestors" not in csp.lower():
                return self._finding(base_url, tmpl, base_url,
                    "Login form without X-Frame-Options", verified=False, confidence=55)
        except Exception:
            pass
        return None

    async def _host_check(self, client, base_url, tmpl) -> dict | None:
        try:
            r = await client.get(base_url, headers={"X-Forwarded-Host": "evil-attacker.example.com"},
                                 follow_redirects=False)
            loc = r.headers.get("location", "")
            if _external_redirect(loc):
                return self._finding(base_url, tmpl, base_url, f"Host header redirect: {loc}", verified=True, confidence=88)
        except Exception:
            pass
        return None

    async def _path_check(self, client, base_url, tmpl) -> dict | None:
        for path in tmpl.get("paths", [])[:3]:
            test = urljoin(base_url.rstrip("/"), path)
            try:
                r = await client.get(test)
                vr = validate_path_traversal(r.text, r.headers.get("content-type", ""))
                if vr.valid:
                    return self._finding(base_url, tmpl, test, vr.reason, verified=True, confidence=vr.confidence)
            except Exception:
                pass
        return None

    async def _sqli_check(self, client, base_url, tmpl) -> dict | None:
        payload = tmpl.get("payload", "'")
        parsed = urlparse(base_url)
        for param in tmpl.get("params", ["id"])[:1]:
            test = urlunparse(parsed._replace(query=urlencode({param: payload})))
            try:
                r = await client.get(test)
                body = r.text.lower()
                if any(err in body for err in _SQL_ERRORS):
                    return self._finding(base_url, tmpl, test, "SQL error in response", verified=True, confidence=91)
            except Exception:
                pass
        return None

    async def _ssrf_check(self, client, base_url, tmpl) -> dict | None:
        payload = tmpl.get("payload", "http://127.0.0.1/")
        parsed = urlparse(base_url)
        for param in tmpl.get("params", ["url"])[:1]:
            test = urlunparse(parsed._replace(query=urlencode({param: payload})))
            try:
                r = await client.get(test, follow_redirects=False)
                if r.status_code in (301, 302) and "127.0.0.1" in r.headers.get("location", ""):
                    return self._finding(base_url, tmpl, test, f"SSRF redirect: {r.headers.get('location')}", verified=True, confidence=90)
            except Exception:
                pass
        return None

    async def _ssti_check(self, client, base_url, tmpl) -> dict | None:
        payload = tmpl.get("payload", "{{7*7}}")
        parsed = urlparse(base_url)
        for param in tmpl.get("params", ["name"])[:1]:
            test = urlunparse(parsed._replace(query=urlencode({param: payload})))
            try:
                r = await client.get(test)
                if "49" in r.text and "{{7*7}}" not in r.text and payload in ("{{7*7}}", "${7*7}"):
                    return self._finding(base_url, tmpl, test, "SSTI: template evaluated to 49", verified=True, confidence=94)
            except Exception:
                pass
        return None

    async def _crlf_check(self, client, base_url, tmpl) -> dict | None:
        payload = tmpl.get("payload", "%0d%0aSet-Cookie:malicious=1")
        parsed = urlparse(base_url)
        for param in tmpl.get("params", ["url"])[:1]:
            test = urlunparse(parsed._replace(query=urlencode({param: payload})))
            try:
                r = await client.get(test, follow_redirects=False)
                if "malicious=1" in str(r.headers) or _external_redirect(r.headers.get("location", "")):
                    return self._finding(base_url, tmpl, test, "CRLF header injection confirmed", verified=True, confidence=89)
            except Exception:
                pass
        return None

    async def _api_probe(self, client, base_url, tmpl) -> dict | None:
        for path in tmpl.get("paths", [])[:1]:
            test = urljoin(base_url.rstrip("/"), path)
            try:
                r = await client.get(test, headers={"Accept": "application/json"})
                ct = r.headers.get("content-type", "")
                if r.status_code == 200 and "json" in ct and not is_html_response(r.text, ct):
                    if any(k in r.text.lower() for k in ("email", "password", "token", "secret", "user")):
                        return self._finding(base_url, tmpl, test, "JSON API returns sensitive fields", verified=False, confidence=50)
            except Exception:
                pass
        return None

    def _finding(self, base_url, tmpl, test_url, evidence, verified=False, confidence=40) -> dict:
        # verified flag from scanner is only a candidate — exploit engine re-validates
        return {
            "id": f"nuclei-{tmpl['id']}-{abs(hash(test_url)) % 10**8}",
            "target": test_url,
            "title": tmpl["name"],
            "severity": tmpl["severity"],
            "category": tmpl["category"],
            "description": f"Template {tmpl['id']} matched on {base_url}",
            "evidence": evidence,
            "remediation": "Fix per OWASP guidelines.",
            "exploitable": verified,
            "verified": False,  # never pre-verify; exploit engine decides
            "candidate": verified,
            "template_id": tmpl["id"],
            "confidence": confidence if verified else min(confidence, 45),
        }
