"""Strict response validation — rejects SPA/HTML false positives on sensitive paths."""

from __future__ import annotations

import re
from typing import NamedTuple


class ValidationResult(NamedTuple):
    valid: bool
    reason: str
    confidence: int = 0


_HTML_MARKERS = (
    "<!doctype",
    "<html",
    "<head",
    "<body",
    "<meta",
    "<script",
    "<link",
    "<title",
    "ng-app",
    "data-beasties",
    "__next",
    "react-root",
    "id=\"app\"",
    "id='app'",
)

_ENV_KEY = re.compile(
    r"^[A-Za-z_][A-Za-z0-9_]*\s*=\s*.+$",
    re.MULTILINE,
)
_GIT_REF = re.compile(r"^ref:\s+refs/", re.MULTILINE)
_SVN_DIR = re.compile(r"^\d+$", re.MULTILINE)
_SQL_DUMP = re.compile(r"(CREATE TABLE|INSERT INTO|DROP TABLE)", re.I)
_PASSWD = re.compile(r"^root:.*?:/bin/", re.MULTILINE)
_WEB_CONFIG = re.compile(r"<configuration>|<system\.web>", re.I)
_JSON_SECRET = re.compile(r'"(api[_-]?key|password|secret|token|private[_-]?key)"\s*:\s*"[^"]{8,}"', re.I)


def is_html_response(text: str, content_type: str = "") -> bool:
    ct = (content_type or "").lower().split(";")[0].strip()
    if ct in ("text/html", "application/xhtml+xml"):
        return True
    sample = (text or "")[:4000].lower().lstrip()
    hits = sum(1 for m in _HTML_MARKERS if m in sample)
    return hits >= 2 or sample.startswith("<!")


def _reject_html(text: str, content_type: str, label: str) -> ValidationResult | None:
    if is_html_response(text, content_type):
        return ValidationResult(False, f"{label}: response is HTML (SPA/route fallback), not a real file", 0)
    return None


def validate_env_file(text: str, content_type: str = "") -> ValidationResult:
    rej = _reject_html(text, content_type, ".env")
    if rej:
        return rej
    if "<" in text and ">" in text:
        return ValidationResult(False, ".env: contains HTML/XML tags", 0)
    lines = [ln.strip() for ln in text.splitlines() if ln.strip() and not ln.strip().startswith("#")]
    env_lines = [ln for ln in lines if _ENV_KEY.match(ln)]
    if len(env_lines) < 2:
        return ValidationResult(False, f".env: only {len(env_lines)} KEY=value line(s); need ≥2", 0)
    secret_hints = ("password", "secret", "api", "key", "token", "db_", "database", "aws_", "private")
    if not any(any(h in ln.lower() for h in secret_hints) for ln in env_lines):
        return ValidationResult(False, ".env: no secret-like keys (PASSWORD, API_KEY, etc.)", 0)
    return ValidationResult(True, f".env confirmed: {len(env_lines)} secret keys", 95)


def validate_git_head(text: str, content_type: str = "") -> ValidationResult:
    rej = _reject_html(text, content_type, ".git/HEAD")
    if rej:
        return rej
    if _GIT_REF.search(text):
        return ValidationResult(True, f"Git HEAD: {text.strip()[:80]}", 98)
    return ValidationResult(False, ".git/HEAD: missing 'ref: refs/' format", 0)


def validate_svn_entries(text: str, content_type: str = "") -> ValidationResult:
    rej = _reject_html(text, content_type, ".svn")
    if rej:
        return rej
    if "dir" in text.lower() and _SVN_DIR.search(text):
        return ValidationResult(True, "SVN entries directory listing", 90)
    return ValidationResult(False, ".svn: not valid SVN format", 0)


def validate_sql_dump(text: str, content_type: str = "") -> ValidationResult:
    rej = _reject_html(text, content_type, "SQL dump")
    if rej:
        return rej
    if _SQL_DUMP.search(text) and len(text) > 200:
        return ValidationResult(True, "SQL dump markers found (CREATE/INSERT TABLE)", 92)
    return ValidationResult(False, "Not a SQL dump", 0)


def validate_web_config(text: str, content_type: str = "") -> ValidationResult:
    rej = _reject_html(text, content_type, "web.config")
    if rej:
        return rej
    if _WEB_CONFIG.search(text):
        return ValidationResult(True, "ASP.NET web.config exposed", 88)
    return ValidationResult(False, "Not web.config XML", 0)


def validate_json_secrets(text: str, content_type: str = "") -> ValidationResult:
    rej = _reject_html(text, content_type, "config.json")
    if rej:
        return rej
    ct = (content_type or "").lower()
    if "json" not in ct and not text.strip().startswith(("{", "[")):
        return ValidationResult(False, "config.json: not JSON content-type/body", 0)
    m = _JSON_SECRET.search(text)
    if m:
        return ValidationResult(True, f"JSON secret field: {m.group(1)}", 93)
    return ValidationResult(False, "config.json: no secret fields with values", 0)


def validate_path_traversal(text: str, content_type: str = "") -> ValidationResult:
    if _PASSWD.search(text):
        return ValidationResult(True, "/etc/passwd content leaked", 99)
    if "root:" in text and "/bin/" in text and not is_html_response(text, content_type):
        return ValidationResult(True, "Unix passwd format in response", 95)
    return ValidationResult(False, "No LFI/passwd evidence", 0)


def validate_sensitive_path(path: str, text: str, content_type: str = "", status_code: int = 200) -> ValidationResult:
    """Gate all sensitive-file findings — HTTP 200 alone is never enough."""
    if status_code != 200 or not text:
        return ValidationResult(False, f"HTTP {status_code} or empty body", 0)

    path_l = path.lower().rstrip("/")
    if path_l.endswith(".env") or path_l.endswith(".env.bak"):
        return validate_env_file(text, content_type)
    if path_l.endswith("/.git/head") or path_l == "/.git/head":
        return validate_git_head(text, content_type)
    if ".svn" in path_l:
        return validate_svn_entries(text, content_type)
    if path_l.endswith(".sql") or "backup" in path_l:
        return validate_sql_dump(text, content_type)
    if path_l.endswith("web.config"):
        return validate_web_config(text, content_type)
    if path_l.endswith("config.json") or path_l.endswith(".json"):
        return validate_json_secrets(text, content_type)

    rej = _reject_html(text, content_type, path)
    if rej:
        return rej
    # Generic: must not look like a normal web page
    if len(text) > 50000 and is_html_response(text, content_type):
        return ValidationResult(False, "Large HTML page, not sensitive file", 0)
    return ValidationResult(False, f"No validator for {path}; content not confirmed sensitive", 0)
