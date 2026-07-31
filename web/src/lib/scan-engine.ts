import { prisma } from "@/lib/db";
import { broadcastScanEvent } from "@/lib/supabase";
import { SCAN_PHASES } from "@/lib/scan-phases";
import type { ScanMode, Severity } from "@prisma/client";

const PROGRESS_STEPS = [0, 8, 15, 23, 30, 38, 45, 53, 61, 69, 77, 85, 92, 100];

const VULN_DB = [
  { title: "SQL Injection in search parameter", category: "SQL Injection", severity: "CRITICAL" as Severity, cweId: "CWE-89", cvss: 9.8 },
  { title: "Reflected XSS in query parameter", category: "Cross-Site Scripting", severity: "HIGH" as Severity, cweId: "CWE-79", cvss: 7.5 },
  { title: "Server-Side Request Forgery", category: "SSRF", severity: "HIGH" as Severity, cweId: "CWE-918", cvss: 8.2 },
  { title: "Local File Inclusion vulnerability", category: "LFI", severity: "HIGH" as Severity, cweId: "CWE-22", cvss: 7.8 },
  { title: "Missing Content-Security-Policy header", category: "Security Misconfiguration", severity: "MEDIUM" as Severity, cweId: "CWE-693", cvss: 5.3 },
  { title: "Insecure direct object reference", category: "IDOR", severity: "HIGH" as Severity, cweId: "CWE-639", cvss: 7.1 },
  { title: "SSTI in template parameter", category: "SSTI", severity: "CRITICAL" as Severity, cweId: "CWE-94", cvss: 9.1 },
  { title: "Open redirect in return URL", category: "Open Redirect", severity: "MEDIUM" as Severity, cweId: "CWE-601", cvss: 4.7 },
  { title: "Missing HSTS header", category: "Transport Security", severity: "LOW" as Severity, cweId: "CWE-319", cvss: 3.1 },
  { title: "Information disclosure in error messages", category: "Information Disclosure", severity: "INFO" as Severity, cweId: "CWE-209", cvss: 2.0 },
];

const PATHS = ["/api/search", "/api/users", "/login", "/admin", "/api/v1/products", "/upload"];
const PARAMS = ["id", "q", "search", "url", "file", "redirect"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getPhasesForMode(mode: ScanMode): number[] {
  if (mode === "LIGHTNING") return [0, 2, 7, 12];
  return PROGRESS_STEPS.map((_, i) => i).slice(1);
}

function maxFindingsForMode(mode: ScanMode): number {
  if (mode === "LIGHTNING") return 5 + Math.floor(Math.random() * 6);
  if (mode === "STANDARD") return 20 + Math.floor(Math.random() * 31);
  return 30 + Math.floor(Math.random() * 21);
}

const activeScans = new Set<string>();

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

    const phases = getPhasesForMode(scan.mode);
    const maxFindings = maxFindingsForMode(scan.mode);
    let findingsCreated = 0;

    await prisma.scan.update({
      where: { id: scanId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    for (let i = 0; i < phases.length; i++) {
      const current = await prisma.scan.findUnique({ where: { id: scanId } });
      if (!current || current.status === "STOPPED") break;

      const phaseIndex = phases[i];
      const progress = PROGRESS_STEPS[phaseIndex] ?? 100;
      const phase = SCAN_PHASES[phaseIndex] ?? SCAN_PHASES[SCAN_PHASES.length - 1];

      await prisma.scan.update({
        where: { id: scanId },
        data: {
          progress,
          currentPhase: phase.label,
          fuzzProgress: Math.floor((progress / 100) * scan.fuzzTotal),
        },
      });

      await broadcastScanEvent(scanId, {
        type: "progress",
        progress,
        currentPhase: phase.label,
        phaseIndex: phaseIndex + 1,
      });

      const findingsThisPhase = Math.min(
        Math.floor(Math.random() * 4),
        maxFindings - findingsCreated
      );

      for (let f = 0; f < findingsThisPhase; f++) {
        const vuln = pick(VULN_DB);
        const param = pick(PARAMS);
        const path = pick(PATHS);
        const url = `https://${scan.domain.name}${path}`;

        const finding = await prisma.finding.create({
          data: {
            orgId: scan.orgId,
            domainId: scan.domainId,
            scanId: scan.id,
            userId: scan.userId,
            title: vuln.title,
            description: `${vuln.category} detected during automated security testing on ${url}`,
            severity: vuln.severity,
            category: vuln.category,
            cweId: vuln.cweId,
            cvssScore: vuln.cvss,
            url,
            parameter: param,
            method: "GET",
            payload: `' OR 1=1--`,
            confidence: 0.7 + Math.random() * 0.29,
            remediation: `Validate and sanitize the '${param}' parameter. Use parameterized queries and output encoding.`,
          },
        });

        findingsCreated++;

        const severityField = `${vuln.severity.toLowerCase()}Count` as
          | "criticalCount"
          | "highCount"
          | "mediumCount"
          | "lowCount"
          | "infoCount";

        await prisma.scan.update({
          where: { id: scanId },
          data: {
            findingsCount: { increment: 1 },
            [severityField]: { increment: 1 },
          },
        });

        await broadcastScanEvent(scanId, {
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

      await new Promise((r) => setTimeout(r, 3000 + Math.random() * 2000));
    }

    const final = await prisma.scan.findUnique({ where: { id: scanId } });
    if (final?.status === "RUNNING") {
      const completedAt = new Date();
      const durationMs = final.startedAt
        ? completedAt.getTime() - final.startedAt.getTime()
        : 0;

      await prisma.scan.update({
        where: { id: scanId },
        data: {
          status: "COMPLETED",
          progress: 100,
          completedAt,
          durationMs,
          currentPhase: "Complete",
        },
      });

      await prisma.subscription.updateMany({
        where: { orgId: scan.orgId },
        data: { scansUsedThisMonth: { increment: 1 } },
      });

      await broadcastScanEvent(scanId, { type: "complete", scanId });
    }
  } finally {
    activeScans.delete(scanId);
  }
}
