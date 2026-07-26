"""Scan progress tracking with ETA and throughput metrics."""

from __future__ import annotations

import time
from datetime import datetime, timezone


PHASE_LABELS = {
    "subdomain_discovery": "Subdomain Discovery",
    "ai_prioritization": "AI Target Ranking",
    "source_crawl": "Source Crawl & Download",
    "source_analysis": "Line-by-Line Source Analysis",
    "ai_inference": "AI Vulnerability Inference",
    "ai_exploitation": "AI Active Exploitation",
    "deep_scanning": "Deep Security Scans",
    "deep_attack_hunt": "OWASP Deep Attack Hunter",
    "elite_exploits": "Elite Exploit Suite (21 Techniques)",
    "mega_1m_checks": "1M+ Parallel Fuzzing",
    "nuclei_checks": "Nuclei Template Checks",
    "super_scanner": "Super Scanner Deep Checks",
    "exploit_verification": "Exploit Verification",
    "complete": "Complete",
}

PARAM_TYPES = ("redirect", "xss", "sqli", "ssrf", "ssti", "lfi", "file")


def format_duration(seconds: float) -> str:
    if seconds < 0 or seconds == float("inf"):
        return "—"
    s = int(seconds)
    if s < 60:
        return f"{s}s"
    if s < 3600:
        return f"{s // 60}m {s % 60}s"
    return f"{s // 3600}h {(s % 3600) // 60}m"


class ScanProgress:
    """Tracks scan progress, throughput, and ETA."""

    def __init__(self, target_domain: str = "", workers: int = 0):
        self.target_domain = target_domain
        self.workers = workers
        self.started = time.monotonic()
        self.phase_started = self.started
        self.current_phase = "initializing"
        self.progress = 0
        self.checks_done = 0
        self.checks_total = 0
        self.findings_count = 0
        self.checks_per_sec = 0.0
        self.eta_seconds = 0.0
        self.elapsed_seconds = 0.0
        self.param_coverage: dict[str, int] = {p: 0 for p in PARAM_TYPES}
        self._last_check_count = 0
        self._last_rate_time = self.started
        self.phase_detail = ""
        self.fuzz_pct = 0.0
        self.errors = 0
        self.timeouts = 0
        self.queue_size = 0

    def tick_rate(self, checks_done: int) -> None:
        now = time.monotonic()
        elapsed = now - self._last_rate_time
        if elapsed >= 0.25:
            delta = checks_done - self._last_check_count
            instant = delta / elapsed if elapsed > 0 else 0
            # Smooth rate so ETA doesn't jump wildly
            self.checks_per_sec = round(
                (self.checks_per_sec * 0.4 + instant * 0.6) if self.checks_per_sec else instant,
                1,
            )
            self._last_check_count = checks_done
            self._last_rate_time = now
        self.checks_done = checks_done
        if self.checks_total > 0:
            self.fuzz_pct = round(checks_done / self.checks_total * 100, 2)
        if self.checks_total > 0 and self.checks_per_sec > 0:
            remaining = self.checks_total - checks_done
            self.eta_seconds = max(0, remaining / self.checks_per_sec)
        self.elapsed_seconds = now - self.started

    def update(
        self,
        phase: str,
        progress: int,
        detail: str = "",
        checks_done: int | None = None,
        checks_total: int | None = None,
        findings_count: int | None = None,
        param_coverage: dict[str, int] | None = None,
        workers: int | None = None,
        errors: int | None = None,
        timeouts: int | None = None,
        fuzz_pct: float | None = None,
        queue_size: int | None = None,
        **_extra,
    ) -> dict:
        if phase != self.current_phase:
            self.current_phase = phase
            self.phase_started = time.monotonic()
        self.progress = min(100, max(0, progress))
        if detail:
            self.phase_detail = detail
        if checks_total is not None:
            self.checks_total = checks_total
        if findings_count is not None:
            self.findings_count = findings_count
        if param_coverage:
            self.param_coverage.update(param_coverage)
        if workers is not None:
            self.workers = workers
        if errors is not None:
            self.errors = errors
        if timeouts is not None:
            self.timeouts = timeouts
        if queue_size is not None:
            self.queue_size = queue_size
        if fuzz_pct is not None:
            self.fuzz_pct = fuzz_pct
        if checks_done is not None:
            self.tick_rate(checks_done)
        else:
            self.elapsed_seconds = time.monotonic() - self.started

        return self.to_dict()

    def to_dict(self) -> dict:
        cov = self.param_coverage
        cov_total = sum(cov.values()) or 1
        fuzz = self.fuzz_pct
        if self.checks_total > 0 and self.checks_done:
            fuzz = round(self.checks_done / self.checks_total * 100, 2)
        return {
            "current_phase": self.current_phase,
            "phase_label": PHASE_LABELS.get(self.current_phase, self.current_phase),
            "progress": self.progress,
            "overall_pct": self.progress,
            "fuzz_pct": fuzz,
            "phase_detail": self.phase_detail,
            "target_domain": self.target_domain,
            "checks_done": self.checks_done,
            "checks_total": self.checks_total,
            "checks_per_sec": self.checks_per_sec,
            "eta_seconds": int(self.eta_seconds),
            "eta_formatted": format_duration(self.eta_seconds),
            "elapsed_seconds": int(self.elapsed_seconds),
            "elapsed_formatted": format_duration(self.elapsed_seconds),
            "findings_count": self.findings_count,
            "workers": self.workers,
            "errors": self.errors,
            "timeouts": self.timeouts,
            "queue_size": self.queue_size,
            "param_coverage": cov,
            "param_coverage_pct": {
                k: round(v / cov_total * 100, 1) if cov_total else 0 for k, v in cov.items()
            },
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
