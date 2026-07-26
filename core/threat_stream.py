"""Real-time threat feed — live streaming of detections during scan."""

from __future__ import annotations

import asyncio
import json
from collections import Counter
from datetime import datetime, timezone
from typing import Any


class ThreatFeed:
    """Per-scan live threat event bus with SSE subscriber support."""

    def __init__(self, scan_id: str, max_events: int = 500):
        self.scan_id = scan_id
        self.max_events = max_events
        self.events: list[dict] = []
        self._seq = 0
        self._lock = asyncio.Lock()
        self._subscribers: list[asyncio.Queue] = []
        self.summary = Counter()
        self.by_category: Counter = Counter()
        self.by_phase: Counter = Counter()

    def _now(self) -> str:
        return datetime.now(timezone.utc).isoformat()

    async def push(
        self,
        event_type: str,
        title: str,
        *,
        severity: str = "medium",
        category: str = "",
        target: str = "",
        phase: str = "",
        verified: bool = False,
        confidence: int = 0,
        evidence: str = "",
        finding_id: str = "",
        exploitable: bool = False,
    ) -> dict:
        async with self._lock:
            self._seq += 1
            evt = {
                "event_id": self._seq,
                "scan_id": self.scan_id,
                "type": event_type,
                "ts": self._now(),
                "title": title,
                "severity": (severity or "medium").lower(),
                "category": category or "Unknown",
                "target": target,
                "phase": phase,
                "verified": verified,
                "confidence": confidence,
                "evidence": (evidence or "")[:300],
                "finding_id": finding_id,
                "exploitable": exploitable,
            }
            self.events.append(evt)
            if len(self.events) > self.max_events:
                self.events = self.events[-self.max_events:]

            sev = evt["severity"]
            self.summary["total"] += 1
            self.summary[sev] += 1
            if verified:
                self.summary["verified"] += 1
            if exploitable:
                self.summary["exploitable"] += 1
            self.by_category[category or "Unknown"] += 1
            if phase:
                self.by_phase[phase] += 1

            for q in self._subscribers:
                try:
                    q.put_nowait(evt)
                except asyncio.QueueFull:
                    pass
            return evt

    async def push_finding(self, finding: dict, phase: str = "", event_type: str = "threat_detected") -> dict:
        return await self.push(
            event_type,
            finding.get("title", "Threat detected"),
            severity=finding.get("severity", "medium"),
            category=finding.get("category", ""),
            target=finding.get("target", ""),
            phase=phase,
            verified=bool(finding.get("submission_ready") or finding.get("verified")),
            confidence=finding.get("confidence", 0),
            evidence=finding.get("evidence", ""),
            finding_id=finding.get("id", ""),
            exploitable=bool(finding.get("exploitable") or finding.get("ai_confirmed")),
        )

    async def push_phase(self, phase: str, detail: str = "") -> dict:
        return await self.push(
            "phase_change",
            detail or phase,
            severity="info",
            category="System",
            phase=phase,
        )

    def subscribe(self) -> asyncio.Queue:
        q: asyncio.Queue = asyncio.Queue(maxsize=200)
        self._subscribers.append(q)
        return q

    def unsubscribe(self, q: asyncio.Queue) -> None:
        if q in self._subscribers:
            self._subscribers.remove(q)

    def recent(self, limit: int = 40, since_id: int = 0) -> list[dict]:
        if since_id:
            return [e for e in self.events if e["event_id"] > since_id][-limit:]
        return self.events[-limit:]

    def snapshot(self, since_id: int = 0) -> dict:
        return {
            "scan_id": self.scan_id,
            "summary": dict(self.summary),
            "by_category": dict(self.by_category.most_common(12)),
            "by_phase": dict(self.by_phase),
            "total_events": len(self.events),
            "latest_event_id": self._seq,
            "threats": self.recent(50, since_id),
        }

    def to_sse(self, evt: dict) -> str:
        return f"data: {json.dumps(evt, default=str)}\n\n"
