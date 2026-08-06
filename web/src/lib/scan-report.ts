import { prisma } from "@/lib/db";
import { buildScanReportHtml, sendEmail } from "@/lib/mail";
import { getAppUrl } from "@/lib/env";

/** Persist report + optionally email it after a scan completes. */
export async function deliverScanReport(scanId: string) {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      domain: { select: { name: true } },
      findings: {
        orderBy: [{ createdAt: "desc" }],
        take: 50,
        select: {
          title: true,
          severity: true,
          url: true,
          remediation: true,
          description: true,
        },
      },
    },
  });

  if (!scan) return { ok: false as const, error: "Scan not found" };

  const config = (scan.config ?? {}) as {
    reportEmail?: string;
    reportDeliveredAt?: string;
  };

  // Avoid duplicate deliveries on retries.
  if (config.reportDeliveredAt) {
    return { ok: true as const, skipped: true as const };
  }

  const reportEmail = config.reportEmail?.trim() || null;
  const results = (scan.results ?? {}) as { score?: number; grade?: string };
  const appUrl = getAppUrl();
  const reportUrl = `${appUrl}/dashboard/scanner/scan/${scan.id}`;
  const findingsUrl = `${appUrl}/dashboard/scanner/findings?scanId=${scan.id}`;

  const html = buildScanReportHtml({
    domain: scan.domain.name,
    mode: scan.mode,
    findingsCount: scan.findingsCount,
    critical: scan.criticalCount,
    high: scan.highCount,
    medium: scan.mediumCount,
    low: scan.lowCount,
    findings: scan.findings,
    reportUrl: findingsUrl,
    score: results.score ?? null,
    grade: results.grade ?? null,
  });

  const markdown = [
    `# Scan report — ${scan.domain.name}`,
    ``,
    `Mode: ${scan.mode}`,
    `Findings: ${scan.findingsCount} (C:${scan.criticalCount} H:${scan.highCount} M:${scan.mediumCount} L:${scan.lowCount})`,
    results.grade ? `Grade: ${results.grade}` : "",
    ``,
    ...scan.findings.map(
      (f) => `- **[${f.severity}]** ${f.title} — \`${f.url}\``
    ),
    ``,
    `View findings: ${findingsUrl}`,
    `Scan detail: ${reportUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const report = await prisma.report.create({
    data: {
      orgId: scan.orgId,
      userId: scan.userId,
      title: `Scan report — ${scan.domain.name}`,
      type: "TECHNICAL_VULNERABILITY",
      format: "HTML",
      content: markdown,
      status: "GENERATED",
      sentAt: reportEmail ? new Date() : null,
      config: {
        scanId: scan.id,
        reportEmail,
        reportUrl: findingsUrl,
      },
    },
  });

  let emailResult: Awaited<ReturnType<typeof sendEmail>> | null = null;

  if (reportEmail) {
    emailResult = await sendEmail({
      to: reportEmail,
      subject: `QuantumShield report: ${scan.domain.name} (${scan.findingsCount} findings)`,
      html,
      text: markdown,
    });

    await prisma.notification
      .create({
        data: {
          userId: scan.userId,
          title: emailResult.ok
            ? "Scan report emailed"
            : "Scan report ready (email failed)",
          message: emailResult.ok
            ? emailResult.provider === "inapp"
              ? `Report for ${scan.domain.name} is ready. Add RESEND_API_KEY to send to inbox (${reportEmail}).`
              : `Report for ${scan.domain.name} was sent to ${reportEmail}.`
            : `Could not email ${reportEmail}: ${"error" in emailResult ? emailResult.error : "unknown"}. Open findings in the dashboard.`,
          type: emailResult.ok ? "SUCCESS" : "WARNING",
          link: findingsUrl,
        },
      })
      .catch(() => undefined);
  } else {
    await prisma.notification
      .create({
        data: {
          userId: scan.userId,
          title: "Scan complete",
          message: `${scan.domain.name}: ${scan.findingsCount} findings. Open history to review.`,
          type: "INFO",
          link: findingsUrl,
        },
      })
      .catch(() => undefined);
  }

  await prisma.scan
    .update({
      where: { id: scanId },
      data: {
        config: {
          ...config,
          reportEmail,
          reportDeliveredAt: new Date().toISOString(),
          reportDelivery: emailResult,
          reportId: report.id,
        },
      },
    })
    .catch(() => undefined);

  return {
    ok: true as const,
    reportId: report.id,
    emailed: Boolean(reportEmail && emailResult?.ok && emailResult.provider === "resend"),
    emailResult,
  };
}
