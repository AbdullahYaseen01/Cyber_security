import { prisma } from "@/lib/db";
import type { SubscriptionTier } from "@prisma/client";
import {
  PORTAL_ACCOUNTS,
  ensurePortalUser,
  invalidatePortalCache,
  portalAccountFor,
} from "@/lib/portal-auth";

export const DEMO_CREDENTIALS = {
  email: PORTAL_ACCOUNTS.client.email,
  password: PORTAL_ACCOUNTS.client.password,
  name: PORTAL_ACCOUNTS.client.name,
  orgName: PORTAL_ACCOUNTS.client.orgName,
} as const;

export function isDemoLogin(email: string, password: string): boolean {
  return (
    email.toLowerCase() === DEMO_CREDENTIALS.email &&
    password === DEMO_CREDENTIALS.password
  );
}

export function isDemoUserEmail(email: string | null | undefined): boolean {
  return Boolean(portalAccountFor(email));
}

export function isDemoUser(
  user: { email?: string; isDemo?: boolean } | null | undefined
): boolean {
  if (!user) return false;
  return Boolean(user.isDemo) || isDemoUserEmail(user.email);
}

/**
 * Rich SOC-style demo workspace. Idempotent — re-fills if agents/findings are missing
 * so the dashboard never shows empty F-grade first impressions.
 */
export async function seedDemoWorkspace(userId: string, orgId: string) {
  const domain = await prisma.domain.upsert({
    where: { orgId_name: { orgId, name: "demo.quantumshield.io" } },
    create: {
      orgId,
      name: "demo.quantumshield.io",
      verified: true,
      securityScore: 88,
      grade: "B+",
    },
    update: { verified: true, securityScore: 88, grade: "B+" },
    select: { id: true, name: true },
  });

  // Also seed a second "customer" domain for realism
  await prisma.domain.upsert({
    where: { orgId_name: { orgId, name: "api.acme-corp.example" } },
    create: {
      orgId,
      name: "api.acme-corp.example",
      verified: true,
      securityScore: 82,
      grade: "B",
    },
    update: { verified: true, securityScore: 82, grade: "B" },
  });

  const [existingFindings, existingAgents, cloudCount, primaryDomain] = await Promise.all([
    prisma.finding.count({ where: { orgId } }),
    prisma.agent.count({ where: { orgId } }),
    prisma.cloudAccount.count({ where: { orgId } }),
    prisma.domain.findFirst({
      where: { orgId, name: "demo.quantumshield.io" },
      select: { securityScore: true, grade: true },
    }),
  ]);

  const richEnough =
    existingFindings >= 10 &&
    existingAgents >= 3 &&
    cloudCount >= 2 &&
    (primaryDomain?.securityScore ?? 0) >= 70 &&
    (primaryDomain?.grade === "B+" || primaryDomain?.grade === "B" || primaryDomain?.grade === "A");

  if (richEnough) {
    return;
  }

  // Clear partial/broken fixtures for this org, then rebuild
  await prisma.finding.deleteMany({ where: { orgId } });
  await prisma.agent.deleteMany({ where: { orgId } });
  await prisma.apiEndpoint.deleteMany({ where: { orgId } });
  await prisma.cloudAccount.deleteMany({ where: { orgId } });
  await prisma.complianceTask.deleteMany({ where: { orgId } });
  await prisma.darkWebAlert.deleteMany({ where: { orgId } }).catch(() => undefined);
  await prisma.scan.deleteMany({ where: { orgId } });

  const scan = await prisma.scan.create({
    data: {
      orgId,
      domainId: domain.id,
      userId,
      mode: "MEGA",
      status: "COMPLETED",
      progress: 100,
      findingsCount: 14,
      criticalCount: 3,
      highCount: 5,
      mediumCount: 4,
      lowCount: 2,
      startedAt: new Date(Date.now() - 2 * 3600_000),
      completedAt: new Date(Date.now() - 3600_000),
      durationMs: 3_200_000,
      currentPhase: "Complete",
      results: { score: 88, grade: "B+" },
    },
    select: { id: true },
  });

  const findings = [
    { title: "SQL Injection in /api/v1/login", severity: "CRITICAL" as const, category: "Injection", cweId: "CWE-89", cvss: 9.8, url: `https://${domain.name}/api/v1/login` },
    { title: "Exposed .env backup at /.env.bak", severity: "CRITICAL" as const, category: "Info Leak", cweId: "CWE-538", cvss: 9.1, url: `https://${domain.name}/.env.bak` },
    { title: "Unauthenticated admin panel /admin", severity: "CRITICAL" as const, category: "Access Control", cweId: "CWE-284", cvss: 9.0, url: `https://${domain.name}/admin` },
    { title: "Reflected XSS in search query", severity: "HIGH" as const, category: "XSS", cweId: "CWE-79", cvss: 7.5, url: `https://${domain.name}/search` },
    { title: "Missing HSTS and CSP headers", severity: "HIGH" as const, category: "Misconfiguration", cweId: "CWE-693", cvss: 7.1, url: `https://${domain.name}/` },
    { title: "Weak TLS — TLS 1.0 accepted", severity: "HIGH" as const, category: "Crypto", cweId: "CWE-326", cvss: 7.4, url: `https://${domain.name}/` },
    { title: "JWT alg=none accepted on /api/token", severity: "HIGH" as const, category: "Auth", cweId: "CWE-347", cvss: 8.1, url: `https://${domain.name}/api/token` },
    { title: "IDOR on /api/v1/users/{id}", severity: "HIGH" as const, category: "Access Control", cweId: "CWE-639", cvss: 7.5, url: `https://${domain.name}/api/v1/users/42` },
    { title: "Directory listing on /backup", severity: "MEDIUM" as const, category: "Misconfiguration", cweId: "CWE-548", cvss: 5.3, url: `https://${domain.name}/backup` },
    { title: "Outdated jQuery 1.12.4", severity: "MEDIUM" as const, category: "Components", cweId: "CWE-1104", cvss: 5.0, url: `https://${domain.name}/assets/jquery.js` },
    { title: "Verbose stack traces in 500 responses", severity: "MEDIUM" as const, category: "Info Leak", cweId: "CWE-209", cvss: 5.3, url: `https://${domain.name}/api/v1/orders` },
    { title: "CORS reflects arbitrary Origin", severity: "MEDIUM" as const, category: "Misconfiguration", cweId: "CWE-942", cvss: 5.4, url: `https://${domain.name}/api` },
    { title: "Missing SameSite on session cookie", severity: "LOW" as const, category: "Session", cweId: "CWE-1275", cvss: 3.7, url: `https://${domain.name}/` },
    { title: "Server version disclosed in headers", severity: "LOW" as const, category: "Info Leak", cweId: "CWE-200", cvss: 3.1, url: `https://${domain.name}/` },
  ];

  await prisma.finding.createMany({
    data: findings.map((f) => ({
      orgId,
      domainId: domain.id,
      scanId: scan.id,
      userId,
      title: f.title,
      description: `Detected during baseline assessment of ${domain.name}. ${f.title}. Map to ${f.cweId}; CVSS ${f.cvss}.`,
      severity: f.severity,
      category: f.category,
      cweId: f.cweId,
      cvssScore: f.cvss,
      url: f.url,
      status: "OPEN",
      confidence: 0.92,
      remediation:
        f.severity === "CRITICAL"
          ? "Patch immediately, rotate credentials, and restrict exposure behind auth + WAF."
          : "Remediate in the next sprint; verify with a follow-up scan.",
    })),
  });

  await Promise.all([
    prisma.agent.createMany({
      data: [
        { orgId, name: "prod-web-01", hostname: "web-01.demo", os: "Linux", version: "2.4.1", status: "ONLINE", agentType: "monitor", targetUrl: `https://${domain.name}`, cronSchedule: "*/15 * * * *", lastHeartbeat: new Date(), lastRunAt: new Date() },
        { orgId, name: "prod-api-02", hostname: "api-02.demo", os: "Linux", version: "2.4.1", status: "ONLINE", agentType: "monitor", targetUrl: `https://${domain.name}/api`, cronSchedule: "*/30 * * * *", lastHeartbeat: new Date(), lastRunAt: new Date() },
        { orgId, name: "edge-waf-03", hostname: "waf-03.demo", os: "Linux", version: "2.4.0", status: "ONLINE", agentType: "responder", lastHeartbeat: new Date() },
        { orgId, name: "compliance-sweep", hostname: "ctrl-01.demo", os: "Linux", version: "2.4.1", status: "ONLINE", agentType: "compliance", lastHeartbeat: new Date() },
        { orgId, name: "threat-hunter", hostname: "hunt-01.demo", os: "Linux", version: "2.3.9", status: "WARNING", agentType: "hunter", lastHeartbeat: new Date(Date.now() - 40 * 60_000) },
      ],
    }),
    prisma.apiEndpoint.createMany({
      data: [
        { orgId, domainId: domain.id, path: "/api/v1/users", method: "GET", authType: "JWT", riskScore: 28 },
        { orgId, domainId: domain.id, path: "/api/v1/admin", method: "POST", authType: "API_KEY", riskScore: 74 },
        { orgId, domainId: domain.id, path: "/graphql", method: "POST", authType: "NONE", riskScore: 88 },
        { orgId, domainId: domain.id, path: "/api/v1/export", method: "GET", authType: "SESSION", riskScore: 46 },
        { orgId, domainId: domain.id, path: "/api/token", method: "POST", authType: "NONE", riskScore: 81 },
      ],
    }),
    prisma.cloudAccount.createMany({
      data: [
        {
          orgId,
          provider: "AWS",
          name: "Production AWS",
          accountId: "123456789012",
          misconfigCount: 3,
          status: "CONNECTED",
          lastScannedAt: new Date(),
          findings: [
            { title: "S3 bucket acme-backups public-read", severity: "CRITICAL", resource: "s3://acme-backups" },
            { title: "S3 bucket logs-prod missing encryption", severity: "HIGH", resource: "s3://logs-prod" },
            { title: "S3 bucket ml-artifacts world-listable", severity: "HIGH", resource: "s3://ml-artifacts" },
          ],
        },
        {
          orgId,
          provider: "GCP",
          name: "Analytics GCP",
          accountId: "demo-gcp-01",
          misconfigCount: 1,
          status: "CONNECTED",
          lastScannedAt: new Date(),
          findings: [
            { title: "GCS bucket open to allAuthenticatedUsers", severity: "HIGH", resource: "gs://analytics-exports" },
          ],
        },
        {
          orgId,
          provider: "AZURE",
          name: "Identity Azure",
          accountId: "demo-azure-01",
          misconfigCount: 2,
          status: "CONNECTED",
          lastScannedAt: new Date(),
          findings: [
            { title: "Storage account allows anonymous blob access", severity: "HIGH", resource: "stprodidentity" },
            { title: "NSG permits 0.0.0.0/0 on 3389", severity: "CRITICAL", resource: "nsg-jumpbox" },
          ],
        },
      ],
    }),
    prisma.complianceTask.createMany({
      data: [
        { orgId, framework: "SOC2", controlId: "CC6.1", controlName: "Logical Access", description: "Access controls implemented", status: "COMPLETE" },
        { orgId, framework: "SOC2", controlId: "CC7.2", controlName: "System Monitoring", description: "Continuous monitoring", status: "IN_PROGRESS" },
        { orgId, framework: "ISO27001", controlId: "A.12.6", controlName: "Vulnerability Mgmt", description: "Manage technical vulnerabilities", status: "COMPLETE" },
        { orgId, framework: "ISO27001", controlId: "A.9.4", controlName: "Access Control", description: "System access restriction", status: "COMPLETE" },
        { orgId, framework: "PCI-DSS", controlId: "6.5", controlName: "Secure Development", description: "Address common coding vulnerabilities", status: "IN_PROGRESS" },
        { orgId, framework: "GDPR", controlId: "Art.32", controlName: "Security of processing", description: "Technical measures", status: "COMPLETE" },
      ],
    }),
  ]);

  // Leaked credential style alerts if model exists
  try {
    await prisma.darkWebAlert.createMany({
      data: [
        {
          orgId,
          source: "Breach aggregate",
          type: "CREDENTIAL",
          severity: "HIGH",
          title: "2 corporate emails found in credential dump",
          description: "demo.user@acme-corp.example and ops@demo.quantumshield.io appeared in a 2025 combo list.",
          status: "NEW",
        },
        {
          orgId,
          source: "Paste site",
          type: "SECRET",
          severity: "CRITICAL",
          title: "AWS access key pattern discussed on paste site",
          description: "Partial AKIA… key pattern matched production naming convention.",
          status: "NEW",
        },
      ],
    });
  } catch {
    // Dark web model may differ — ignore
  }
}

export async function ensureDemoUser() {
  const resolved = await ensurePortalUser("client");

  // Always ensure rich fixtures — don't gate only on domain existence.
  try {
    await seedDemoWorkspace(resolved.user.id, resolved.membership.orgId);
    invalidatePortalCache(DEMO_CREDENTIALS.email);
  } catch (err) {
    console.error("Demo workspace seed failed (login still proceeds):", err);
  }

  return { user: resolved.user, membership: resolved.membership };
}

export function demoOrgContext(membership: {
  orgId: string;
  role: string;
  org: { subscription: { tier: SubscriptionTier; status: string; scansUsedThisMonth: number } | null };
}) {
  return {
    orgId: membership.orgId,
    role: membership.role,
    tier: "ENTERPRISE" as SubscriptionTier,
    subscriptionStatus: "ACTIVE" as const,
    scansUsed: membership.org.subscription?.scansUsedThisMonth ?? 0,
    scansLimit: 999999,
    domainLimit: 999999,
  };
}
