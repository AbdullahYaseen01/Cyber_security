export type PortalId = "client" | "admin" | "tester";
export type PlatformRole = "CLIENT" | "ADMIN" | "TESTER";

export interface PortalAccount {
  portal: PortalId;
  email: string;
  password: string;
  name: string;
  orgName: string;
  orgSlug: string;
  platformRole: PlatformRole;
  orgRole: "OWNER" | "ADMIN" | "ANALYST" | "VIEWER";
  home: string;
  label: string;
}

/** Client-safe portal fixtures (no Prisma / bcrypt). */
export const PORTAL_ACCOUNTS: Record<PortalId, PortalAccount> = {
  client: {
    portal: "client",
    email: "demo@quantumshield.io",
    password: "Demo1234!",
    name: "Demo User",
    orgName: "QuantumShield Demo",
    orgSlug: "quantumshield-demo",
    platformRole: "CLIENT",
    orgRole: "OWNER",
    home: "/dashboard",
    label: "Client workspace",
  },
  admin: {
    portal: "admin",
    email: "admin@quantumshield.io",
    password: "Admin1234!",
    name: "Platform Admin",
    orgName: "QuantumShield Operations",
    orgSlug: "quantumshield-ops",
    platformRole: "ADMIN",
    orgRole: "OWNER",
    home: "/admin",
    label: "Admin console",
  },
  tester: {
    portal: "tester",
    email: "tester@quantumshield.io",
    password: "Tester1234!",
    name: "QA Tester",
    orgName: "QuantumShield QA",
    orgSlug: "quantumshield-qa",
    platformRole: "TESTER",
    orgRole: "ADMIN",
    home: "/tester",
    label: "Tester console",
  },
};

const ACCOUNTS_BY_EMAIL = new Map(
  Object.values(PORTAL_ACCOUNTS).map((a) => [a.email.toLowerCase(), a])
);

export function portalAccountFor(email: string | null | undefined): PortalAccount | null {
  if (!email) return null;
  return ACCOUNTS_BY_EMAIL.get(email.toLowerCase()) ?? null;
}

export function isPortalLogin(email: string, password: string): PortalAccount | null {
  const account = portalAccountFor(email);
  if (!account) return null;
  return account.password === password ? account : null;
}

export function homeForPlatformRole(role: string | null | undefined): string {
  if (role === "ADMIN") return "/admin";
  if (role === "TESTER") return "/tester";
  return "/dashboard";
}
