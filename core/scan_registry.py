"""Persist scan metadata so stop/status APIs survive server restarts."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from core.config import DATA_DIR, HISTORY_DIR

REGISTRY_PATH = DATA_DIR / "scan_registry.json"


def _ensure_dirs() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    HISTORY_DIR.mkdir(parents=True, exist_ok=True)


def load_registry() -> dict[str, dict]:
    _ensure_dirs()
    if not REGISTRY_PATH.exists():
        return {}
    try:
        data = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception:
        return {}


def save_registry(registry: dict[str, dict]) -> None:
    _ensure_dirs()
    REGISTRY_PATH.write_text(json.dumps(registry, indent=2), encoding="utf-8")


def upsert_scan(scan_id: str, entry: dict) -> None:
    registry = load_registry()
    current = registry.get(scan_id, {})
    current.update(entry)
    current["scan_id"] = scan_id
    current["updated_at"] = datetime.now(timezone.utc).isoformat()
    registry[scan_id] = current
    save_registry(registry)


def get_scan(scan_id: str) -> dict | None:
    entry = load_registry().get(scan_id)
    if entry:
        return dict(entry)
    history = HISTORY_DIR / f"{scan_id}.json"
    if history.exists():
        try:
            data = json.loads(history.read_text(encoding="utf-8"))
            return {
                "scan_id": scan_id,
                "status": data.get("status", "completed"),
                "target_domain": data.get("target_domain"),
                "progress": data.get("stats", {}).get("mega_checks_run", 0),
                "started_at": data.get("started_at"),
                "completed_at": data.get("completed_at"),
            }
        except Exception:
            return None
    return None


def find_active_scan_id() -> str | None:
    registry = load_registry()
    for sid, entry in sorted(registry.items(), key=lambda x: x[1].get("updated_at", ""), reverse=True):
        if entry.get("status") in ("running", "queued"):
            return sid
    return None
