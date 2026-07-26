"""Mega Scanner orchestrator — single-domain focus, 1M+ checks."""

from __future__ import annotations

import asyncio
from dataclasses import asdict
from datetime import datetime, timezone
from typing import Awaitable, Callable

from core.config import PRIMARY_URLS, VERIFIED_MIN_CONFIDENCE, MEGA_CHECK_TARGET, MEGA_CONCURRENCY
from core.domain_utils import normalize_domain, scope_root, urls_for_domain
from core.progress_tracker import ScanProgress
from core.subdomain_enum import enumerate_subdomains
from core.crawler import WebCrawler
from core.source_analyzer import SourceAnalyzer
from core.ai_engine import AIEngine
from core.ai_exploiter import AIExploiter
from core.deep_scanners import DeepScannerSuite
from core.deep_attacks import DeepAttackHunter
from core.elite_exploits import EliteExploitSuite
from core.mega_check_engine import MegaCheckEngine, mega_check_surface
from core.nuclei_checks import NucleiRunner
from super_scanner import SuperScanner
from exploit import ExploitEngine
from core.threat_stream import ThreatFeed


def _host_matches_target(host: str, target: str) -> bool:
    host = normalize_domain(host)
    target = normalize_domain(target)
    root = scope_root(target)
    # Root domain selected → include all subdomains under that root
    if target == root:
        return host == root or host.endswith("." + root)
    # Specific host typed → only that host
    return host == target


class ScanCancelled(Exception):
    """Raised when the user stops an in-flight scan."""


class MegaScanner:
    """Full pipeline scoped to ONE user-selected domain."""

    def __init__(self, target_domain: str):
        self.target_domain = normalize_domain(target_domain)
        self.scope_root = scope_root(self.target_domain)
        self.primary_urls = urls_for_domain(self.target_domain)
        self.ai = AIEngine()
        self.source_analyzer = SourceAnalyzer()
        self.phases: list[str] = []
        self.stats: dict = {}

    async def run(
        self,
        scan_id: str,
        progress_cb=None,
        threat_feed: ThreatFeed | None = None,
        cancel_check: Callable[[], bool] | None = None,
        on_mega_created: Callable | None = None,
    ) -> dict:
        def cancelled() -> bool:
            return bool(cancel_check and cancel_check())

        started = datetime.now(timezone.utc).isoformat()
        all_findings: list[dict] = []
        all_urls: list[str] = list(self.primary_urls)
        subdomains_found: list[dict] = []
        pages_crawled: list[dict] = []
        seen_finding_ids: set[str] = set()

        tracker = ScanProgress(self.target_domain, workers=MEGA_CONCURRENCY)

        async def push_threats(findings: list[dict], phase: str, event_type: str = "threat_detected"):
            if not threat_feed:
                return
            for f in findings:
                fid = f.get("id", "")
                if fid and fid in seen_finding_ids:
                    continue
                if fid:
                    seen_finding_ids.add(fid)
                await threat_feed.push_finding(f, phase=phase, event_type=event_type)

        async def emit(phase: str, pct: int, detail: str = "", **kwargs):
            if cancelled():
                raise ScanCancelled()
            self.phases.append(phase) if phase not in self.phases else None
            if threat_feed:
                await threat_feed.push_phase(phase, detail)
            update = tracker.update(phase, pct, detail, workers=MEGA_CONCURRENCY, **kwargs)
            if threat_feed:
                snap = threat_feed.snapshot()
                update["threat_summary"] = snap["summary"]
                update["live_threats"] = snap["threats"]
                update["threat_by_category"] = snap["by_category"]
                update["latest_event_id"] = snap["latest_event_id"]
            if progress_cb:
                await progress_cb(update)

        # Phase 1: Subdomain enumeration (scoped to selected domain)
        await emit("subdomain_discovery", 3, "Enumerating subdomains via DNS + crt.sh…")
        if cancelled():
            raise ScanCancelled()
        try:
            subs = await enumerate_subdomains(self.scope_root)
            for s in subs:
                host = normalize_domain(s.get("host", s.get("url", "")))
                if _host_matches_target(host, self.target_domain):
                    subdomains_found.append(s)
                    all_urls.append(s["url"])
        except Exception as e:
            await emit("subdomain_discovery", 4, f"Subdomain enum partial: {e}")

        all_urls = list(dict.fromkeys(all_urls)) or list(self.primary_urls)

        # Phase 2: AI prioritization
        await emit("ai_prioritization", 6, f"Found {len(all_urls)} URLs — AI ranking…")

        # Phase 3: Crawl + download source (single domain scope)
        await emit("source_crawl", 10, "Crawling pages and downloading source…")
        ranked_urls = self.ai.rank_targets(all_urls) or list(self.primary_urls)

        crawler = WebCrawler()
        try:
            pages = await crawler.crawl(self.primary_urls, self.scope_root)
            pages_crawled = [p for p in pages if _host_matches_target(
                normalize_domain(p.get("url", "")), self.target_domain
            )]
        except Exception as e:
            pages_crawled = []
            await emit("source_crawl", 12, f"Crawl partial: {e}")

        # Phase 4: Line-by-line source analysis
        await emit("source_analysis", 14, f"Crawled {len(pages_crawled)} pages — analyzing source…")
        source_findings = self.source_analyzer.analyze_pages(pages_crawled)
        src_batch = []
        for sf in source_findings:
            if sf.get("exploitable"):
                f = self._to_finding(sf, "source_analyzer")
                all_findings.append(f)
                src_batch.append(f)
        await push_threats(src_batch, "source_analysis")

        # Phase 5: AI inference
        await emit("ai_inference", 18, "AI scoring all crawled pages…")
        ai_predictions = 0
        ai_batch = []
        for page in pages_crawled[:30]:
            try:
                from pathlib import Path
                content = Path(page["source_path"]).read_text(encoding="utf-8", errors="replace")[:8000]
            except Exception:
                content = ""
            preds = self.ai.score_url(page["url"], content)
            for pred in preds:
                if pred["confidence"] >= 60:
                    ai_predictions += 1
                    f = {
                        "id": f"ai-{pred['vuln_type']}-{hash(page['url']) % 10**8}",
                        "target": page["url"],
                        "title": f"AI Detected: {pred['vuln_type'].replace('_', ' ').title()}",
                        "severity": "medium" if pred["confidence"] < 80 else "high",
                        "category": pred["vuln_type"].replace("_", " ").title(),
                        "description": f"AI confidence {pred['confidence']}% on {self.target_domain}.",
                        "evidence": pred["evidence"],
                        "remediation": "Pending active exploitation.",
                        "exploitable": False,
                        "confidence": pred["confidence"],
                        "estimated_priority": pred["priority"],
                        "ai_predicted": True,
                    }
                    all_findings.append(f)
                    ai_batch.append(f)
        await push_threats(ai_batch, "ai_inference")

        # Phase 6+7: AI exploitation + deep scans + deep attacks + elite exploits IN PARALLEL
        await emit("ai_exploitation", 20, "Parallel: AI exploits · deep scans · OWASP hunter · elite exploits…")
        if cancelled():
            raise ScanCancelled()
        exploiter = AIExploiter()
        deep = DeepScannerSuite()
        hunter = DeepAttackHunter()
        elite = EliteExploitSuite()
        ai_exploit_results, deep_results, attack_results, elite_results = await asyncio.gather(
            exploiter.run(ranked_urls[:15], pages_crawled),
            deep.run_all(ranked_urls[:15], pages_crawled),
            hunter.run_all(ranked_urls[:12], pages_crawled),
            elite.run_all(ranked_urls[:12], pages_crawled),
        )
        for ar in ai_exploit_results:
            all_findings.append({**ar, "exploitable": ar.get("ai_confirmed", False)})
        all_findings.extend(deep_results)
        all_findings.extend(attack_results)
        all_findings.extend(elite_results)
        await push_threats(ai_exploit_results, "ai_exploitation")
        await push_threats(deep_results, "deep_scanning")
        await push_threats(attack_results, "deep_attack_hunt")
        await push_threats(elite_results, "elite_exploits")
        if cancelled():
            raise ScanCancelled()
        await emit(
            "elite_exploits", 28,
            f"AI: {exploiter.stats.get('attacks_run', 0)} · Deep: {deep.stats.get('checks_run', 0)} · "
            f"Attacks: {hunter.stats.get('checks', 0)} · Elite: {elite.stats.get('techniques', 0)} techniques / "
            f"{elite.stats.get('confirmed', 0)} confirmed",
            findings_count=len(all_findings),
        )

        # Phase 8: 1 MILLION+ mega checks (high parallelism)
        await emit("mega_1m_checks", 30, f"Launching {MEGA_CHECK_TARGET:,} parallel checks ({MEGA_CONCURRENCY} workers)…",
                   checks_total=MEGA_CHECK_TARGET, checks_done=0)
        mega = MegaCheckEngine()
        if on_mega_created:
            on_mega_created(mega)
        surface = mega_check_surface()
        mega_threat_count = 0

        async def on_mega_hit(hit: dict):
            nonlocal mega_threat_count
            all_findings.append(hit)
            mega_threat_count += 1
            await push_threats([hit], "mega_1m_checks")

        async def mega_progress(done: int, total: int, extra: dict | None = None):
            extra = extra or {}
            total = max(total, 1)
            fuzz_pct = float(extra.get("fuzz_pct") or (done / total * 100))
            # Overall bar: 30% → 80% maps to fuzz 0→100
            overall = 30 + int(fuzz_pct * 0.5)
            speed = tracker.checks_per_sec
            eta = tracker.eta_formatted
            detail = (
                f"{done:,} / {total:,} · {speed}/s · ETA {eta} · "
                f"errors {extra.get('errors', 0)} · timeouts {extra.get('timeouts', 0)} · "
                f"threats {mega_threat_count}"
            )
            await emit(
                "mega_1m_checks", min(overall, 80),
                detail,
                checks_done=done, checks_total=total,
                param_coverage=extra.get("param_coverage"),
                findings_count=len(all_findings) + extra.get("findings_count", 0),
                workers=extra.get("workers", MEGA_CONCURRENCY),
                errors=extra.get("errors"),
                timeouts=extra.get("timeouts"),
                fuzz_pct=fuzz_pct,
                queue_size=extra.get("queue_size"),
            )

        mega_urls = list(dict.fromkeys(self.primary_urls + ranked_urls[:5]))
        try:
            mega_results = await mega.run(
                mega_urls, limit=MEGA_CHECK_TARGET,
                progress_cb=mega_progress, finding_cb=on_mega_hit,
                cancel_check=cancel_check,
            )
        except Exception as e:
            await emit("mega_1m_checks", 80, f"Fuzz engine recovered from error: {e}",
                       checks_done=mega.checks_run, checks_total=MEGA_CHECK_TARGET, fuzz_pct=100)

        if cancelled():
            raise ScanCancelled()

        # Phase 9: Nuclei templates (quick pass on top URLs)
        await emit("nuclei_checks", 82, "Running nuclei templates…", findings_count=len(all_findings), fuzz_pct=100)
        nuclei = NucleiRunner()
        try:
            nuclei_results = await nuclei.run_all(ranked_urls[:10] or self.primary_urls)
            nuc_batch = []
            for nr in nuclei_results:
                f = {**nr, "exploitable": nr.get("candidate", False)}
                all_findings.append(f)
                nuc_batch.append(f)
            await push_threats(nuc_batch, "nuclei_checks")
        except Exception as e:
            await emit("nuclei_checks", 84, f"Nuclei skipped: {e}")

        # Phase 10: Super scanner (scoped domain only)
        await emit("super_scanner", 86, "Super scanner deep checks…")
        try:
            async with SuperScanner(request_delay=0.05) as scanner:
                super_result = await scanner.run_super_scan(scan_id, target_domain=self.target_domain)
                await push_threats(super_result.get("findings", []), "super_scanner")
                all_findings.extend(super_result.get("findings", []))
        except Exception as e:
            await emit("super_scanner", 90, f"Super scan partial: {e}")

        # Phase 11: Exploit verification
        await emit("exploit_verification", 92, f"Verifying {len(all_findings)} findings…")
        seen_ids: set[str] = set()
        unique = []
        for f in all_findings:
            if f.get("id") not in seen_ids:
                seen_ids.add(f.get("id"))
                unique.append(f)

        engine = ExploitEngine()
        exploit_results = []
        verified_findings = []
        submittable_reports = []

        candidates = [f for f in unique if f.get("exploitable") or f.get("ai_confirmed")
                      or f.get("severity") in ("critical", "high", "medium")]
        for f in unique:
            if f not in candidates and f.get("category", "").lower() in ("cors", "open redirect", "xss"):
                candidates.append(f)

        total_verify = max(len(candidates), 1)
        for i, f in enumerate(candidates):
            try:
                result = await engine.verify_finding(f)
                exp = asdict(result)
                exploit_results.append(exp)
                f["verified_status"] = exp["status"]
                f["browser_exploitable"] = exp["browser_exploitable"]
                f["confidence"] = exp["confidence"]
                f["estimated_priority"] = exp["estimated_priority"]
                f["submission_ready"] = exp["submission_ready"]
                f["exploitable"] = exp["submission_ready"]
                if exp["submission_ready"] and exp["confidence"] >= VERIFIED_MIN_CONFIDENCE:
                    verified_findings.append(f)
                    if threat_feed:
                        await threat_feed.push_finding(f, phase="exploit_verification", event_type="threat_verified")
                    if exp.get("submission_report"):
                        submittable_reports.append({
                            "finding_id": f["id"],
                            "title": f["title"],
                            "priority": exp["estimated_priority"],
                            "report": exp["submission_report"],
                        })
            except Exception:
                pass
            if i % 3 == 0:
                await emit(
                    "exploit_verification", 92 + int((i / total_verify) * 6),
                    f"Verifying threats… {i}/{len(candidates)} · {len(verified_findings)} confirmed",
                    findings_count=len(unique),
                )

        await emit("complete", 100, f"Done — {len(verified_findings)} verified exploit(s)",
                   findings_count=len(unique), checks_done=mega.checks_run)

        final = tracker.to_dict()
        self.stats = {
            "target_domain": self.target_domain,
            "scope_root": self.scope_root,
            "subdomains": len(subdomains_found),
            "pages_crawled": len(pages_crawled),
            "source_findings": len(source_findings),
            "ai_predictions": ai_predictions,
            "ai_attacks_run": exploiter.stats.get("attacks_run", 0),
            "ai_exploits_confirmed": exploiter.stats.get("confirmed", 0),
            "deep_checks_run": deep.stats.get("checks_run", 0),
            "deep_attack_checks": hunter.stats.get("checks", 0),
            "deep_attack_hits": hunter.stats.get("hits", 0),
            "deep_attack_techniques": hunter.stats.get("techniques", 0),
            "elite_techniques": elite.stats.get("techniques", 0),
            "elite_checks": elite.stats.get("checks", 0),
            "elite_hits": elite.stats.get("hits", 0),
            "elite_confirmed": elite.stats.get("confirmed", 0),
            "mega_checks_run": mega.checks_run,
            "mega_check_target": MEGA_CHECK_TARGET,
            "mega_check_surface": surface,
            "nuclei_checks": nuclei.templates_run,
            "nuclei_templates": nuclei.template_total,
            "total_analyzed": len(unique),
            "verified_exploitable": len(verified_findings),
            "submittable": len(submittable_reports),
            "mega_checks_per_sec": final.get("checks_per_sec", 0),
            "param_coverage": mega.checks_by_type,
            "workers": MEGA_CONCURRENCY,
            "eta_formatted": final.get("eta_formatted", ""),
            "elapsed_formatted": final.get("elapsed_formatted", ""),
            "errors": mega.errors,
            "timeouts": mega.timeouts,
            "risk_score": min(100, sum(
                {"critical": 40, "high": 25, "medium": 12, "low": 5}.get((f.get("severity") or "").lower(), 3)
                for f in verified_findings
            )),
        }

        return {
            "scan_id": scan_id,
            "scan_type": "mega",
            "target_domain": self.target_domain,
            "started_at": started,
            "completed_at": datetime.now(timezone.utc).isoformat(),
            "phases": self.phases,
            "stats": self.stats,
            "subdomains": subdomains_found[:50],
            "findings": unique,
            "verified_findings": verified_findings,
            "exploit_results": exploit_results,
            "submittable_reports": submittable_reports,
            "summary": {
                "target_domain": self.target_domain,
                "total_findings": len(unique),
                "verified_exploitable": len(verified_findings),
                "submittable": len(submittable_reports),
                "mega_checks_run": mega.checks_run,
                "mega_check_surface": surface,
            },
        }

    def _to_finding(self, sf: dict, source: str) -> dict:
        return {
            "id": sf.get("id", f"src-{hash(str(sf)) % 10**8}"),
            "target": sf.get("url", ""),
            "title": sf.get("title", "Source Finding"),
            "severity": sf.get("severity", "medium"),
            "category": sf.get("category", "Source Analysis"),
            "description": f"Line {sf.get('line_number')}: {sf.get('title')}",
            "evidence": sf.get("line_content", ""),
            "remediation": "Remove exposed secrets; fix dangerous sinks.",
            "exploitable": sf.get("exploitable", False),
            "source_file": sf.get("file_path"),
            "line_number": sf.get("line_number"),
            "detection_source": source,
        }
