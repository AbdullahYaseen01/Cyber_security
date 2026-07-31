"""AI vulnerability inference engine — pattern learning from 843 NASA reports."""

from __future__ import annotations

import json
import math
import re
from collections import Counter
from pathlib import Path

from core.config import ROOT

CROWDSTREAM = ROOT / "crowdstream_all.json"

# Vulnerability signatures learned from historical NASA VDP reports
VULN_SIGNATURES = {
    "open_redirect": {
        "url_patterns": [r"[?&](url|redirect|next|backUrl|return|RelayState|redirect_uri)="],
        "keywords": ["redirect", "location", "window.location", "href"],
        "historical_count": 20,
        "base_confidence": 0.6,
    },
    "xss": {
        "url_patterns": [r"[?&](q|query|search|keywords|callback|name|id)="],
        "sink_patterns": [r"innerHTML", r"document\.write", r"eval\(", r"\.html\("],
        "keywords": ["script", "onerror", "onload", "javascript:"],
        "historical_count": 81,
        "base_confidence": 0.65,
    },
    "idor": {
        "url_patterns": [r"/users/\d+", r"/api/.*/\d+", r"orgId=", r"userId="],
        "keywords": ["user", "account", "profile", "member", "team"],
        "historical_count": 17,
        "base_confidence": 0.55,
    },
    "sqli": {
        "url_patterns": [r"[?&](id|search|query|label|name)=", r"'|\"|--|union|select"],
        "keywords": ["sql", "query", "search", "database"],
        "historical_count": 5,
        "base_confidence": 0.5,
    },
    "ssrf": {
        "url_patterns": [r"[?&](url|uri|path|dest|proxy|feed)="],
        "keywords": ["proxy", "fetch", "request", "url"],
        "historical_count": 7,
        "base_confidence": 0.5,
    },
    "host_header": {
        "keywords": ["host", "x-forwarded-host", "base href", "redirect"],
        "historical_count": 8,
        "base_confidence": 0.45,
    },
    "broken_link": {
        "keywords": ["twitter.com", "facebook.com", "youtube.com", "instagram.com"],
        "historical_count": 7,
        "base_confidence": 0.5,
    },
    "subdomain_takeover": {
        "keywords": ["cname", "dangling", "unclaimed"],
        "historical_count": 2,
        "base_confidence": 0.7,
    },
    "secret_exposure": {
        "patterns": [r"api[_-]?key", r"password\s*=", r"secret\s*=", r"AKIA", r"Bearer"],
        "historical_count": 145,
        "base_confidence": 0.75,
    },
    "authentication": {
        "url_patterns": [r"/admin", r"/login", r"/auth", r"/sso", r"/saml"],
        "keywords": ["bypass", "session", "token", "login", "password"],
        "historical_count": 25,
        "base_confidence": 0.55,
    },
    "rce": {
        "url_patterns": [r"upload", r"exec", r"cmd", r"shell", r"import"],
        "keywords": ["deserialization", "command", "exec", "runtime"],
        "historical_count": 14,
        "base_confidence": 0.5,
    },
    "file_upload": {
        "url_patterns": [r"upload", r"file", r"attachment"],
        "keywords": ["upload", "file", "multipart"],
        "historical_count": 3,
        "base_confidence": 0.5,
    },
    "graphql": {
        "url_patterns": [r"/graphql", r"__schema", r"query\s*\{"],
        "keywords": ["graphql", "introspection", "mutation"],
        "historical_count": 5,
        "base_confidence": 0.55,
    },
    "saml": {
        "url_patterns": [r"/saml", r"RelayState", r"EntityDescriptor"],
        "keywords": ["saml", "sso", "metadata", "assertion"],
        "historical_count": 2,
        "base_confidence": 0.6,
    },
    "clickjacking": {
        "keywords": ["iframe", "frame", "x-frame-options"],
        "historical_count": 5,
        "base_confidence": 0.45,
    },
    "cors": {
        "keywords": ["access-control", "cors", "origin"],
        "historical_count": 10,
        "base_confidence": 0.5,
    },
    "cache_poison": {
        "keywords": ["cache", "x-forwarded-host", "vary"],
        "historical_count": 3,
        "base_confidence": 0.45,
    },
    "ssti": {
        "url_patterns": [r"\{\{", r"\$\{", r"<%="],
        "keywords": ["template", "render", "jinja", "twig"],
        "historical_count": 4,
        "base_confidence": 0.5,
    },
    "lfi": {
        "url_patterns": [r"\.\./", r"file=", r"path=", r"document="],
        "keywords": ["include", "require", "file", "path"],
        "historical_count": 8,
        "base_confidence": 0.55,
    },
    "ldap_injection": {
        "url_patterns": [r"[?&](user|username|uid|cn|filter)=", r"/ldap", r"/adfs"],
        "keywords": ["ldap", "active directory", "bind", "dn"],
        "historical_count": 3,
        "base_confidence": 0.5,
    },
    "deserialization": {
        "url_patterns": [r"serialize", r"unmarshal", r"object", r"pickle"],
        "keywords": ["java.io", "unserialize", "pickle", "objectinputstream"],
        "historical_count": 6,
        "base_confidence": 0.55,
    },
    "jwt": {
        "url_patterns": [r"/api/", r"/auth", r"jwt", r"token", r"Bearer"],
        "keywords": ["jwt", "bearer", "authorization", "jwks", "alg"],
        "historical_count": 8,
        "base_confidence": 0.55,
    },
    "account_takeover": {
        "url_patterns": [r"/reset", r"/forgot", r"/password", r"/recover"],
        "keywords": ["reset", "forgot", "password", "recovery", "token"],
        "historical_count": 12,
        "base_confidence": 0.5,
    },
    # Weidman Ch.14 — Penetration Testing book signatures
    "xpath_injection": {
        "url_patterns": [r"/login", r"txtUser", r"txtPass", r"/signin", r"/auth"],
        "keywords": ["xpath", "xml", "login", "authenticate"],
        "historical_count": 4,
        "base_confidence": 0.6,
    },
    "csrf": {
        "url_patterns": [r"/login", r"/transfer", r"/account", r"/password"],
        "keywords": ["csrf", "token", "form", "post", "session"],
        "historical_count": 6,
        "base_confidence": 0.5,
    },
    "rfi": {
        "url_patterns": [r"[?&](file|include|page|path)=http", r"include\s*\(\s*\$_GET"],
        "keywords": ["include", "require", "remote", "php"],
        "historical_count": 3,
        "base_confidence": 0.55,
    },
    "cmdi": {
        "url_patterns": [r"[?&](cmd|exec|command|email|ping)=", r";&", r"\|"],
        "keywords": ["exec", "system", "shell", "command", "ipconfig"],
        "historical_count": 5,
        "base_confidence": 0.6,
    },
    "blind_sqli": {
        "url_patterns": [r"[?&](id|page|cat|user)=", r"bookdetail", r"\.aspx"],
        "keywords": ["database", "query", "sql", "id"],
        "historical_count": 4,
        "base_confidence": 0.55,
    },
}


class AIEngine:
    """Scores and classifies potential vulnerabilities using learned patterns."""

    def __init__(self):
        self.historical = self._load_history()
        self.theme_weights = Counter()
        for r in self.historical:
            title = (r.get("title") or "").lower()
            for vuln_type, sig in VULN_SIGNATURES.items():
                if any(kw in title for kw in sig.get("keywords", [])):
                    self.theme_weights[vuln_type] += 1

    def _load_history(self) -> list:
        if CROWDSTREAM.exists():
            with open(CROWDSTREAM) as f:
                return json.load(f)
        return []

    def score_url(self, url: str, page_content: str = "") -> list[dict]:
        """AI inference: score URL + content for vulnerability likelihood."""
        predictions = []
        combined = url + " " + page_content[:5000]

        for vuln_type, sig in VULN_SIGNATURES.items():
            score = sig["base_confidence"]
            evidence = []

            for pat in sig.get("url_patterns", []):
                if re.search(pat, url, re.I):
                    score += 0.15
                    evidence.append(f"URL matches {pat[:30]}")

            for pat in sig.get("sink_patterns", []):
                if re.search(pat, page_content):
                    score += 0.2
                    evidence.append(f"Sink pattern {pat[:25]}")

            for pat in sig.get("patterns", []):
                if re.search(pat, combined, re.I):
                    score += 0.25
                    evidence.append(f"Secret pattern {pat}")

            for kw in sig.get("keywords", []):
                if kw in combined.lower():
                    score += 0.05

            # Boost from historical frequency
            hist = self.theme_weights.get(vuln_type, 0)
            score += min(hist / 100, 0.15)

            score = min(score, 0.99)
            if score >= 0.45 and evidence:
                predictions.append({
                    "vuln_type": vuln_type,
                    "confidence": int(score * 100),
                    "url": url,
                    "evidence": "; ".join(evidence[:3]),
                    "historical_reports": hist,
                    "priority": self._estimate_priority(vuln_type, score),
                })

        predictions.sort(key=lambda x: -x["confidence"])
        return predictions

    def _estimate_priority(self, vuln_type: str, score: float) -> str:
        high = {"sqli", "rce", "secret_exposure", "idor", "subdomain_takeover",
                "xpath_injection", "cmdi", "rfi", "blind_sqli"}
        medium = {"xss", "open_redirect", "ssrf", "host_header", "csrf", "lfi"}
        if vuln_type in high and score >= 0.7:
            return "P2"
        if vuln_type in high or (vuln_type in medium and score >= 0.75):
            return "P3"
        if score >= 0.6:
            return "P4"
        return "P5"

    def rank_targets(self, urls: list[str]) -> list[str]:
        """Prioritize URLs for deep testing using AI scoring."""
        scored = []
        for url in urls:
            preds = self.score_url(url)
            max_conf = max((p["confidence"] for p in preds), default=0)
            scored.append((max_conf, url))
        scored.sort(reverse=True)
        return [u for _, u in scored]

    def generate_attack_payloads(self, vuln_type: str) -> list[dict]:
        """Return prioritized payloads for a vulnerability type."""
        from core.ai_exploiter import EXPLOIT_PAYLOADS, PARAM_MAP
        payloads = EXPLOIT_PAYLOADS.get(vuln_type, [])
        params = PARAM_MAP.get(vuln_type, ["id", "q", "url"])
        sig = VULN_SIGNATURES.get(vuln_type, {})
        weight = sig.get("base_confidence", 0.5)
        return [
            {"payload": p, "param": params[i % len(params)], "weight": weight}
            for i, p in enumerate(payloads[:6])
        ]

    def analyze_source_line(self, line: str, line_num: int, url: str) -> list[dict]:
        """Per-line AI analysis for downloaded source."""
        findings = []
        for vuln_type, sig in VULN_SIGNATURES.items():
            for pat in sig.get("patterns", []) + sig.get("sink_patterns", []):
                if re.search(pat, line, re.I):
                    conf = int(sig["base_confidence"] * 100) + 10
                    findings.append({
                        "vuln_type": vuln_type,
                        "confidence": min(conf, 95),
                        "url": url,
                        "line": line_num,
                        "content": line.strip()[:150],
                        "pattern": pat,
                        "priority": self._estimate_priority(vuln_type, conf / 100),
                    })
        return findings
