"""Line-by-line source code analyzer — secrets, sinks, endpoints."""

from __future__ import annotations

import re
from dataclasses import dataclass, asdict
from pathlib import Path

# Patterns inspired by trufflehog, gitleaks, semgrep rules
SECRET_PATTERNS = [
    (r"(?i)(api[_-]?key|apikey)\s*[:=]\s*['\"]([a-zA-Z0-9_\-]{16,})['\"]", "API Key Hardcoded", "high"),
    (r"(?i)(secret|password|passwd|pwd)\s*[:=]\s*['\"]([^'\"]{8,})['\"]", "Hardcoded Secret", "critical"),
    (r"(?i)(aws_access_key_id|aws_secret_access_key)\s*[:=]\s*['\"]([A-Z0-9/+=]{16,})['\"]", "AWS Credential", "critical"),
    (r"AKIA[0-9A-Z]{16}", "AWS Access Key ID", "critical"),
    (r"(?i)Bearer\s+[a-zA-Z0-9_\-\.]{20,}", "Bearer Token", "high"),
    (r"(?i)private[_-]?key\s*[:=]\s*['\"]-----BEGIN", "Private Key", "critical"),
    (r"AIza[0-9A-Za-z\-_]{35}", "Google API Key", "medium"),
    (r"sk_live_[0-9a-zA-Z]{24,}", "Stripe Live Key", "critical"),
    (r"ghp_[A-Za-z0-9]{36}", "GitHub Personal Access Token", "critical"),
    (r"xox[baprs]-[0-9a-zA-Z-]{10,}", "Slack Token", "high"),
    (r"-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----", "Private Key Block", "critical"),
    (r"(?i)mongodb(\+srv)?://[^\s'\"]+", "MongoDB Connection String", "critical"),
    (r"(?i)postgres(ql)?://[^\s'\"]+", "Postgres Connection String", "critical"),
    (r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}", "JWT Token in Source", "medium"),
]

XSS_SINKS = [
    (r"\.innerHTML\s*=", "DOM XSS Sink: innerHTML", "high"),
    (r"document\.write\s*\(", "DOM XSS Sink: document.write", "high"),
    (r"eval\s*\(", "Code Injection: eval()", "high"),
    (r"setTimeout\s*\(\s*['\"]", "DOM XSS: setTimeout string", "medium"),
    (r"setInterval\s*\(\s*['\"]", "DOM XSS: setInterval string", "medium"),
    (r"new\s+Function\s*\(", "Code Injection: new Function()", "high"),
    (r"dangerouslySetInnerHTML", "React XSS Sink", "high"),
    (r"\$\([^)]*\)\.html\s*\(", "jQuery .html() XSS Sink", "medium"),
]

ENDPOINT_PATTERNS = [
    r'["\'](/api/[^"\']+)["\']',
    r'["\'](/v\d+/[^"\']+)["\']',
    r'["\'](/o/[^"\']+)["\']',
    r'fetch\s*\(\s*["\']([^"\']+)["\']',
    r'axios\.[a-z]+\s*\(\s*["\']([^"\']+)["\']',
    r'url\s*:\s*["\']([^"\']+)["\']',
]

INTERNAL_PATTERNS = [
    (r"https?://[a-zA-Z0-9\-\.]+\.(internal|local|corp|lan)\b", "Internal URL Disclosure", "medium"),
    (r"\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b", "Internal IP Disclosure", "medium"),
    (r"\b192\.168\.\d{1,3}\.\d{1,3}\b", "Private IP Disclosure", "low"),
]


@dataclass
class SourceFinding:
    id: str
    file_path: str
    url: str
    line_number: int
    line_content: str
    title: str
    severity: str
    category: str
    pattern: str
    exploitable: bool = False


class SourceAnalyzer:
    """Analyze downloaded source files line by line."""

    def analyze_file(self, source_path: str, url: str) -> list[SourceFinding]:
        findings: list[SourceFinding] = []
        path = Path(source_path)
        if not path.exists():
            return findings

        try:
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
        except Exception:
            return findings

        is_js = path.suffix in (".js", ".mjs") or "javascript" in url

        for line_num, line in enumerate(lines, 1):
            stripped = line.strip()
            if not stripped or len(stripped) < 5:
                continue

            # Secret scanning
            for pattern, title, severity in SECRET_PATTERNS:
                if re.search(pattern, line):
                    findings.append(SourceFinding(
                        id=f"src-secret-{hash(line+url) % 10**8}",
                        file_path=source_path, url=url, line_number=line_num,
                        line_content=stripped[:200], title=title, severity=severity,
                        category="Secret Exposure", pattern=pattern[:40],
                        exploitable=severity in ("critical", "high"),
                    ))
                    break

            if is_js or "<script" in line.lower():
                for pattern, title, severity in XSS_SINKS:
                    if re.search(pattern, line):
                        findings.append(SourceFinding(
                            id=f"src-sink-{hash(line+url) % 10**8}",
                            file_path=source_path, url=url, line_number=line_num,
                            line_content=stripped[:200], title=title, severity=severity,
                            category="XSS Sink", pattern=pattern[:40],
                            exploitable=True,
                        ))

            for pattern, title, severity in INTERNAL_PATTERNS:
                if re.search(pattern, line):
                    findings.append(SourceFinding(
                        id=f"src-internal-{hash(line+url) % 10**8}",
                        file_path=source_path, url=url, line_number=line_num,
                        line_content=stripped[:200], title=title, severity=severity,
                        category="Information Disclosure", pattern=pattern[:40],
                        exploitable=severity != "low",
                    ))

        # Extract API endpoints from full file
        full_text = "\n".join(lines)
        endpoints = set()
        for pat in ENDPOINT_PATTERNS:
            for m in re.finditer(pat, full_text):
                ep = m.group(1) if m.lastindex else m.group(0)
                if len(ep) < 80:
                    endpoints.add(ep)

        for ep in list(endpoints)[:20]:
            findings.append(SourceFinding(
                id=f"src-endpoint-{hash(ep+url) % 10**8}",
                file_path=source_path, url=url, line_number=0,
                line_content=ep, title=f"API Endpoint Discovered: {ep[:60]}",
                severity="info", category="Attack Surface", pattern="endpoint",
                exploitable=False,
            ))

        return findings

    def analyze_pages(self, pages: list[dict]) -> list[dict]:
        all_findings = []
        seen: set[str] = set()
        for page in pages:
            if not page.get("source_path"):
                continue
            for f in self.analyze_file(page["source_path"], page["url"]):
                key = f"{f.title}:{f.line_number}:{f.url}"
                if key not in seen:
                    seen.add(key)
                    all_findings.append(asdict(f))
        return all_findings
