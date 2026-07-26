"""QuantumShield — universal SaaS mega scanner API."""

from __future__ import annotations

import asyncio
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, Query, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from orchestrator import MegaScanner, ScanCancelled
from super_scanner import SuperScanner
from exploit import ExploitEngine
from intelligence import train_model, get_model_dict
from core.config import (
    SCOPE_DOMAINS, VERIFIED_MIN_CONFIDENCE, MEGA_CHECK_TARGET,
    MEGA_CONCURRENCY, UNIVERSAL_MODE, PRODUCT_NAME, PRODUCT_VERSION,
)
from core.domain_utils import is_in_scope, normalize_domain
from core.mega_check_engine import mega_check_surface, MegaCheckEngine
from core.scan_history import save_scan_summary, list_history
from core.compliance_reports import (
    list_standards, generate_report, generate_all_reports, save_reports, REPORT_STANDARDS,
)
from core.threat_stream import ThreatFeed
from core.scan_registry import upsert_scan, get_scan as registry_get_scan, find_active_scan_id, load_registry
from core.security_platform import SecurityPlatform

scans: dict[str, dict] = {}
threat_feeds: dict[str, ThreatFeed] = {}
scan_tasks: dict[str, asyncio.Task] = {}
active_mega_engines: dict[str, MegaCheckEngine] = {}
latest_scan_id: str | None = None


def _hydrate_scans_from_registry() -> None:
    global latest_scan_id
    for sid, entry in load_registry().items():
        if sid not in scans:
            scans[sid] = dict(entry)
        if entry.get("status") in ("running", "queued") and not latest_scan_id:
            latest_scan_id = sid


def _touch_scan(scan_id: str, **fields) -> None:
    if scan_id not in scans:
        scans[scan_id] = {"scan_id": scan_id}
    scans[scan_id].update(fields)
    upsert_scan(scan_id, scans[scan_id])


def _ensure_scan_loaded(scan_id: str) -> bool:
    if scan_id in scans:
        return True
    entry = registry_get_scan(scan_id)
    if not entry:
        return False
    scans[scan_id] = entry
    return True


def _stop_scan_impl(scan_id: str) -> dict | JSONResponse:
    if not _ensure_scan_loaded(scan_id):
        return JSONResponse({"ok": False, "error": "not found", "message": "Scan not found"}, status_code=404)

    status = scans[scan_id].get("status")
    if status in ("completed", "failed", "cancelled"):
        resp = _scan_response(scan_id)
        resp["ok"] = True
        resp["message"] = f"Scan already {status}"
        return resp

    if status not in ("running", "queued"):
        return JSONResponse({"ok": False, "message": f"Scan is {status}, not running"}, status_code=400)

    scans[scan_id]["status"] = "cancelled"
    scans[scan_id]["phase_label"] = "Stopped"
    scans[scan_id]["phase_detail"] = "Scan stopped by user"
    scans[scan_id]["current_phase"] = "stopped"
    _touch_scan(scan_id)

    engine = active_mega_engines.get(scan_id)
    if engine:
        engine.request_stop()
    task = scan_tasks.get(scan_id)
    if task and not task.done():
        task.cancel()

    resp = _scan_response(scan_id)
    resp["ok"] = True
    return resp


platform = SecurityPlatform()


async def _run_scan(scan_id: str, scan_type: str = "mega", target_domain: str = "nasa.gov"):
    if scans[scan_id].get("status") == "cancelled":
        return

    scans[scan_id]["status"] = "running"
    _touch_scan(scan_id, status="running")
    scans[scan_id]["target_domain"] = normalize_domain(target_domain)
    scans[scan_id]["overall_pct"] = 0
    scans[scan_id]["fuzz_pct"] = 0
    feed = ThreatFeed(scan_id)
    threat_feeds[scan_id] = feed
    scans[scan_id]["threat_summary"] = {}
    scans[scan_id]["live_threats"] = []

    def is_cancelled() -> bool:
        return scans[scan_id].get("status") == "cancelled"

    async def progress_cb(update: dict):
        if is_cancelled():
            return

        scans[scan_id].update(update)
        prog = update.get("overall_pct", update.get("progress"))
        if prog is not None:
            scans[scan_id]["overall_pct"] = prog
            scans[scan_id]["progress"] = prog
        if "fuzz_pct" in update:
            scans[scan_id]["fuzz_pct"] = update["fuzz_pct"]
        if update.get("threat_summary"):
            scans[scan_id]["threat_summary"] = update["threat_summary"]
        if update.get("live_threats"):
            scans[scan_id]["live_threats"] = update["live_threats"]
        if update.get("latest_event_id"):
            scans[scan_id]["latest_event_id"] = update["latest_event_id"]

    try:
        if scan_type == "mega":
            scanner = MegaScanner(target_domain)

            def on_mega_created(engine: MegaCheckEngine):
                active_mega_engines[scan_id] = engine

            try:
                result = await scanner.run(
                    scan_id,
                    progress_cb=progress_cb,
                    threat_feed=feed,
                    cancel_check=is_cancelled,
                    on_mega_created=on_mega_created,
                )
            except ScanCancelled:
                _touch_scan(scan_id)
                return
            if is_cancelled():
                return
        else:
            async with SuperScanner(request_delay=0.05) as s:
                result = await s.run_super_scan(scan_id, target_domain=target_domain)
            engine = ExploitEngine()
            exploit_results = await engine.run_all(result.get("findings", []))
            result["exploit_results"] = exploit_results
            result["verified_findings"] = [
                f for f in result["findings"]
                if any(e.get("submission_ready") and e.get("finding_id") == f.get("id") for e in exploit_results)
            ]
            result["submittable_reports"] = [
                {"finding_id": e["finding_id"], "title": e["title"],
                 "priority": e["estimated_priority"], "report": e.get("submission_report", "")}
                for e in exploit_results if e.get("submission_ready")
            ]
            result["target_domain"] = normalize_domain(target_domain)
            result.setdefault("summary", {})
            result["summary"]["verified_exploitable"] = len(result["verified_findings"])
            result["summary"]["submittable"] = len(result["submittable_reports"])

        if is_cancelled():
            return

        scans[scan_id].update({
            "status": "completed",
            "progress": 100,
            "overall_pct": 100,
            "fuzz_pct": 100,
            "result": result,
            "exploit_results": result.get("exploit_results", []),
            "verified_count": len(result.get("verified_findings", [])),
            "submittable_count": len(result.get("submittable_reports", [])),
            "completed_at": result.get("completed_at"),
            "stats": result.get("stats", {}),
            "threat_summary": feed.snapshot()["summary"],
            "live_threats": feed.recent(100),
        })
        try:
            compliance = generate_all_reports(result)
            result["compliance_reports"] = {k: v["content"] for k, v in compliance.items()}
            scans[scan_id]["compliance_reports"] = compliance
            save_reports(scan_id, result)
        except Exception:
            pass
        try:
            save_scan_summary(scan_id, {**scans[scan_id], **result})
        except Exception:
            pass
        _touch_scan(scan_id)
    except asyncio.CancelledError:
        scans[scan_id]["status"] = "cancelled"
        scans[scan_id]["phase_label"] = "Stopped"
        scans[scan_id]["phase_detail"] = "Scan stopped by user"
        scans[scan_id]["current_phase"] = "stopped"
        _touch_scan(scan_id)
        try:
            save_scan_summary(scan_id, scans[scan_id])
        except Exception:
            pass
        raise
    except Exception as e:
        import traceback
        scans[scan_id]["status"] = "failed"
        scans[scan_id]["error"] = str(e)
        scans[scan_id]["traceback"] = traceback.format_exc()
        scans[scan_id]["phase_detail"] = f"Scan failed: {e}"
        _touch_scan(scan_id)
        try:
            save_scan_summary(scan_id, scans[scan_id])
        except Exception:
            pass
    finally:
        active_mega_engines.pop(scan_id, None)


def _queue_scan(scan_type: str = "mega", target_domain: str = "nasa.gov") -> str:
    global latest_scan_id
    try:
        domain = normalize_domain(target_domain)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    if not UNIVERSAL_MODE and not is_in_scope(domain):
        raise HTTPException(status_code=400, detail=f"Domain '{domain}' not in scope: {SCOPE_DOMAINS}")

    scan_id = str(uuid.uuid4())[:8]
    latest_scan_id = scan_id
    scans[scan_id] = {
        "scan_id": scan_id,
        "status": "queued",
        "progress": 0,
        "overall_pct": 0,
        "fuzz_pct": 0,
        "scan_type": scan_type,
        "target_domain": domain,
        "started_at": datetime.now(timezone.utc).isoformat(),
        "workers": MEGA_CONCURRENCY,
        "checks_total": MEGA_CHECK_TARGET if scan_type == "mega" else 0,
    }
    upsert_scan(scan_id, scans[scan_id])
    task = asyncio.create_task(_run_scan(scan_id, scan_type, domain))
    scan_tasks[scan_id] = task
    task.add_done_callback(lambda t: scan_tasks.pop(scan_id, None))
    return scan_id


@asynccontextmanager
async def lifespan(app: FastAPI):
    _hydrate_scans_from_registry()
    try:
        train_model()
    except Exception:
        pass
    yield


app = FastAPI(title=PRODUCT_NAME, version=PRODUCT_VERSION, lifespan=lifespan)


@app.get("/", response_class=HTMLResponse)
async def index():
    with open("static/index.html") as f:
        return HTMLResponse(f.read())


@app.get("/api/model")
async def api_model():
    try:
        return get_model_dict()
    except Exception as e:
        return {"error": str(e), "trained": False}


@app.get("/api/scope")
async def api_scope():
    return {
        "domains": SCOPE_DOMAINS,
        "universal_mode": UNIVERSAL_MODE,
        "min_confidence": VERIFIED_MIN_CONFIDENCE,
        "mega_check_target": MEGA_CHECK_TARGET,
        "mega_check_surface": mega_check_surface(),
        "workers": MEGA_CONCURRENCY,
        "product": PRODUCT_NAME,
        "version": PRODUCT_VERSION,
        "features": [
            "verified_only_exploits",
            "ai_active_exploitation",
            "1m_parallel_fuzzing",
            "dual_progress_bars",
            "false_positive_killer",
            "param_coverage_heatmap",
            "bugcrowd_report_generator",
            "scan_history",
            "risk_score",
            "universal_domain",
            "source_line_analysis",
            "continuous_worker_pool",
            "owasp_deep_attack_hunter",
            "elite_exploit_suite",
            "jwt_oauth_cache_attacks",
            "ldap_xpath_deserialization",
            "subdomain_takeover_race",
            "bola_type_juggling",
            "graphql_depth_abuse",
            "xxe_nosql_cmdi_probes",
            "js_endpoint_mining",
            "cloud_metadata_ssrf",
            "iso27001_compliance_reports",
            "nist_csf_800_53_mapping",
            "cvss31_scoring",
            "pci_dss_gdpr_soc2",
            "owasp_asvs_verification",
            "multi_standard_export",
        ],
    }


@app.post("/api/scan")
async def start_scan(
    domain: str = Query(..., description="Any domain e.g. example.com or images.nasa.gov"),
    scan_type: str = Query("mega", enum=["mega", "super"]),
):
    scan_id = _queue_scan(scan_type, domain)
    return {
        "scan_id": scan_id,
        "scan_type": scan_type,
        "target_domain": normalize_domain(domain),
        "mega_checks": MEGA_CHECK_TARGET,
        "check_surface": mega_check_surface(),
        "workers": MEGA_CONCURRENCY,
        "universal_mode": UNIVERSAL_MODE,
    }


@app.post("/api/scan/stop")
async def stop_active_scan(scan_id: str | None = Query(None, description="Scan ID; defaults to latest active scan")):
    sid = scan_id or latest_scan_id or find_active_scan_id()
    if not sid:
        return JSONResponse({"ok": False, "error": "not found", "message": "No active scan"}, status_code=404)
    result = _stop_scan_impl(sid)
    if isinstance(result, JSONResponse):
        return result
    return result


@app.get("/api/scan/latest")
async def latest():
    if not latest_scan_id:
        return JSONResponse({"error": "no scan"}, status_code=404)
    return _scan_response(latest_scan_id)


@app.get("/api/scan/{scan_id}")
async def get_scan(scan_id: str):
    if not _ensure_scan_loaded(scan_id):
        return JSONResponse({"error": "not found"}, status_code=404)
    return _scan_response(scan_id)


@app.post("/api/scan/{scan_id}/stop")
async def stop_scan(scan_id: str):
    result = _stop_scan_impl(scan_id)
    if isinstance(result, JSONResponse):
        return result
    return result


def _scan_response(scan_id: str) -> dict:
    data = dict(scans[scan_id])
    result = data.get("result", {})
    data["verified_findings"] = result.get("verified_findings", [])
    data["submittable_reports"] = result.get("submittable_reports", [])
    data["stats"] = data.get("stats") or result.get("stats", {})
    prog = max(int(data.get("progress") or 0), int(data.get("overall_pct") or 0))
    data["progress"] = prog
    data["overall_pct"] = prog
    data.setdefault("fuzz_pct", 0)
    feed = threat_feeds.get(scan_id)
    if feed and not data.get("live_threats"):
        snap = feed.snapshot()
        data["live_threats"] = snap["threats"]
        data["threat_summary"] = snap["summary"]
    return data


@app.get("/api/scan/{scan_id}/threats")
async def get_threats(scan_id: str, since: int = Query(0, description="Event ID to stream from")):
    if scan_id not in scans:
        return JSONResponse({"error": "not found"}, status_code=404)
    feed = threat_feeds.get(scan_id)
    if not feed:
        return {"scan_id": scan_id, "threats": scans[scan_id].get("live_threats", []),
                "summary": scans[scan_id].get("threat_summary", {})}
    return feed.snapshot(since_id=since)


@app.get("/api/scan/{scan_id}/stream")
async def threat_stream_sse(scan_id: str):
    """Server-Sent Events — real-time threat stream."""
    if scan_id not in scans:
        return JSONResponse({"error": "not found"}, status_code=404)

    feed = threat_feeds.setdefault(scan_id, ThreatFeed(scan_id))
    queue = feed.subscribe()

    async def event_generator():
        import json
        # Send current snapshot first
        snap = feed.snapshot()
        yield f"data: {json.dumps({'type': 'snapshot', **snap}, default=str)}\n\n"
        try:
            while scans.get(scan_id, {}).get("status") in ("running", "queued"):
                try:
                    evt = await asyncio.wait_for(queue.get(), timeout=1.0)
                    yield feed.to_sse(evt)
                except asyncio.TimeoutError:
                    yield f": keepalive\n\n"
                if scans.get(scan_id, {}).get("status") == "completed":
                    final = feed.snapshot()
                    yield f"data: {json.dumps({'type': 'complete', **final}, default=str)}\n\n"
                    break
        finally:
            feed.unsubscribe(queue)

    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.get("/api/verified/{scan_id}")
async def verified_only(scan_id: str):
    if scan_id not in scans:
        return JSONResponse({"error": "not found"}, status_code=404)
    r = scans[scan_id].get("result", {})
    return {
        "verified": r.get("verified_findings", []),
        "submittable": r.get("submittable_reports", []),
        "count": len(r.get("verified_findings", [])),
        "risk_score": (r.get("stats") or {}).get("risk_score", 0),
    }


@app.get("/api/history")
async def history():
    return {"scans": list_history()}


@app.get("/api/reports/standards")
async def report_standards():
    return {"standards": list_standards(), "count": len(REPORT_STANDARDS)}


@app.get("/api/reports/{scan_id}")
async def get_compliance_report(
    scan_id: str,
    standard: str = Query("iso27001", description="Report standard: iso27001, nist_csf, cvss31, pci_dss, gdpr, soc2, etc."),
    format: str = Query("json", enum=["json", "text", "html"]),
):
    if scan_id not in scans:
        return JSONResponse({"error": "scan not found"}, status_code=404)
    scan_data = scans[scan_id]
    if scan_data.get("status") != "completed":
        return JSONResponse({"error": "scan not completed", "status": scan_data.get("status")}, status_code=400)

    cached = scan_data.get("compliance_reports")
    if cached and standard in cached:
        report = cached[standard]
    else:
        result = scan_data.get("result", {})
        report = generate_report(result, standard)

    if format == "text":
        from fastapi.responses import PlainTextResponse
        return PlainTextResponse(report["content"])
    if format == "html":
        from fastapi.responses import HTMLResponse
        return HTMLResponse(report["content_html"])
    return report


@app.get("/api/reports/{scan_id}/all")
async def get_all_compliance_reports(scan_id: str):
    if scan_id not in scans:
        return JSONResponse({"error": "scan not found"}, status_code=404)
    scan_data = scans[scan_id]
    if scan_data.get("status") != "completed":
        return JSONResponse({"error": "scan not completed"}, status_code=400)

    cached = scan_data.get("compliance_reports")
    if cached:
        return {
            "scan_id": scan_id,
            "target_domain": scan_data.get("target_domain"),
            "standards": list_standards(),
            "reports": {
                k: {
                    "standard_info": v.get("standard_info"),
                    "meta": v.get("meta"),
                    "verified_count": v.get("verified_count"),
                    "preview": (v.get("content") or "")[:500],
                }
                for k, v in cached.items()
            },
        }
    result = scan_data.get("result", {})
    all_r = generate_all_reports(result)
    return {
        "scan_id": scan_id,
        "standards": list_standards(),
        "reports": {k: {"meta": v["meta"], "preview": v["content"][:500]} for k, v in all_r.items()},
    }


@app.get("/api/boot")
async def boot():
    return {
        "latest_scan_id": latest_scan_id,
        "product": PRODUCT_NAME,
        "version": PRODUCT_VERSION,
        "modules": platform.get_modules(),
        "model": get_model_dict() if True else {},
        "scope": {
            "domains": SCOPE_DOMAINS,
            "universal_mode": UNIVERSAL_MODE,
            "mega_check_target": MEGA_CHECK_TARGET,
            "mega_check_surface": mega_check_surface(),
            "workers": MEGA_CONCURRENCY,
            "features": [
                "unified_dashboard", "web_scanner", "phishing_simulation",
                "darkweb_monitor", "cspm", "api_security", "compliance_automation",
                "realtime_threats", "iso_reports", "pdf_export",
            ],
        },
        "history": list_history(10),
        "scan": _scan_response(latest_scan_id) if latest_scan_id and latest_scan_id in scans else None,
    }


# ── Unified Security Platform APIs ───────────────────────────────────────────

@app.get("/api/platform/modules")
async def platform_modules():
    return {"modules": platform.get_modules(), "product": PRODUCT_NAME, "version": PRODUCT_VERSION}


@app.get("/api/platform/dashboard")
async def platform_dashboard(domain: str = Query("example.com")):
    scan_stats = {}
    if latest_scan_id and latest_scan_id in scans:
        r = scans[latest_scan_id].get("result", {})
        if r.get("target_domain") == normalize_domain(domain):
            scan_stats = r.get("stats", {})
    return platform.unified_dashboard(domain, scan_stats)


@app.get("/api/platform/phishing/templates")
async def phishing_templates():
    return {"templates": platform.phishing_templates(), "training": platform.phishing_training()}


@app.get("/api/platform/phishing/overview")
async def phishing_overview(domain: str = Query(...)):
    return platform.phishing_overview(normalize_domain(domain))


@app.post("/api/platform/phishing/launch")
async def launch_phishing(domain: str = Query(...), template_id: str = Query("invoice")):
    return await platform.launch_phishing_campaign(normalize_domain(domain), template_id)


@app.get("/api/platform/phishing/scorecard")
async def phishing_scorecard(domain: str = Query(...)):
    return platform.phishing_scorecard(normalize_domain(domain))


@app.post("/api/platform/darkweb/scan")
async def darkweb_scan(domain: str = Query(...)):
    return await platform.darkweb_scan(normalize_domain(domain))


@app.get("/api/platform/darkweb/status")
async def darkweb_status(domain: str = Query(...)):
    return platform.darkweb_status(normalize_domain(domain))


@app.post("/api/platform/cspm/scan")
async def cspm_scan(domain: str = Query(...), provider: str = Query("aws", enum=["aws", "azure", "gcp"])):
    return await platform.cspm_scan(normalize_domain(domain), provider)


@app.get("/api/platform/cspm/overview")
async def cspm_overview(domain: str = Query(...)):
    return platform.cspm_overview(normalize_domain(domain))


@app.post("/api/platform/api/scan")
async def api_security_scan(domain: str = Query(...)):
    return await platform.api_scan(normalize_domain(domain))


@app.get("/api/platform/compliance/overview")
async def compliance_overview(domain: str = Query(...)):
    return platform.compliance_overview(normalize_domain(domain))


@app.get("/api/platform/compliance/frameworks")
async def compliance_frameworks():
    return {"frameworks": platform.compliance_frameworks()}


@app.get("/api/platform/compliance/tasks")
async def compliance_tasks(framework: str = Query("iso27001")):
    return {"framework": framework, "tasks": platform.compliance_tasks(framework)}


@app.patch("/api/platform/compliance/tasks/{task_id}")
async def update_compliance_task(task_id: str, domain: str = Query(...),
                                  framework: str = Query("iso27001"), status: str = Query(...)):
    return platform.update_compliance_task(normalize_domain(domain), framework, task_id, status)


@app.get("/api/platform/alerts/channels")
async def alert_channels():
    return {"channels": platform.alert_channels()}


app.mount("/static", StaticFiles(directory="static"), name="static")
