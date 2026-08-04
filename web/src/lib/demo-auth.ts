import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import type { SubscriptionTier } from "@prisma/client";

export const DEMO_CREDENTIALS = {
  email: "demo@quantumshield.io",
  password: "Demo1234!",
  name: "Demo User",
  orgName: "QuantumShield Demo",
} as const;

export function isDemoLogin(email: string, password: string): boolean {
  return (
    email.toLowerCase() === DEMO_CREDENTIALS.email &&
    password === DEMO_CREDENTIALS.password
  );
}

export function isDemoUserEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === DEMO_CREDENTIALS.email;
}

export function isDemoUser(
  user: { email?: string; isDemo?: boolean } | null | undefined
): boolean {
  if (!user) return false;
  return Boolean(user.isDemo) || isDemoUserEmail(user.email);
}

async function ensureDemoSubscription(orgId: string) {
  await prisma.subscription.upsert({
    where: { orgId },
    create: {
      orgId,
      stripeCustomerId: `demo_${orgId}`,
      status: "ACTIVE",
      tier: "ENTERPRISE",
      scansUsedThisMonth: 12,
    },
    update: {
      status: "ACTIVE",
      tier: "ENTERPRISE",
    },
  });
}

async function ensureDemoDomains(orgId: string) {
  await prisma.domain.upsert({
    where: { orgId_name: { orgId, name: "demo.quantumshield.io" } },
    create: {
      orgId,
      name: "demo.quantumshield.io",
      verified: true,
      securityScore: 92,
      grade: "A",
    },
    update: { verified: true, securityScore: 92, grade: "A" },
  });
}

/** Sample findings, agents, API endpoints, etc. for a rich demo dashboard. */
async function ensureDemoSampleData(userId: string, orgId: string) {
  const marker = await prisma.finding.findFirst({
    where: { orgId, title: "SQL Injection in login form" },
  });
  if (marker) return;

  const domain = await prisma.domain.findFirst({ where: { orgId } });
  if (!domain) return;

  const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { slug: true } });
  if (org?.slug === "quantumshield-demo") {
    await prisma.finding.deleteMany({ where: { orgId } });
    await prisma.agent.deleteMany({ where: { orgId } });
    await prisma.apiEndpoint.deleteMany({ where: { orgId } });
    await prisma.cloudAccount.deleteMany({ where: { orgId } });
    await prisma.complianceTask.deleteMany({ where: { orgId } });
    await prisma.scan.deleteMany({ where: { orgId } });
  }

  const scan = await prisma.scan.create({
    data: {
      orgId,
      domainId: domain.id,
      userId,
      mode: "MEGA",
      status: "COMPLETED",
      progress: 100,
      findingsCount: 8,
      criticalCount: 2,
      highCount: 3,
      mediumCount: 2,
      lowCount: 1,
      startedAt: new Date(Date.now() - 3600_000),
      completedAt: new Date(),
      durationMs: 3_600_000,
    },
  });

  const findings = [
    { title: "SQL Injection in login form", severity: "CRITICAL" as const, category: "Injection", cweId: "CWE-89", cvss: 9.8 },
    { title: "Exposed admin panel", severity: "CRITICAL" as const, category: "Access Control", cweId: "CWE-284", cvss: 9.1 },
    { title: "Reflected XSS in search", severity: "HIGH" as const, category: "XSS", cweId: "CWE-79", cvss: 7.5 },
    { title: "Missing security headers", severity: "HIGH" as const, category: "Misconfiguration", cweId: "CWE-693", cvss: 7.0 },
    { title: "Weak TLS configuration", severity: "HIGH" as const, category: "Crypto", cweId: "CWE-326", cvss: 7.4 },
    { title: "Directory listing enabled", severity: "MEDIUM" as const, category: "Misconfiguration", cweId: "CWE-548", cvss: 5.3 },
    { title: "Outdated jQuery library", severity: "MEDIUM" as const, category: "Components", cweId: "CWE-1104", cvss: 5.0 },
    { title: "Information disclosure in errors", severity: "LOW" as const, category: "Info Leak", cweId: "CWE-209", cvss: 3.7 },
  ];

  await prisma.finding.createMany({
    data: findings.map((f) => ({
      orgId,
      domainId: domain.id,
      scanId: scan.id,
      userId,
      title: f.title,
      description: `Demo finding: ${f.title}`,
      severity: f.severity,
      category: f.category,
      cweId: f.cweId,
      cvssScore: f.cvss,
      url: `https://${domain.name}/api/v1`,
      status: "OPEN",
    })),
  });

  await prisma.agent.createMany({
    data: [
      { orgId, name: "prod-web-01", hostname: "web-01.demo", os: "Linux", version: "2.4.1", status: "ONLINE", lastHeartbeat: new Date() },
      { orgId, name: "prod-api-02", hostname: "api-02.demo", os: "Linux", version: "2.4.1", status: "ONLINE", lastHeartbeat: new Date() },
      { orgId, name: "staging-db", hostname: "db-stg.demo", os: "Linux", version: "2.3.9", status: "WARNING", lastHeartbeat: new Date() },
      { orgId, name: "legacy-worker", hostname: "worker-old", os: "Windows", version: "2.1.0", status: "OFFLINE" },
    ],
  });

  await prisma.apiEndpoint.createMany({
    data: [
      { orgId, domainId: domain.id, path: "/api/v1/users", method: "GET", authType: "JWT", riskScore: 25 },
      { orgId, domainId: domain.id, path: "/api/v1/admin", method: "POST", authType: "API_KEY", riskScore: 72 },
      { orgId, domainId: domain.id, path: "/graphql", method: "POST", authType: "NONE", riskScore: 88 },
      { orgId, domainId: domain.id, path: "/api/v1/export", method: "GET", authType: "SESSION", riskScore: 45 },
    ],
  });

  await prisma.cloudAccount.createMany({
    data: [
      { orgId, provider: "AWS", name: "Production AWS", accountId: "123456789012", misconfigCount: 2, status: "CONNECTED" },
      { orgId, provider: "GCP", name: "Analytics GCP", accountId: "demo-gcp-01", misconfigCount: 1, status: "CONNECTED" },
    ],
  });

  await prisma.complianceTask.createMany({
    data: [
      { orgId, framework: "SOC2", controlId: "CC6.1", controlName: "Logical Access", description: "Access controls implemented", status: "COMPLETE" },
      { orgId, framework: "SOC2", controlId: "CC7.2", controlName: "System Monitoring", description: "Continuous monitoring", status: "IN_PROGRESS" },
      { orgId, framework: "ISO27001", controlId: "A.12.6", controlName: "Vulnerability Mgmt", description: "Manage technical vulnerabilities", status: "COMPLETE" },
      { orgId, framework: "PCI-DSS", controlId: "6.5", controlName: "Secure Development", description: "Address common coding vulnerabilities", status: "NOT_STARTED" },
    ],
  });
}

export async function ensureDemoUser() {
  let user = await prisma.user.findUnique({
    where: { email: DEMO_CREDENTIALS.email },
    include: { orgs: { include: { org: { include: { subscription: true } } } } },
  });

  if (!user) {
    const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 12);
    user = await prisma.user.create({
      data: {
        email: DEMO_CREDENTIALS.email,
        password: passwordHash,
        name: DEMO_CREDENTIALS.name,
      },
      include: { orgs: { include: { org: { include: { subscription: true } } } } },
    });
  } else if (!user.password) {
    const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 12);
    user = await prisma.user.update({
      where: { id: user.id },
      data: { password: passwordHash },
      include: { orgs: { include: { org: { include: { subscription: true } } } } },
    });
  } else {
    const valid = await bcrypt.compare(DEMO_CREDENTIALS.password, user.password);
    if (!valid) {
      const passwordHash = await bcrypt.hash(DEMO_CREDENTIALS.password, 12);
      user = await prisma.user.update({
        where: { id: user.id },
        data: { password: passwordHash },
        include: { orgs: { include: { org: { include: { subscription: true } } } } },
      });
    }
  }

  let membership = user.orgs[0];

  if (!membership) {
    const org = await prisma.organization.create({
      data: {
        name: DEMO_CREDENTIALS.orgName,
        slug: "quantumshield-demo",
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
    await ensureDemoSubscription(org.id);
    membership = await prisma.orgMember.findFirstOrThrow({
      where: { userId: user.id, orgId: org.id },
      include: { org: { include: { subscription: true } } },
    });
  } else {
    await ensureDemoSubscription(membership.orgId);
    membership = await prisma.orgMember.findFirstOrThrow({
      where: { id: membership.id },
      include: { org: { include: { subscription: true } } },
    });
  }

  await ensureDemoDomains(membership.orgId);
  await ensureDemoSampleData(user.id, membership.orgId);

  return { user, membership };
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
