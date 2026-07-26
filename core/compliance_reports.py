"""Multi-standard compliance report generator — ISO, NIST, CVSS, PCI-DSS, OWASP, GDPR, SOC 2."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from html import escape
from typing import Any

from core.config import PRODUCT_NAME, PRODUCT_VERSION, REPORTS_DIR

# ── Standard catalogue (globally recognized frameworks) ──────────────────────

REPORT_STANDARDS: dict[str, dict] = {
    "iso27001": {
        "id": "iso27001",
        "name": "ISO/IEC 27001:2022",
        "subtitle": "Information Security Management System (ISMS) Audit",
        "region": "International (ISO)",
        "acceptance": "USA, EU, UK, APAC — globally recognized certification standard",
        "format": "Annex A control assessment with findings mapping",
    },
    "iso27005": {
        "id": "iso27005",
        "name": "ISO/IEC 27005:2022",
        "subtitle": "Information Security Risk Management",
        "region": "International (ISO)",
        "acceptance": "Risk assessment reports for enterprise procurement worldwide",
        "format": "Risk register with likelihood × impact scoring",
    },
    "iso29147": {
        "id": "iso29147",
        "name": "ISO/IEC 29147:2018",
        "subtitle": "Vulnerability Disclosure",
        "region": "International (ISO)",
        "acceptance": "Standardized vulnerability disclosure for vendors and CERTs",
        "format": "Structured vulnerability disclosure document",
    },
    "nist_csf": {
        "id": "nist_csf",
        "name": "NIST CSF 2.0",
        "subtitle": "Cybersecurity Framework",
        "region": "United States (NIST)",
        "acceptance": "Federal contractors, CISA, critical infrastructure, US enterprise",
        "format": "Identify · Protect · Detect · Respond · Recover mapping",
    },
    "nist_800_53": {
        "id": "nist_800_53",
        "name": "NIST SP 800-53 Rev 5",
        "subtitle": "Security and Privacy Controls",
        "region": "United States (NIST/FedRAMP)",
        "acceptance": "US federal systems, FedRAMP, DoD RMF, state agencies",
        "format": "Control family findings with implementation status",
    },
    "cvss31": {
        "id": "cvss31",
        "name": "CVSS v3.1",
        "subtitle": "Common Vulnerability Scoring System",
        "region": "International (FIRST.org)",
        "acceptance": "CVE/NVD, US-CERT, global vulnerability databases",
        "format": "Base/Temporal/Environmental vector scoring per finding",
    },
    "pci_dss": {
        "id": "pci_dss",
        "name": "PCI DSS v4.0",
        "subtitle": "Payment Card Industry Data Security Standard",
        "region": "International (PCI SSC)",
        "acceptance": "Payment processors, merchants, fintech — global card industry",
        "format": "Requirement mapping with compliance gaps",
    },
    "owasp_asvs": {
        "id": "owasp_asvs",
        "name": "OWASP ASVS 4.0",
        "subtitle": "Application Security Verification Standard",
        "region": "International (OWASP)",
        "acceptance": "AppSec audits, DevSecOps, software procurement worldwide",
        "format": "Verification level mapping per vulnerability class",
    },
    "gdpr": {
        "id": "gdpr",
        "name": "GDPR Art. 32 / 33",
        "subtitle": "EU General Data Protection Regulation",
        "region": "European Union",
        "acceptance": "EU/EEA data controllers, UK GDPR, global companies serving EU citizens",
        "format": "Personal data breach risk and security measure assessment",
    },
    "soc2": {
        "id": "soc2",
        "name": "SOC 2 Type II",
        "subtitle": "Trust Services Criteria (AICPA)",
        "region": "United States (AICPA)",
        "acceptance": "SaaS vendors, US enterprise procurement, investor due diligence",
        "format": "Security · Availability · Confidentiality criteria mapping",
    },
    "bugcrowd": {
        "id": "bugcrowd",
        "name": "Bug Bounty / VDP",
        "subtitle": "Responsible Disclosure Report",
        "region": "International",
        "acceptance": "Bugcrowd, HackerOne, NASA VDP, vendor security programs",
        "format": "Submission-ready vulnerability report",
    },
}

# ── Category → compliance mapping ────────────────────────────────────────────

_CATEGORY_MAP: dict[str, dict] = {
    "xss": {
        "cwe": "CWE-79", "cwe_name": "Cross-site Scripting",
        "iso27001": ["A.8.25", "A.8.26"], "iso27001_desc": "Secure development / security testing",
        "nist_csf": ["PR.DS-6", "PR.IP-2"], "nist_800_53": ["SI-10", "SA-11"],
        "pci_dss": ["6.2.4", "6.4.1"], "owasp_asvs": ["V5.3", "V14.4"],
        "gdpr": ["Art. 32(1)(b)"], "soc2": ["CC6.1", "CC7.1"],
        "cvss_base": 6.1, "cvss_vector": "AV:N/AC:L/PR:N/UI:R/S:C/C:L/I:L/A:N",
    },
    "sqli": {
        "cwe": "CWE-89", "cwe_name": "SQL Injection",
        "iso27001": ["A.8.25", "A.8.28"], "iso27001_desc": "Secure coding / secure development",
        "nist_csf": ["PR.DS-6", "DE.CM-4"], "nist_800_53": ["SI-10", "RA-5"],
        "pci_dss": ["6.2.4", "6.5.1"], "owasp_asvs": ["V5.3", "V13.1"],
        "gdpr": ["Art. 32(1)(b)", "Art. 33"], "soc2": ["CC6.1", "CC6.7"],
        "cvss_base": 9.8, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    },
    "ssrf": {
        "cwe": "CWE-918", "cwe_name": "Server-Side Request Forgery",
        "iso27001": ["A.8.20", "A.8.22"], "nist_csf": ["PR.AC-5", "DE.CM-1"],
        "nist_800_53": ["SC-7", "SI-10"], "pci_dss": ["1.3.1", "6.2.4"],
        "owasp_asvs": ["V13.2", "V14.5"], "gdpr": ["Art. 32"], "soc2": ["CC6.6"],
        "cvss_base": 9.1, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    },
    "open redirect": {
        "cwe": "CWE-601", "cwe_name": "Open Redirect",
        "iso27001": ["A.8.25"], "nist_csf": ["PR.DS-6"], "nist_800_53": ["SI-10"],
        "pci_dss": ["6.2.4"], "owasp_asvs": ["V5.5"], "gdpr": ["Art. 32"],
        "soc2": ["CC6.1"], "cvss_base": 4.7, "cvss_vector": "AV:N/AC:L/PR:N/UI:R/S:C/C:N/I:L/A:N",
    },
    "cors": {
        "cwe": "CWE-942", "cwe_name": "Overly Permissive CORS",
        "iso27001": ["A.8.20", "A.8.26"], "nist_csf": ["PR.AC-5"], "nist_800_53": ["AC-3", "SC-7"],
        "pci_dss": ["1.3.1", "6.4.1"], "owasp_asvs": ["V14.5"], "gdpr": ["Art. 32"],
        "soc2": ["CC6.1", "CC6.6"], "cvss_base": 7.4, "cvss_vector": "AV:N/AC:L/PR:N/UI:R/S:C/C:H/I:L/A:N",
    },
    "idor": {
        "cwe": "CWE-639", "cwe_name": "Insecure Direct Object Reference",
        "iso27001": ["A.8.3", "A.5.15"], "nist_csf": ["PR.AC-4"], "nist_800_53": ["AC-3", "AC-6"],
        "pci_dss": ["7.2.1", "8.3.1"], "owasp_asvs": ["V4.1", "V4.2"], "gdpr": ["Art. 32", "Art. 5(1)(f)"],
        "soc2": ["CC6.1", "CC6.3"], "cvss_base": 6.5, "cvss_vector": "AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
    },
    "rce": {
        "cwe": "CWE-78", "cwe_name": "OS Command Injection",
        "iso27001": ["A.8.25", "A.8.28"], "nist_csf": ["PR.DS-6", "RS.MI-1"],
        "nist_800_53": ["SI-10", "CM-7"], "pci_dss": ["6.2.4", "2.2.4"],
        "owasp_asvs": ["V5.3", "V14.2"], "gdpr": ["Art. 32", "Art. 33", "Art. 34"],
        "soc2": ["CC6.1", "CC7.2"], "cvss_base": 9.8, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    },
    "xxe": {
        "cwe": "CWE-611", "cwe_name": "XML External Entity Injection",
        "iso27001": ["A.8.25"], "nist_csf": ["PR.DS-6"], "nist_800_53": ["SI-10"],
        "pci_dss": ["6.2.4"], "owasp_asvs": ["V5.5"], "gdpr": ["Art. 32", "Art. 33"],
        "soc2": ["CC6.1"], "cvss_base": 9.1, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    },
    "ssti": {
        "cwe": "CWE-1336", "cwe_name": "Server-Side Template Injection",
        "iso27001": ["A.8.25"], "nist_csf": ["PR.DS-6"], "nist_800_53": ["SI-10"],
        "pci_dss": ["6.2.4"], "owasp_asvs": ["V5.3"], "gdpr": ["Art. 32"],
        "soc2": ["CC6.1"], "cvss_base": 9.8, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H",
    },
    "lfi": {
        "cwe": "CWE-22", "cwe_name": "Path Traversal",
        "iso27001": ["A.8.25", "A.8.12"], "nist_csf": ["PR.DS-6"], "nist_800_53": ["SI-10", "AC-3"],
        "pci_dss": ["6.2.4", "7.1.1"], "owasp_asvs": ["V12.1"], "gdpr": ["Art. 32", "Art. 33"],
        "soc2": ["CC6.1", "CC6.7"], "cvss_base": 7.5, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N",
    },
    "information disclosure": {
        "cwe": "CWE-200", "cwe_name": "Information Exposure",
        "iso27001": ["A.8.12", "A.5.33"], "nist_csf": ["PR.DS-1", "DE.CM-8"],
        "nist_800_53": ["SC-28", "SI-11"], "pci_dss": ["3.4", "6.5.3"],
        "owasp_asvs": ["V7.1", "V14.3"], "gdpr": ["Art. 5(1)(f)", "Art. 32", "Art. 33"],
        "soc2": ["CC6.1", "CC6.7"], "cvss_base": 5.3, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    },
    "authentication": {
        "cwe": "CWE-287", "cwe_name": "Improper Authentication",
        "iso27001": ["A.8.5", "A.5.17"], "nist_csf": ["PR.AC-1", "PR.AC-7"],
        "nist_800_53": ["IA-2", "IA-5", "AC-2"], "pci_dss": ["8.3.1", "8.6.1"],
        "owasp_asvs": ["V2.1", "V2.2"], "gdpr": ["Art. 32"], "soc2": ["CC6.1", "CC6.2"],
        "cvss_base": 9.1, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    },
    "csrf": {
        "cwe": "CWE-352", "cwe_name": "Cross-Site Request Forgery",
        "iso27001": ["A.8.25"], "nist_csf": ["PR.DS-6"], "nist_800_53": ["SI-10"],
        "pci_dss": ["6.2.4"], "owasp_asvs": ["V4.2"], "gdpr": ["Art. 32"],
        "soc2": ["CC6.1"], "cvss_base": 6.5, "cvss_vector": "AV:N/AC:L/PR:N/UI:R/S:U/C:N/I:H/A:N",
    },
    "nosql injection": {
        "cwe": "CWE-943", "cwe_name": "NoSQL Injection",
        "iso27001": ["A.8.25"], "nist_csf": ["PR.DS-6"], "nist_800_53": ["SI-10"],
        "pci_dss": ["6.2.4"], "owasp_asvs": ["V5.3"], "gdpr": ["Art. 32", "Art. 33"],
        "soc2": ["CC6.1"], "cvss_base": 9.1, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
    },
    "subdomain takeover": {
        "cwe": "CWE-350", "cwe_name": "Reliance on Reverse DNS",
        "iso27001": ["A.8.20", "A.8.9"], "nist_csf": ["PR.DS-2"], "nist_800_53": ["SC-20", "CM-8"],
        "pci_dss": ["2.2.4"], "owasp_asvs": ["V14.5"], "gdpr": ["Art. 32"],
        "soc2": ["CC6.6"], "cvss_base": 8.1, "cvss_vector": "AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
    },
    "graphql": {
        "cwe": "CWE-200", "cwe_name": "GraphQL Introspection Exposure",
        "iso27001": ["A.8.12", "A.8.25"], "nist_csf": ["PR.DS-6"], "nist_800_53": ["SI-11"],
        "pci_dss": ["6.2.4"], "owasp_asvs": ["V13.1", "V14.5"], "gdpr": ["Art. 32"],
        "soc2": ["CC6.1"], "cvss_base": 5.3, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N",
    },
    "cache poison": {
        "cwe": "CWE-444", "cwe_name": "HTTP Request Smuggling / Cache Poisoning",
        "iso27001": ["A.8.20"], "nist_csf": ["PR.DS-6"], "nist_800_53": ["SC-8"],
        "pci_dss": ["6.4.1"], "owasp_asvs": ["V14.5"], "gdpr": ["Art. 32"],
        "soc2": ["CC6.6"], "cvss_base": 7.5, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:N/I:H/A:N",
    },
    "session security": {
        "cwe": "CWE-614", "cwe_name": "Sensitive Cookie Without Secure Attribute",
        "iso27001": ["A.8.5", "A.8.24"], "nist_csf": ["PR.AC-7"], "nist_800_53": ["SC-23", "IA-5"],
        "pci_dss": ["4.2.1", "8.3.1"], "owasp_asvs": ["V3.4"], "gdpr": ["Art. 32"],
        "soc2": ["CC6.1"], "cvss_base": 4.3, "cvss_vector": "AV:N/AC:L/PR:N/UI:R/S:U/C:L/I:N/A:N",
    },
    "broken access control": {
        "cwe": "CWE-284", "cwe_name": "Improper Access Control",
        "iso27001": ["A.8.3", "A.5.15"], "nist_csf": ["PR.AC-4"], "nist_800_53": ["AC-3", "AC-6"],
        "pci_dss": ["7.2.1"], "owasp_asvs": ["V4.1"], "gdpr": ["Art. 32", "Art. 5(1)(f)"],
        "soc2": ["CC6.1", "CC6.3"], "cvss_base": 6.5, "cvss_vector": "AV:N/AC:L/PR:L/UI:N/S:U/C:H/I:N/A:N",
    },
    "account takeover": {
        "cwe": "CWE-640", "cwe_name": "Weak Password Recovery",
        "iso27001": ["A.8.5", "A.5.17"], "nist_csf": ["PR.AC-1"], "nist_800_53": ["IA-5", "AC-7"],
        "pci_dss": ["8.3.1", "8.4.1"], "owasp_asvs": ["V2.5"], "gdpr": ["Art. 32", "Art. 33"],
        "soc2": ["CC6.1"], "cvss_base": 8.1, "cvss_vector": "AV:N/AC:H/PR:N/UI:N/S:U/C:H/I:H/A:H",
    },
}

_DEFAULT_MAP = {
    "cwe": "CWE-1035", "cwe_name": "Software Weakness",
    "iso27001": ["A.8.25"], "iso27001_desc": "Secure development lifecycle",
    "nist_csf": ["PR.DS-6"], "nist_800_53": ["SI-10"],
    "pci_dss": ["6.2.4"], "owasp_asvs": ["V14.2"],
    "gdpr": ["Art. 32"], "soc2": ["CC6.1"],
    "cvss_base": 5.0, "cvss_vector": "AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:L/A:N",
}


def _map_category(category: str) -> dict:
    cat = (category or "").lower()
    for key, mapping in _CATEGORY_MAP.items():
        if key in cat:
            return mapping
    return _DEFAULT_MAP


def _cvss_rating(score: float) -> str:
    if score >= 9.0:
        return "Critical"
    if score >= 7.0:
        return "High"
    if score >= 4.0:
        return "Medium"
    if score >= 0.1:
        return "Low"
    return "None"


def _risk_level(severity: str, confidence: int) -> str:
    s = (severity or "medium").lower()
    if s == "critical" and confidence >= 75:
        return "Critical"
    if s in ("critical", "high") and confidence >= 70:
        return "High"
    if s == "medium":
        return "Medium"
    return "Low"


def _enrich_finding(finding: dict, exploit: dict | None = None) -> dict:
    exploit = exploit or {}
    cat = finding.get("category", "")
    m = _map_category(cat)
    conf = exploit.get("confidence") or finding.get("confidence") or 0
    sev = finding.get("severity", "medium")
    cvss = m["cvss_base"]
    if sev == "critical":
        cvss = min(10.0, cvss + 0.5)
    elif sev == "low":
        cvss = max(0.1, cvss - 1.5)
    return {
        **finding,
        "cwe": m["cwe"],
        "cwe_name": m["cwe_name"],
        "cvss_score": round(cvss, 1),
        "cvss_rating": _cvss_rating(cvss),
        "cvss_vector": m["cvss_vector"],
        "iso27001_controls": m["iso27001"],
        "nist_csf": m["nist_csf"],
        "nist_800_53": m["nist_800_53"],
        "pci_dss": m["pci_dss"],
        "owasp_asvs": m["owasp_asvs"],
        "gdpr_articles": m["gdpr"],
        "soc2_criteria": m["soc2"],
        "risk_level": _risk_level(sev, conf),
        "verified": bool(exploit.get("submission_ready") or finding.get("submission_ready")),
        "confidence": conf,
    }


def list_standards() -> list[dict]:
    return list(REPORT_STANDARDS.values())


def _scan_meta(scan_result: dict) -> dict:
    stats = scan_result.get("stats") or {}
    return {
        "product": PRODUCT_NAME,
        "version": PRODUCT_VERSION,
        "scan_id": scan_result.get("scan_id", ""),
        "target_domain": scan_result.get("target_domain", stats.get("target_domain", "")),
        "started_at": scan_result.get("started_at", ""),
        "completed_at": scan_result.get("completed_at", datetime.now(timezone.utc).isoformat()),
        "total_findings": stats.get("total_analyzed", len(scan_result.get("findings", []))),
        "verified_count": stats.get("verified_exploitable", len(scan_result.get("verified_findings", []))),
        "risk_score": stats.get("risk_score", 0),
        "mega_checks": stats.get("mega_checks_run", 0),
    }


def _get_enriched_findings(scan_result: dict) -> list[dict]:
    findings = scan_result.get("findings", [])
    exploits = {e["finding_id"]: e for e in scan_result.get("exploit_results", [])}
    verified_ids = {f["id"] for f in scan_result.get("verified_findings", [])}
    enriched = []
    for f in findings:
        exp = exploits.get(f.get("id"), {})
        ef = _enrich_finding(f, exp)
        if f.get("id") in verified_ids:
            ef["verified"] = True
        enriched.append(ef)
    return enriched


# ── Per-standard report builders ─────────────────────────────────────────────

def _report_iso27001(meta: dict, findings: list[dict]) -> str:
    verified = [f for f in findings if f.get("verified")]
    controls: dict[str, list] = {}
    for f in verified:
        for ctrl in f.get("iso27001_controls", []):
            controls.setdefault(ctrl, []).append(f)

    lines = [
        "═" * 72,
        "ISO/IEC 27001:2022 — INFORMATION SECURITY MANAGEMENT SYSTEM AUDIT REPORT",
        "═" * 72,
        f"Report ID      : CS-{meta['scan_id']}",
        f"Organization   : {meta['target_domain']}",
        f"Assessment Tool: {meta['product']} v{meta['version']}",
        f"Assessment Date: {meta['completed_at'][:10]}",
        f"Standard       : ISO/IEC 27001:2022 Annex A",
        f"Scope          : External vulnerability assessment — {meta['target_domain']}",
        "─" * 72,
        "EXECUTIVE SUMMARY",
        f"  Total findings assessed : {meta['total_findings']}",
        f"  Verified non-conformities: {len(verified)}",
        f"  Overall risk score      : {meta['risk_score']}/100",
        f"  Assessment conclusion   : {'NON-CONFORMING' if verified else 'NO CRITICAL NON-CONFORMITIES DETECTED'}",
        "─" * 72,
        "ANNEX A CONTROL ASSESSMENT",
    ]
    if not controls:
        lines.append("  No verified non-conformities mapped to Annex A controls.")
    for ctrl, items in sorted(controls.items()):
        lines.append(f"\n  Control {ctrl} — NON-CONFORMING ({len(items)} finding(s))")
        for f in items[:5]:
            lines.append(f"    • [{f['cvss_rating']}] {f['title']}")
            lines.append(f"      Target: {f.get('target', '')}")
            lines.append(f"      CWE: {f['cwe']} ({f['cwe_name']}) | CVSS: {f['cvss_score']}")
            lines.append(f"      Remediation: {f.get('remediation', 'Implement control per ISO 27001 Annex A')[:120]}")
    lines += [
        "─" * 72,
        "CERTIFICATION READINESS",
        "  This report maps findings to ISO/IEC 27001:2022 Annex A controls.",
        "  Accepted for ISMS audits in USA, EU, UK, APAC, and Middle East.",
        "  For formal certification, engage an accredited ISO 27001 certification body.",
        "═" * 72,
    ]
    return "\n".join(lines)


def _report_iso27005(meta: dict, findings: list[dict]) -> str:
    verified = [f for f in findings if f.get("verified")]
    lines = [
        "═" * 72,
        "ISO/IEC 27005:2022 — INFORMATION SECURITY RISK ASSESSMENT REPORT",
        "═" * 72,
        f"Report ID    : CS-RISK-{meta['scan_id']}",
        f"Asset        : {meta['target_domain']}",
        f"Date         : {meta['completed_at'][:10]}",
        f"Methodology  : Automated vulnerability assessment + exploit verification",
        "─" * 72,
        "RISK REGISTER",
        f"{'ID':<6} {'Risk':<10} {'CVSS':<6} {'CWE':<10} {'Title':<40}",
        "─" * 72,
    ]
    for i, f in enumerate(verified[:50], 1):
        title = (f.get("title") or "")[:38]
        lines.append(f"R{i:<5} {f['risk_level']:<10} {f['cvss_score']:<6} {f['cwe']:<10} {title}")
    lines += [
        "─" * 72,
        "RISK TREATMENT RECOMMENDATIONS",
        f"  Critical/High risks requiring immediate treatment: {sum(1 for f in verified if f['risk_level'] in ('Critical','High'))}",
        f"  Medium risks for planned remediation: {sum(1 for f in verified if f['risk_level'] == 'Medium')}",
        "  Treatment options: Mitigate · Transfer · Accept · Avoid (per ISO 27005 Clause 8)",
        "═" * 72,
    ]
    return "\n".join(lines)


def _report_iso29147(meta: dict, findings: list[dict]) -> str:
    verified = [f for f in findings if f.get("verified")]
    lines = [
        "═" * 72,
        "ISO/IEC 29147:2018 — VULNERABILITY DISCLOSURE REPORT",
        "═" * 72,
        f"Document ID  : VDR-{meta['scan_id']}",
        f"Vendor/System: {meta['target_domain']}",
        f"Reporter     : {meta['product']} Automated Assessment",
        f"Date         : {meta['completed_at'][:10]}",
        f"Status       : {'VULNERABILITIES CONFIRMED' if verified else 'NO CONFIRMED VULNERABILITIES'}",
        "─" * 72,
    ]
    for i, f in enumerate(verified, 1):
        lines += [
            f"VULNERABILITY #{i}",
            f"  Title       : {f.get('title', '')}",
            f"  Product     : {meta['target_domain']}",
            f"  CWE         : {f['cwe']} — {f['cwe_name']}",
            f"  CVSS v3.1   : {f['cvss_score']} ({f['cvss_rating']}) — {f['cvss_vector']}",
            f"  Target URL  : {f.get('target', '')}",
            f"  Description : {f.get('description', '')[:200]}",
            f"  Evidence    : {(f.get('evidence') or '')[:250]}",
            f"  Remediation : {f.get('remediation', '')[:200]}",
            "─" * 72,
        ]
    lines.append("Per ISO/IEC 29147 — coordinate disclosure timeline with vendor security team.")
    return "\n".join(lines)


def _report_nist_csf(meta: dict, findings: list[dict]) -> str:
    verified = [f for f in findings if f.get("verified")]
    functions = {"Identify": [], "Protect": [], "Detect": [], "Respond": [], "Recover": []}
    fn_map = {
        "PR.": "Protect", "DE.": "Detect", "RS.": "Respond", "RC.": "Recover", "ID.": "Identify",
    }
    for f in verified:
        for sub in f.get("nist_csf", []):
            fn = "Protect"
            for prefix, name in fn_map.items():
                if sub.startswith(prefix):
                    fn = name
            functions[fn].append({**f, "subcategory": sub})

    lines = [
        "═" * 72,
        "NIST CYBERSECURITY FRAMEWORK (CSF) 2.0 — ASSESSMENT REPORT",
        "═" * 72,
        f"Organization : {meta['target_domain']}",
        f"Assessment   : {meta['completed_at'][:10]}",
        f"Tool         : {meta['product']} v{meta['version']}",
        f"Framework    : NIST CSF 2.0 (US — CISA recommended)",
        "─" * 72,
    ]
    for fn, items in functions.items():
        lines.append(f"\n{fn.upper()} — {len(items)} gap(s)")
        for f in items[:4]:
            lines.append(f"  [{f['subcategory']}] {f['title']} (CVSS {f['cvss_score']})")
    lines += [
        "─" * 72,
        "US FEDERAL ACCEPTANCE: NIST CSF is required for federal agencies (EO 13800)",
        "and widely adopted by US critical infrastructure and enterprise.",
        "═" * 72,
    ]
    return "\n".join(lines)


def _report_nist_800_53(meta: dict, findings: list[dict]) -> str:
    verified = [f for f in findings if f.get("verified")]
    controls: dict[str, list] = {}
    for f in verified:
        for c in f.get("nist_800_53", []):
            controls.setdefault(c, []).append(f)

    lines = [
        "═" * 72,
        "NIST SP 800-53 REVISION 5 — SECURITY CONTROL ASSESSMENT",
        "═" * 72,
        f"System       : {meta['target_domain']}",
        f"Assessment   : {meta['completed_at'][:10]}",
        f"Baseline     : Moderate (recommended for web applications)",
        f"Findings     : {len(verified)} control deficiencies",
        "─" * 72,
    ]
    for ctrl, items in sorted(controls.items()):
        lines.append(f"  {ctrl} — NOT SATISFIED ({len(items)} finding(s))")
        for f in items[:3]:
            lines.append(f"    • {f['title']} | CWE-{f['cwe']} | CVSS {f['cvss_score']}")
    lines += [
        "─" * 72,
        "Accepted for: FedRAMP · DoD RMF · FISMA · US state government systems",
        "═" * 72,
    ]
    return "\n".join(lines)


def _report_cvss31(meta: dict, findings: list[dict]) -> str:
    verified = [f for f in findings if f.get("verified")]
    lines = [
        "═" * 72,
        "CVSS v3.1 VULNERABILITY SCORING REPORT (FIRST.org / NVD Compatible)",
        "═" * 72,
        f"Target  : {meta['target_domain']}",
        f"Date    : {meta['completed_at'][:10]}",
        f"Scored  : {len(verified)} verified vulnerabilities",
        "─" * 72,
        f"{'CVSS':<6} {'Rating':<10} {'CWE':<10} {'Vector':<35} {'Title'}",
        "─" * 72,
    ]
    for f in sorted(verified, key=lambda x: -x["cvss_score"]):
        vec = f["cvss_vector"][:33]
        title = (f.get("title") or "")[:30]
        lines.append(f"{f['cvss_score']:<6} {f['cvss_rating']:<10} {f['cwe']:<10} {vec:<35} {title}")
    crit = sum(1 for f in verified if f["cvss_rating"] == "Critical")
    high = sum(1 for f in verified if f["cvss_rating"] == "High")
    lines += [
        "─" * 72,
        f"Summary: {crit} Critical · {high} High · {len(verified)-crit-high} Medium/Low",
        "CVSS v3.1 is the global standard used by CVE, NVD, US-CERT, and CERT-EU.",
        "═" * 72,
    ]
    return "\n".join(lines)


def _report_pci_dss(meta: dict, findings: list[dict]) -> str:
    verified = [f for f in findings if f.get("verified")]
    reqs: dict[str, list] = {}
    for f in verified:
        for r in f.get("pci_dss", []):
            reqs.setdefault(r, []).append(f)

    lines = [
        "═" * 72,
        "PCI DSS v4.0 — COMPLIANCE GAP ASSESSMENT",
        "═" * 72,
        f"Entity       : {meta['target_domain']}",
        f"Assessment   : {meta['completed_at'][:10]}",
        f"SAQ Type     : Recommended SAQ A-EP / D based on architecture",
        f"Gaps Found   : {len(reqs)} requirement areas affected",
        "─" * 72,
    ]
    for req, items in sorted(reqs.items()):
        lines.append(f"  Requirement {req} — GAP ({len(items)} finding(s))")
        for f in items[:2]:
            lines.append(f"    • {f['title']}")
    lines += [
        "─" * 72,
        "PCI DSS is mandatory for all entities storing, processing, or transmitting",
        "cardholder data — accepted globally by Visa, Mastercard, Amex, Discover.",
        "═" * 72,
    ]
    return "\n".join(lines)


def _report_owasp_asvs(meta: dict, findings: list[dict]) -> str:
    verified = [f for f in findings if f.get("verified")]
    chapters: dict[str, list] = {}
    for f in verified:
        for ch in f.get("owasp_asvs", []):
            chapters.setdefault(ch, []).append(f)

    lines = [
        "═" * 72,
        "OWASP ASVS 4.0 — APPLICATION SECURITY VERIFICATION REPORT",
        "═" * 72,
        f"Application  : {meta['target_domain']}",
        f"Date         : {meta['completed_at'][:10]}",
        f"Target Level : Level 2 (Standard web applications)",
        f"Failures     : {len(chapters)} verification requirements failed",
        "─" * 72,
    ]
    for ch, items in sorted(chapters.items()):
        lines.append(f"  {ch} — FAILED ({len(items)} finding(s))")
        for f in items[:2]:
            lines.append(f"    • [{f['cvss_rating']}] {f['title']}")
    lines += [
        "─" * 72,
        "OWASP ASVS is the global standard for application security procurement",
        "and DevSecOps verification — accepted in USA, EU, and worldwide.",
        "═" * 72,
    ]
    return "\n".join(lines)


def _report_gdpr(meta: dict, findings: list[dict]) -> str:
    verified = [f for f in findings if f.get("verified")]
    pii_risks = [f for f in verified if any(
        k in (f.get("category", "") + f.get("title", "")).lower()
        for k in ("idor", "disclosure", "sqli", "ssrf", "authentication", "account", "session", "cors")
    )]
    lines = [
        "═" * 72,
        "GDPR COMPLIANCE IMPACT ASSESSMENT (EU 2016/679)",
        "═" * 72,
        f"Data Controller Assessment: {meta['target_domain']}",
        f"Assessment Date            : {meta['completed_at'][:10]}",
        f"Articles Assessed          : Art. 5, 25, 32, 33, 34",
        "─" * 72,
        "ARTICLE 32 — SECURITY OF PROCESSING",
        f"  Technical measure gaps identified: {len(verified)}",
        f"  Personal data breach risk findings: {len(pii_risks)}",
        "─" * 72,
    ]
    for f in pii_risks[:15]:
        arts = ", ".join(f.get("gdpr_articles", []))
        lines.append(f"  [{f['risk_level']}] {f['title']}")
        lines.append(f"    GDPR: {arts} | CWE: {f['cwe']} | CVSS: {f['cvss_score']}")
    lines += [
        "─" * 72,
        "ARTICLE 33 — BREACH NOTIFICATION (72-hour rule)",
        f"  Findings with potential personal data impact: {len(pii_risks)}",
        "  If personal data of EU residents is at risk, notify supervisory authority within 72 hours.",
        "─" * 72,
        "Accepted in: EU/EEA · UK (UK GDPR) · Any org processing EU citizen data globally.",
        "═" * 72,
    ]
    return "\n".join(lines)


def _report_soc2(meta: dict, findings: list[dict]) -> str:
    verified = [f for f in findings if f.get("verified")]
    criteria: dict[str, list] = {}
    for f in verified:
        for c in f.get("soc2_criteria", []):
            criteria.setdefault(c, []).append(f)

    lines = [
        "═" * 72,
        "SOC 2 TYPE II — TRUST SERVICES CRITERIA GAP REPORT",
        "═" * 72,
        f"Service Organization: {meta['target_domain']}",
        f"Assessment Period   : {meta['completed_at'][:10]}",
        f"Criteria Assessed   : Security (CC) · Availability · Confidentiality",
        f"Control Exceptions  : {len(criteria)}",
        "─" * 72,
    ]
    for crit, items in sorted(criteria.items()):
        lines.append(f"  {crit} — EXCEPTION ({len(items)} finding(s))")
        for f in items[:2]:
            lines.append(f"    • {f['title']} (CVSS {f['cvss_score']})")
    lines += [
        "─" * 72,
        "SOC 2 is the US standard for SaaS security assurance — required by",
        "enterprise procurement, investors, and US federal contractors.",
        "Engage a licensed CPA firm for formal SOC 2 Type II attestation.",
        "═" * 72,
    ]
    return "\n".join(lines)


def _report_bugcrowd(meta: dict, findings: list[dict], scan_result: dict) -> str:
    reports = scan_result.get("submittable_reports", [])
    if reports:
        return "\n\n".join(r.get("report", "") for r in reports)
    verified = [f for f in findings if f.get("verified")]
    if not verified:
        return "No verified findings for bug bounty submission."
    parts = []
    for f in verified:
        parts.append(
            f"## Summary\n{f.get('title', '')}\n\n## Target\n{f.get('target', '')}\n\n"
            f"## Severity\n{f.get('cvss_rating', 'Medium')} (CVSS {f.get('cvss_score', '?')})\n\n"
            f"## CWE\n{f.get('cwe', '')} — {f.get('cwe_name', '')}\n\n"
            f"## Evidence\n{f.get('evidence', '')}\n\n## Remediation\n{f.get('remediation', '')}\n"
        )
    return "\n---\n".join(parts)


_BUILDERS = {
    "iso27001": _report_iso27001,
    "iso27005": _report_iso27005,
    "iso29147": _report_iso29147,
    "nist_csf": _report_nist_csf,
    "nist_800_53": _report_nist_800_53,
    "cvss31": _report_cvss31,
    "pci_dss": _report_pci_dss,
    "owasp_asvs": _report_owasp_asvs,
    "gdpr": _report_gdpr,
    "soc2": _report_soc2,
}


def generate_report(scan_result: dict, standard: str = "iso27001") -> dict:
    """Generate a compliance report in the requested standard."""
    standard = standard.lower().replace("-", "_")
    if standard not in REPORT_STANDARDS and standard != "bugcrowd":
        standard = "iso27001"

    meta = _scan_meta(scan_result)
    findings = _get_enriched_findings(scan_result)
    std_info = REPORT_STANDARDS.get(standard, REPORT_STANDARDS["iso27001"])

    if standard == "bugcrowd":
        content = _report_bugcrowd(meta, findings, scan_result)
    else:
        builder = _BUILDERS.get(standard, _report_iso27001)
        content = builder(meta, findings)

    return {
        "standard": standard,
        "standard_info": std_info,
        "meta": meta,
        "content": content,
        "content_html": render_report_html(content, std_info, meta),
        "findings_count": len(findings),
        "verified_count": sum(1 for f in findings if f.get("verified")),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def generate_all_reports(scan_result: dict) -> dict[str, dict]:
    """Generate reports for all supported standards."""
    reports = {}
    for std_id in list(REPORT_STANDARDS.keys()):
        reports[std_id] = generate_report(scan_result, std_id)
    return reports


def render_report_html(content: str, std_info: dict, meta: dict) -> str:
    """Render report as styled HTML for dashboard viewing."""
    body = escape(content)
    # Highlight section headers
    for hdr in ("EXECUTIVE SUMMARY", "RISK REGISTER", "ANNEX A", "ARTICLE", "SUMMARY"):
        body = body.replace(hdr, f'<strong class="hdr">{hdr}</strong>')

    return f"""<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/>
<style>
  body{{font-family:'Segoe UI',system-ui,sans-serif;background:#0a0f1a;color:#e8edf5;
    padding:24px;line-height:1.55;max-width:900px;margin:0 auto}}
  .banner{{background:linear-gradient(135deg,#1a2744,#0d1a30);border:1px solid #2a4060;
    border-radius:12px;padding:20px;margin-bottom:20px}}
  .banner h1{{font-size:1.1rem;margin:0 0 4px;color:#3ee0ff}}
  .banner p{{margin:0;font-size:.82rem;color:#7a8ba8}}
  .meta{{display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:.78rem;
    margin-top:12px;color:#9ab}}
  pre{{background:#060a12;border:1px solid #243352;border-radius:10px;padding:18px;
    font-family:'JetBrains Mono','Consolas',monospace;font-size:.74rem;white-space:pre-wrap;
    color:#b8c8e0;overflow-x:auto}}
  .hdr{{color:#3ee0ff}}
  .footer{{margin-top:16px;font-size:.7rem;color:#5a6a80;text-align:center}}
</style></head><body>
<div class="banner">
  <h1>{escape(std_info.get('name', ''))}</h1>
  <p>{escape(std_info.get('subtitle', ''))} · {escape(std_info.get('region', ''))}</p>
  <div class="meta">
    <span>Target: <b>{escape(meta.get('target_domain',''))}</b></span>
    <span>Scan: <b>{escape(meta.get('scan_id',''))}</b></span>
    <span>Verified: <b>{meta.get('verified_count',0)}</b></span>
    <span>Risk Score: <b>{meta.get('risk_score',0)}/100</b></span>
  </div>
</div>
<pre>{body}</pre>
<div class="footer">{escape(std_info.get('acceptance',''))}</div>
</body></html>"""


def save_reports(scan_id: str, scan_result: dict) -> Path | None:
    """Persist all compliance reports to disk."""
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    all_reports = generate_all_reports(scan_result)
    out = REPORTS_DIR / f"{scan_id}_compliance.json"
    payload = {
        "scan_id": scan_id,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "standards": list(REPORT_STANDARDS.keys()),
        "reports": {k: {**v, "content": v["content"][:50000]} for k, v in all_reports.items()},
    }
    out.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return out
