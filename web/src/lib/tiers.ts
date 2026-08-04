export type TierId = "STARTER" | "PROFESSIONAL" | "BUSINESS" | "ENTERPRISE";
export type BillingCycle = "monthly" | "quarterly" | "annual";

export interface TierConfig {
  id: TierId;
  name: string;
  monthlyPrice: number;
  quarterlyPrice: number;
  annualPrice: number;
  domains: number | "unlimited";
  scansPerMonth: number | "unlimited";
  modules: string[];
  scanModes: string[];
  apiAccess: boolean;
  teamSeats: number | "unlimited";
  badge?: string;
}

export const TIERS: Record<TierId, TierConfig> = {
  STARTER: {
    id: "STARTER",
    name: "Starter",
    monthlyPrice: 5,
    quarterlyPrice: 14,
    annualPrice: 48,
    domains: 1,
    scansPerMonth: 10,
    modules: ["dashboard", "scanner", "system"],
    scanModes: ["lightning"],
    apiAccess: false,
    teamSeats: 1,
    badge: "Most Affordable",
  },
  PROFESSIONAL: {
    id: "PROFESSIONAL",
    name: "Professional",
    monthlyPrice: 39,
    quarterlyPrice: 105,
    annualPrice: 374,
    domains: 5,
    scansPerMonth: 100,
    modules: ["dashboard", "scanner", "api", "reports", "compliance", "system"],
    scanModes: ["lightning", "standard"],
    apiAccess: true,
    teamSeats: 3,
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    monthlyPrice: 129,
    quarterlyPrice: 348,
    annualPrice: 1238,
    domains: 25,
    scansPerMonth: 500,
    modules: [
      "dashboard",
      "scanner",
      "api",
      "agents",
      "cloud",
      "phishing",
      "darkweb",
      "compliance",
      "reports",
      "system",
    ],
    scanModes: ["lightning", "standard", "mega"],
    apiAccess: true,
    teamSeats: 10,
    badge: "Most Popular",
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: 399,
    quarterlyPrice: 1077,
    annualPrice: 3830,
    domains: "unlimited",
    scansPerMonth: "unlimited",
    modules: [
      "dashboard",
      "system",
      "scanner",
      "api",
      "agents",
      "cloud",
      "phishing",
      "darkweb",
      "compliance",
      "reports",
      "academy",
    ],
    scanModes: ["lightning", "standard", "mega", "super"],
    apiAccess: true,
    teamSeats: "unlimited",
  },
};

export const MODULE_TIER_REQUIREMENTS: Record<string, TierId> = {
  dashboard: "STARTER",
  scanner: "STARTER",
  system: "STARTER",
  api: "PROFESSIONAL",
  reports: "PROFESSIONAL",
  agents: "BUSINESS",
  cloud: "BUSINESS",
  phishing: "BUSINESS",
  darkweb: "BUSINESS",
  compliance: "PROFESSIONAL",
  academy: "ENTERPRISE",
  settings: "STARTER",
};

const TIER_ORDER: TierId[] = ["STARTER", "PROFESSIONAL", "BUSINESS", "ENTERPRISE"];

export function tierMeetsRequirement(userTier: TierId, requiredTier: TierId): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

export function canAccessModule(
  userTier: TierId,
  moduleId: string,
  opts?: { isDemo?: boolean }
): boolean {
  if (opts?.isDemo) return true;
  const required = MODULE_TIER_REQUIREMENTS[moduleId] ?? "ENTERPRISE";
  return tierMeetsRequirement(userTier, required);
}

export function canUseScanMode(
  userTier: TierId,
  requiredTier: TierId,
  opts?: { isDemo?: boolean }
): boolean {
  if (opts?.isDemo) return true;
  return tierMeetsRequirement(userTier, requiredTier);
}

export function getTierLimits(tier: TierId) {
  const config = TIERS[tier];
  return {
    domains: config.domains === "unlimited" ? 999999 : config.domains,
    scansPerMonth: config.scansPerMonth === "unlimited" ? 999999 : config.scansPerMonth,
    teamSeats: config.teamSeats === "unlimited" ? 999999 : config.teamSeats,
  };
}

/** Full module list shown on pricing cards */
export const PRICING_MODULES = [
  { id: "dashboard", label: "Dashboard" },
  { id: "scanner", label: "Deep Scanner" },
  { id: "api", label: "API Security" },
  { id: "agents", label: "Agent Security" },
  { id: "cloud", label: "Cloud Guard" },
  { id: "phishing", label: "Phishing Shield" },
  { id: "darkweb", label: "Dark Web Intel" },
  { id: "compliance", label: "Compliance Hub" },
  { id: "reports", label: "Reports Center" },
  { id: "academy", label: "Academy" },
] as const;

export function tierHasModule(tier: TierConfig, moduleId: string): boolean {
  return tier.modules.includes(moduleId);
}

const SCAN_MODE_LABELS: Record<string, string> = {
  lightning: "Lightning Scan",
  standard: "Standard Scan",
  mega: "Mega Scan",
  super: "Super Scan",
};

export function getPricingFeatures(tier: TierConfig) {
  const limits = [
    {
      label: `${tier.domains === "unlimited" ? "Unlimited" : tier.domains} domain${tier.domains === 1 ? "" : "s"}`,
      included: true,
    },
    {
      label: `${tier.scansPerMonth === "unlimited" ? "Unlimited" : tier.scansPerMonth} scans/mo`,
      included: true,
    },
    {
      label: `${tier.teamSeats === "unlimited" ? "Unlimited" : tier.teamSeats} team seat${tier.teamSeats === 1 ? "" : "s"}`,
      included: true,
    },
    { label: "API Access", included: tier.apiAccess },
  ];

  const modules = PRICING_MODULES.map((m) => ({
    label: m.label,
    included: tierHasModule(tier, m.id),
  }));

  const scanModes = (["lightning", "standard", "mega", "super"] as const).map((mode) => ({
    label: SCAN_MODE_LABELS[mode],
    included: tier.scanModes.includes(mode),
  }));

  return { limits, modules, scanModes };
}

export function getTierMonthlyEquivalent(tier: TierConfig, cycle: BillingCycle): number {
  switch (cycle) {
    case "annual":
      return tier.annualPrice / 12;
    case "quarterly":
      return tier.quarterlyPrice / 3;
    default:
      return tier.monthlyPrice;
  }
}

export function getTierBillingTotal(tier: TierConfig, cycle: BillingCycle): number {
  switch (cycle) {
    case "annual":
      return tier.annualPrice;
    case "quarterly":
      return tier.quarterlyPrice;
    default:
      return tier.monthlyPrice;
  }
}

export function getBillingBilledLabel(tier: TierConfig, cycle: BillingCycle): string | null {
  switch (cycle) {
    case "annual":
      return `billed $${tier.annualPrice}/year`;
    case "quarterly":
      return `billed $${tier.quarterlyPrice}/quarter`;
    default:
      return null;
  }
}
