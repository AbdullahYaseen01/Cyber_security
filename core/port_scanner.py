"""Lightweight async TCP port scanner — Weidman Ch.5 Nmap methodology.

Scans common service ports to map attack surface before exploitation.
"""

from __future__ import annotations

import asyncio
import socket
from typing import Any

from core.config import PORT_SCAN_TIMEOUT, PORT_SCAN_CONCURRENCY

# Weidman Ch.5/Ch.6 — ports commonly probed during pentests
COMMON_PORTS: dict[int, str] = {
    21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP", 53: "DNS",
    80: "HTTP", 110: "POP3", 111: "RPC", 135: "MSRPC", 139: "NetBIOS",
    143: "IMAP", 443: "HTTPS", 445: "SMB", 993: "IMAPS", 995: "POP3S",
    1433: "MSSQL", 1521: "Oracle", 3306: "MySQL", 3389: "RDP",
    5432: "PostgreSQL", 5900: "VNC", 6379: "Redis", 8080: "HTTP-Alt",
    8443: "HTTPS-Alt", 8888: "HTTP-Alt", 9200: "Elasticsearch",
    27017: "MongoDB",
}

# Version hints from banner grab (Ch.6 — nmap -sV concept)
_BANNER_VULNS: dict[str, list[tuple[str, str, str]]] = {
    "vsftpd 2.3.4": [("CVE-2011-2523", "critical", "Vsftpd 2.3.4 backdoor")],
    "openssh": [("version-check", "info", "OpenSSH version disclosed")],
    "apache": [("version-check", "info", "Apache version disclosed")],
    "nginx": [("version-check", "info", "Nginx version disclosed")],
    "microsoft-iis": [("version-check", "info", "IIS version disclosed")],
}


class PortScanner:
    """Async TCP connect scanner for web targets."""

    def __init__(self):
        self.findings: list[dict] = []
        self.open_ports: list[dict] = []
        self.stats = {"ports_scanned": 0, "open": 0}

    def _add(self, **kw) -> None:
        self.findings.append({
            "id": kw.get("id", f"port-{abs(hash(kw.get('target', ''))) % 10**9}"),
            "target": kw["target"],
            "title": kw["title"],
            "severity": kw.get("severity", "info"),
            "category": kw.get("category", "Network"),
            "description": kw.get("description", ""),
            "evidence": (kw.get("evidence") or "")[:400],
            "remediation": kw.get("remediation", "Close unnecessary ports."),
            "exploitable": kw.get("exploitable", False),
            "detection_source": "port_scanner",
            "technique": kw.get("technique", "port_scan"),
            "confidence": kw.get("confidence", 85),
        })

    async def run(self, host: str, ports: list[int] | None = None) -> dict[str, Any]:
        self.findings = []
        self.open_ports = []
        self.stats = {"ports_scanned": 0, "open": 0}
        host = host.lower().lstrip("www.")
        port_list = ports or list(COMMON_PORTS.keys())

        sem = asyncio.Semaphore(PORT_SCAN_CONCURRENCY)

        async def probe(port: int) -> dict | None:
            async with sem:
                self.stats["ports_scanned"] += 1
                try:
                    _, writer = await asyncio.wait_for(
                        asyncio.open_connection(host, port),
                        timeout=PORT_SCAN_TIMEOUT,
                    )
                    writer.close()
                    try:
                        await writer.wait_closed()
                    except Exception:
                        pass
                    banner = await self._grab_banner(host, port)
                    service = COMMON_PORTS.get(port, "unknown")
                    entry = {"port": port, "service": service, "banner": banner}
                    self.open_ports.append(entry)
                    self.stats["open"] += 1
                    return entry
                except Exception:
                    return None

        results = await asyncio.gather(*(probe(p) for p in port_list))
        open_entries = [r for r in results if r]

        if open_entries:
            ports_str = ", ".join(f"{e['port']}/{e['service']}" for e in open_entries[:15])
            self._add(
                id=f"ports-open-{hash(host) % 10**8}",
                target=host,
                title=f"Open Ports Discovered ({len(open_entries)})",
                severity="info", category="Attack Surface",
                technique="tcp_connect_scan",
                evidence=ports_str,
                description="TCP connect scan per Weidman Ch.5 Nmap methodology.",
            )

        for entry in open_entries:
            banner = (entry.get("banner") or "").lower()
            for sig, vulns in _BANNER_VULNS.items():
                if sig in banner:
                    for cve, sev, desc in vulns:
                        self._add(
                            id=f"banner-{entry['port']}-{hash(sig) % 10**8}",
                            target=f"{host}:{entry['port']}",
                            title=f"Service Banner: {desc}",
                            severity=sev, category="Version Disclosure",
                            technique="banner_grab",
                            evidence=entry.get("banner", "")[:200],
                            exploitable=sev == "critical",
                            confidence=90 if sev == "critical" else 60,
                        )

        dangerous = [e for e in open_entries if e["port"] in (21, 23, 445, 3389, 1433, 3306, 6379, 27017)]
        for e in dangerous:
            self._add(
                id=f"danger-port-{e['port']}-{hash(host) % 10**8}",
                target=f"{host}:{e['port']}",
                title=f"High-Risk Service Exposed: {e['service']} (port {e['port']})",
                severity="medium", category="Attack Surface",
                technique="risky_port",
                evidence=e.get("banner") or f"Port {e['port']} open",
                description=f"{e['service']} should not be internet-facing.",
            )

        return {
            "findings": self.findings,
            "open_ports": self.open_ports,
            "stats": self.stats,
        }

    async def _grab_banner(self, host: str, port: int) -> str:
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port),
                timeout=PORT_SCAN_TIMEOUT,
            )
            if port in (80, 8080, 8000, 8888):
                writer.write(f"HEAD / HTTP/1.0\r\nHost: {host}\r\n\r\n".encode())
            elif port in (443, 8443):
                return ""
            else:
                writer.write(b"\r\n")
            await writer.drain()
            banner = await asyncio.wait_for(reader.read(256), timeout=2)
            writer.close()
            return banner.decode("utf-8", errors="replace").strip()[:200]
        except Exception:
            return ""
