import dns from "node:dns/promises";
import net from "node:net";
import tls from "node:tls";
import { prisma } from "@/lib/db";
import { broadcastScanEvent } from "@/lib/supabase";
import { SCAN_PHASES } from "@/lib/scan-phases";
import type { ScanMode, Severity } from "@prisma/client";

const PORTS_LIGHT = [80, 443];
const PORTS_FULL = [21, 22, 80, 443, 3000, 8080, 8443];
const SUBDOMAIN_LIGHT = ["www", "api", "mail", "admin", "dev"];
const SUBDOMAIN_FULL = [
  "www", "api", "mail", "admin", "dev", "staging", "app", "cdn", "vpn",
  "portal", "test", "beta", "docs", "status", "git", "ci",
];
const PATHS_LIGHT = ["/admin", "/.env", "/api", "/robots.txt"];
const PATHS_FULL = [
  "/admin", "/.env", "/api", "/backup", "/config", "/.git/HEAD",
  "/robots.txt", "/wp-admin", "/phpinfo.php", "/server-status",
  "/.well-known/security.txt", "/api/v1", "/graphql",
];

const SECURITY_HEADERS = [
  "strict-transport-security",
  "content-security-policy",
  "x-frame-options",
  "x-content-type-options",
] as const;

type FindingInput = {
  title: string;
  description: string;
  severity: Severity;
  category: string;
  cweId?: string;
  cvssScore?: number;
  url: string;
  remediation?: string;
  confidence?: number;
};

const activeScans = new Set<string>();

function portsForMode(mode: ScanMode) {
  return mode === "LIGHTNING" ? PORTS_LIGHT : PORTS_FULL;
}
function subsForMode(mode: ScanMode) {
  return mode === "LIGHTNING" ? SUBDOMAIN_LIGHT : SUBDOMAIN_FULL;
}
function pathsForMode(mode: ScanMode) {
  return mode === "LIGHTNING" ? PATHS_LIGHT : mode === "MEGA" || mode === "SUPER" ? PATHS_FULL : PATHS_FULL.slice(0, 8);
}

function tcpConnect(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });
    const done = (ok: boolean) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs);
    socket.once("connect", () => done(true));
    socket.once("timeout", () => done(false));
    socket.once("error", () => done(false));
  });
}

async function resolveHost(hostname: string): Promise<string | null> {
  try {
    const [addr] = await dns.resolve4(hostname);
    return addr ?? null;
  } catch {
    try {
      const [addr] = await dns.resolve6(hostname);
      return addr ?? null;
    } catch {
      return null;
    }
  }
}

async function fetchHeaders(url: string): Promise<{ status: number; headers: Headers } | null> {
  try {
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "QuantumShield-Scanner/1.0" },
    });
    return { status: res.status, headers: res.headers };
  } catch {
    return null;
  }
}

function checkTls(hostname: string): Promise<{ daysLeft: number; valid: boolean; issuer?: string } | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert || !cert.valid_to) {
          resolve(null);
          return;
        }
        const expires = new Date(cert.valid_to);
        const daysLeft = Math.floor((expires.getTime() - Date.now()) / 86_400_000);
        const issuerRaw = cert.issuer?.O;
        const issuer = Array.isArray(issuerRaw) ? issuerRaw.join(", ") : issuerRaw;
        resolve({ daysLeft, valid: daysLeft > 0, issuer });
      }
    );
    socket.setTimeout(4000, () => {
      socket.destroy();
      resolve(null);
    });
    socket.on("error", () => resolve(null));
  });
}

async function setProgress(
  scanId: string,
  progress: number,
  phase: string,
  phaseIndex: number
) {
  await prisma.scan.update({
    where: { id: scanId },
    data: {
      progress,
      currentPhase: phase,
      fuzzProgress: Math.floor((progress / 100) * 1000),
    },
  });
  await broadcastScanEvent(scanId, {
    type: "progress",
    progress,
    currentPhase: phase,
    phaseIndex,
  });
}

async function persistFinding(
  scan: {
    id: string;
    orgId: string;
    domainId: string;
    userId: string;
  },
  f: FindingInput
) {
  const finding = await prisma.finding.create({
    data: {
      orgId: scan.orgId,
      domainId: scan.domainId,
      scanId: scan.id,
      userId: scan.userId,
      title: f.title,
      description: f.description,
      severity: f.severity,
      category: f.category,
      cweId: f.cweId,
      cvssScore: f.cvssScore,
      url: f.url,
      method: "GET",
      confidence: f.confidence ?? 0.9,
      remediation: f.remediation,
    },
  });

  const field =
    f.severity === "CRITICAL"
      ? "criticalCount"
      : f.severity === "HIGH"
        ? "highCount"
        : f.severity === "MEDIUM"
          ? "mediumCount"
          : f.severity === "LOW"
            ? "lowCount"
            : "infoCount";

  await prisma.scan.update({
    where: { id: scan.id },
    data: {
      findingsCount: { increment: 1 },
      [field]: { increment: 1 },
    },
  });

  await broadcastScanEvent(scan.id, {
    type: "finding",
    finding: {
      id: finding.id,
      title: finding.title,
      severity: finding.severity,
      url: finding.url,
      parameter: finding.parameter,
      confidence: finding.confidence,
      createdAt: finding.createdAt.toISOString(),
    },
  });
}

/** Real network scan: DNS, ports, HTTP headers, TLS, path probe. */
export async function startScanSimulation(scanId: string): Promise<void> {
  if (activeScans.has(scanId)) return;
  activeScans.add(scanId);

  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { domain: true },
    });
    if (!scan || scan.status !== "PENDING") {
      activeScans.delete(scanId);
      return;
    }

    const domain = scan.domain.name.replace(/^https?:\/\//, "").split("/")[0];
    const baseHttps = `https://${domain}`;
    const mode = scan.mode;

    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "RUNNING", startedAt: new Date(), totalPhases: SCAN_PHASES.length },
    });

    // Phase 1 — DNS
    await setProgress(scanId, 8, "DNS Resolution", 1);
    const apexIp = await resolveHost(domain);
    if (!apexIp) {
      await persistFinding(scan, {
        title: "DNS resolution failed",
        description: `Could not resolve A/AAAA for ${domain}`,
        severity: "HIGH",
        category: "DNS",
        cweId: "CWE-754",
        cvssScore: 7.0,
        url: baseHttps,
        remediation: "Verify DNS records are correctly configured.",
      });
    }

    const liveHosts: string[] = apexIp ? [domain] : [];
    const subs = subsForMode(mode);
    const subResults = await Promise.all(
      subs.map(async (sub) => {
        const host = `${sub}.${domain}`;
        const ip = await resolveHost(host);
        return ip ? host : null;
      })
    );
    for (const h of subResults) {
      if (h) liveHosts.push(h);
    }

    await prisma.scanLog.create({
      data: {
        orgId: scan.orgId,
        scanId,
        phase: "dns",
        message: `Resolved ${liveHosts.length} host(s); apex=${apexIp ?? "none"}`,
        metadata: { hosts: liveHosts },
      },
    }).catch(() => undefined);

    // Phase 2 — Ports
    await setProgress(scanId, 25, "Port Scan", 3);
    const ports = portsForMode(mode);
    const hostForPorts = liveHosts[0] ?? domain;
    const openPorts: number[] = [];
    await Promise.all(
      ports.map(async (port) => {
        if (await tcpConnect(hostForPorts, port)) openPorts.push(port);
      })
    );
    if (openPorts.includes(22)) {
      await persistFinding(scan, {
        title: "SSH port exposed",
        description: `Port 22 open on ${hostForPorts}`,
        severity: "MEDIUM",
        category: "Network",
        cweId: "CWE-200",
        cvssScore: 5.3,
        url: `ssh://${hostForPorts}:22`,
        remediation: "Restrict SSH to trusted IPs; use key-based auth.",
      });
    }

    // Phase 3 — HTTP security headers
    await setProgress(scanId, 45, "HTTP Security Headers", 5);
    const httpResult = await fetchHeaders(baseHttps);
    if (httpResult) {
      for (const header of SECURITY_HEADERS) {
        if (!httpResult.headers.get(header)) {
          const isCritical = header === "content-security-policy";
          await persistFinding(scan, {
            title: `Missing ${header}`,
            description: `Response from ${baseHttps} lacks ${header}`,
            severity: isCritical ? "HIGH" : header === "strict-transport-security" ? "MEDIUM" : "LOW",
            category: "Misconfiguration",
            cweId: "CWE-693",
            cvssScore: isCritical ? 7.0 : 5.0,
            url: baseHttps,
            remediation: `Add the ${header} response header.`,
          });
        }
      }
      const server = httpResult.headers.get("server");
      if (server && /apache\/|nginx\/|iis/i.test(server)) {
        await persistFinding(scan, {
          title: "Server version disclosure",
          description: `Server header exposes: ${server}`,
          severity: "INFO",
          category: "Info Leak",
          cweId: "CWE-200",
          cvssScore: 2.0,
          url: baseHttps,
          remediation: "Suppress or generalize the Server header.",
        });
      }
    } else {
      await persistFinding(scan, {
        title: "HTTPS unreachable",
        description: `Could not fetch ${baseHttps}`,
        severity: "HIGH",
        category: "Availability",
        cweId: "CWE-754",
        cvssScore: 7.5,
        url: baseHttps,
        remediation: "Ensure the site serves HTTPS on port 443.",
      });
    }

    // Phase 4 — TLS
    await setProgress(scanId, 60, "TLS Certificate", 7);
    const tlsInfo = await checkTls(domain);
    if (tlsInfo) {
      if (tlsInfo.daysLeft < 0) {
        await persistFinding(scan, {
          title: "TLS certificate expired",
          description: `Certificate for ${domain} expired ${Math.abs(tlsInfo.daysLeft)} days ago`,
          severity: "CRITICAL",
          category: "Crypto",
          cweId: "CWE-295",
          cvssScore: 9.1,
          url: baseHttps,
          remediation: "Renew the TLS certificate immediately.",
        });
      } else if (tlsInfo.daysLeft < 30) {
        await persistFinding(scan, {
          title: "TLS certificate expiring soon",
          description: `Certificate expires in ${tlsInfo.daysLeft} days`,
          severity: "HIGH",
          category: "Crypto",
          cweId: "CWE-298",
          cvssScore: 7.0,
          url: baseHttps,
          remediation: "Renew certificate before expiry.",
        });
      }
    } else if (openPorts.includes(443) || httpResult) {
      await persistFinding(scan, {
        title: "TLS handshake failed",
        description: `Could not complete TLS handshake with ${domain}:443`,
        severity: "HIGH",
        category: "Crypto",
        cweId: "CWE-295",
        cvssScore: 7.4,
        url: baseHttps,
        remediation: "Fix TLS configuration and certificate chain.",
      });
    }

    // Phase 5 — Path fuzz
    await setProgress(scanId, 80, "Path Discovery", 10);
    const paths = pathsForMode(mode);
    await Promise.all(
      paths.map(async (path) => {
        const url = `${baseHttps}${path}`;
        const res = await fetchHeaders(url);
        if (!res) return;
        if (res.status === 200 && (path.includes(".env") || path.includes(".git") || path === "/phpinfo.php" || path === "/backup")) {
          await persistFinding(scan, {
            title: `Sensitive path exposed: ${path}`,
            description: `${url} returned HTTP ${res.status}`,
            severity: path.includes(".env") || path.includes(".git") ? "CRITICAL" : "HIGH",
            category: "Exposure",
            cweId: "CWE-538",
            cvssScore: path.includes(".env") ? 9.8 : 7.5,
            url,
            remediation: "Block public access to sensitive paths.",
          });
        } else if (res.status === 200 && (path === "/admin" || path === "/wp-admin")) {
          await persistFinding(scan, {
            title: `Admin surface reachable: ${path}`,
            description: `${url} returned HTTP 200`,
            severity: "MEDIUM",
            category: "Access Control",
            cweId: "CWE-284",
            cvssScore: 5.3,
            url,
            remediation: "Restrict admin panels with auth + IP allowlists.",
          });
        }
      })
    );

    // Phase 6 — Score domain
    await setProgress(scanId, 92, "Scoring", 12);
    const current = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!current || current.status === "STOPPED") return;

    const penalty =
      (current.criticalCount ?? 0) * 15 +
      (current.highCount ?? 0) * 8 +
      (current.mediumCount ?? 0) * 4 +
      (current.lowCount ?? 0) * 1;
    const score = Math.max(0, Math.min(100, 100 - penalty));
    const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

    await prisma.domain.update({
      where: { id: scan.domainId },
      data: { securityScore: score, grade, lastScannedAt: new Date() },
    });

    const completedAt = new Date();
    const started = await prisma.scan.findUnique({
      where: { id: scanId },
      select: { startedAt: true },
    });
    await prisma.scan.update({
      where: { id: scanId },
      data: {
        status: "COMPLETED",
        progress: 100,
        completedAt,
        durationMs: started?.startedAt
          ? completedAt.getTime() - started.startedAt.getTime()
          : null,
        currentPhase: "Complete",
        results: {
          apexIp,
          liveHosts,
          openPorts,
          tls: tlsInfo,
          score,
          grade,
        },
      },
    });

    await prisma.subscription.updateMany({
      where: { orgId: scan.orgId },
      data: { scansUsedThisMonth: { increment: 1 } },
    });

    await setProgress(scanId, 100, "Complete", 13);
    await broadcastScanEvent(scanId, { type: "complete", scanId });
  } catch (err) {
    console.error("Scan engine error:", err);
    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "FAILED", currentPhase: "Failed", progress: 100 },
    }).catch(() => undefined);
    await broadcastScanEvent(scanId, { type: "error", message: String(err) }).catch(() => undefined);
  } finally {
    activeScans.delete(scanId);
  }
}

export const startRealScan = startScanSimulation;
