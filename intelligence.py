"""Crowdstream intelligence — drives super scanner check selection and prioritization."""

from __future__ import annotations

import json
import os
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field, asdict

CROWDSTREAM_PATH = os.path.join(os.path.dirname(__file__), "crowdstream_all.json")

THEME_KEYWORDS = {
    "cors": ["cors", "cross-origin"],
    "open_redirect": ["open redirect", "open redirection", "unvalidated redirect"],
    "xss": ["xss", "cross-site scripting", "scripting"],
    "idor": ["idor", "insecure direct object", "broken access control"],
    "sqli": ["sqli", "sql injection"],
    "ssrf": ["ssrf", "server-side request"],
    "host_header": ["host header", "x-forwarded-host", "base tag"],
    "broken_link": ["broken link", "link hijack", "hijacking"],
    "subdomain_takeover": ["subdomain takeover", "dangling"],
    "information_disclosure": ["information disclosure", "exposed", "exposure", "leak"],
    "authentication": ["authentication bypass", "login bypass", "account takeover", "session"],
    "clickjacking": ["clickjack", "frame"],
    "rce": ["rce", "remote code execution", "command injection"],
    "saml": ["saml", "relaystate", "relay state"],
    "file_upload": ["file upload", "arbitrary upload"],
}

# Domain-specific check profiles derived from 843 historical reports
DOMAIN_PROFILES: dict[str, dict] = {
    "globe.gov": {
        "priority": 1,
        "checks": [
            "cors_deep", "open_redirect_backurl", "open_redirect_liferay",
            "host_header", "clickjacking", "sensitive_files",
            "xss_reflected", "broken_links", "tls_dns",
        ],
        "api_paths": [
            "/o/headless-admin-user/v1.0/my-user-account",
            "/o/headless-admin-user/v1.0/user-accounts",
            "/api/jsonws/",
            "/user-teams-management",
            "/c/portal/login",
            "/group/control_panel/manage",
        ],
        "redirect_params": ["backUrl", "redirect", "returnUrl", "next", "url"],
    },
    "nasa.gov": {
        "priority": 2,
        "checks": [
            "open_redirect", "saml_relay", "broken_links", "host_header",
            "clickjacking", "sensitive_files", "xss_reflected",
            "subdomain_takeover", "cookie_security", "tls_dns",
        ],
        "redirect_params": ["url", "redirect", "next", "return", "returnUrl", "RelayState", "redirect_uri"],
    },
    "usgeo.gov": {
        "priority": 3,
        "checks": ["open_redirect", "clickjacking", "sensitive_files", "cors_deep", "tls_dns"],
        "redirect_params": ["url", "redirect", "next"],
    },
    "nspires.nasaprs.com": {
        "priority": 4,
        "checks": ["open_redirect", "clickjacking", "sensitive_files", "cookie_security", "tls_dns"],
        "redirect_params": ["url", "redirect", "next", "returnUrl"],
    },
    "nsc.nasa.gov": {
        "priority": 5,
        "checks": ["open_redirect", "clickjacking", "sensitive_files", "tls_dns"],
        "redirect_params": ["url", "redirect", "next"],
    },
}


@dataclass
class IntelligenceModel:
    total_reports: int = 0
    disclosed: int = 0
    unresolved: int = 0
    theme_counts: dict = field(default_factory=dict)
    domain_reports: dict = field(default_factory=dict)
    unresolved_reports: list = field(default_factory=list)
    historical_patterns: list = field(default_factory=list)
    priority_targets: list = field(default_factory=list)
    domain_profiles: dict = field(default_factory=dict)
    trained: bool = False


_model: IntelligenceModel | None = None
_reports: list = []


def train_model() -> IntelligenceModel:
    global _model, _reports

    themes = Counter()
    domain_reports: dict[str, list] = defaultdict(list)
    unresolved_reports = []
    patterns = []

    if os.path.exists(CROWDSTREAM_PATH):
        with open(CROWDSTREAM_PATH) as f:
            _reports = json.load(f)
    else:
        _reports = []

    for r in _reports:
        title = (r.get("title") or "").lower()
        target = (r.get("target") or "").lower()

        domain_key = "other"
        for d in DOMAIN_PROFILES:
            if d.replace(".gov", "") in target or d in title:
                domain_key = d
                break
        if "nasa" in target and domain_key == "other":
            domain_key = "nasa.gov"

        if r.get("title"):
            domain_reports[domain_key].append({
                "title": r.get("title"),
                "priority": r.get("priority"),
                "substate": r.get("substate"),
                "target": r.get("target"),
            })

        for theme, keywords in THEME_KEYWORDS.items():
            if any(kw in title for kw in keywords):
                themes[theme] += 1
                if r.get("title") and (r.get("priority") or 5) <= 4:
                    patterns.append({
                        "theme": theme,
                        "title": r.get("title"),
                        "priority": r.get("priority"),
                        "domain": domain_key,
                        "substate": r.get("substate"),
                    })

        if r.get("substate") == "unresolved" and r.get("title"):
            unresolved_reports.append({
                "title": r.get("title"),
                "target": r.get("target"),
                "priority": r.get("priority"),
                "url": r.get("disclosure_report_url"),
            })

    _model = IntelligenceModel(
        total_reports=len(_reports),
        disclosed=sum(1 for r in _reports if r.get("disclosed")),
        unresolved=len(unresolved_reports),
        theme_counts=dict(themes.most_common()),
        domain_reports={k: v[:15] for k, v in domain_reports.items()},
        unresolved_reports=unresolved_reports,
        historical_patterns=sorted(patterns, key=lambda x: x.get("priority") or 9)[:40],
        priority_targets=sorted(DOMAIN_PROFILES.keys(), key=lambda d: DOMAIN_PROFILES[d]["priority"]),
        domain_profiles=DOMAIN_PROFILES,
        trained=True,
    )
    return _model


def get_model() -> IntelligenceModel:
    global _model
    if _model is None or not _model.trained:
        return train_model()
    return _model


def get_model_dict() -> dict:
    return asdict(get_model())


def get_profile(domain: str) -> dict:
    for key, profile in DOMAIN_PROFILES.items():
        if key in domain:
            return profile
    return DOMAIN_PROFILES.get("nasa.gov", {"checks": ["open_redirect", "tls_dns"], "redirect_params": ["url"]})


def estimate_priority(category: str, verified: bool, browser_exploitable: bool) -> str:
    """Estimate NASA Bugcrowd P-level based on category and verification."""
    if not verified:
        return "P5"
    high_impact = {"idor", "sqli", "rce", "authentication", "saml", "file_upload"}
    medium_impact = {"xss", "open_redirect", "clickjacking", "host_header", "broken_link", "subdomain_takeover"}
    cat = category.lower()
    if browser_exploitable:
        if any(k in cat for k in ["idor", "sqli", "rce", "authentication", "saml"]):
            return "P2"
        if any(k in cat for k in ["xss", "open redirect", "clickjacking", "broken link", "host header"]):
            return "P3"
        if "information disclosure" in cat:
            return "P3"
        return "P4"
    if any(k in cat for k in high_impact):
        return "P4"
    if any(k in cat for k in medium_impact):
        return "P5"
    return "P5"


def build_submission_report(finding: dict, exploit: dict) -> str:
    """Generate Bugcrowd-ready report template."""
    return f"""## Summary
{finding.get('title', 'Security Vulnerability')}

## Target
{finding.get('target', '')}

## Severity Estimate
{exploit.get('estimated_priority', finding.get('estimated_priority', 'P4'))}

## Description
{finding.get('description', '')}

## Steps to Reproduce
1. Navigate to {finding.get('target', '')}
2. {exploit.get('reproduction_steps', finding.get('reproduction_steps', 'See evidence below'))}

## Evidence
{exploit.get('evidence', finding.get('evidence', ''))}

## Impact
{exploit.get('impact', finding.get('impact', 'Potential security impact on NASA in-scope asset.'))}

## Remediation
{finding.get('remediation', '')}

## Verification
- Server confirmed: {exploit.get('server_confirmed', False)}
- Browser exploitable: {exploit.get('browser_exploitable', False)}
- Confidence: {exploit.get('confidence', 0)}%

---
Submit to: https://bugcrowd.com/engagements/nasa-vdp
"""
