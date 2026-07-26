"""Scan history persistence for SaaS dashboard."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from core.config import HISTORY_DIR


def _ensure():
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)


def save_scan_summary(scan_id: str, data: dict) -> Path:
    _ensure()
    path = HISTORY_DIR / f"{scan_id}.json"
    summary = {
        "scan_id": scan_id,
        "target_domain": data.get("target_domain"),
        "status": data.get("status", "completed"),
        "started_at": data.get("started_at"),
        "completed_at": data.get("completed_at") or datetime.now(timezone.utc).isoformat(),
        "stats": data.get("stats", {}),
        "summary": data.get("summary", {}),
        "verified_count": len(data.get("verified_findings", [])),
        "findings_count": len(data.get("findings", [])),
        "risk_score": _risk_score(data),
    }
    path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    return path


def _risk_score(data: dict) -> int:
    verified = data.get("verified_findings", [])
    score = 0
    for f in verified:
        sev = (f.get("severity") or "").lower()
        score += {"critical": 40, "high": 25, "medium": 12, "low": 5}.get(sev, 3)
    return min(100, score)


def list_history(limit: int = 30) -> list[dict]:
    _ensure()
    files = sorted(HISTORY_DIR.glob("*.json"), key=lambda p: p.stat().st_mtime, reverse=True)
    out = []
    for p in files[:limit]:
        try:
            out.append(json.loads(p.read_text(encoding="utf-8")))
        except Exception:
            continue
    return out
