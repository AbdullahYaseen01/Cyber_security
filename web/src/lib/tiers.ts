export type TierId = "STARTER" | "PROFESSIONAL" | "BUSINESS" | "ENTERPRISE";

export interface TierConfig {
  id: TierId;
  name: string;
  monthlyPrice: number;
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
    monthlyPrice: 1,
    annualPrice: 10,
    domains: 1,
    scansPerMonth: 10,
    modules: ["dashboard", "scanner"],
    scanModes: ["lightning"],
    apiAccess: false,
    teamSeats: 1,
    badge: "Most Affordable",
  },
  PROFESSIONAL: {
    id: "PROFESSIONAL",
    name: "Professional",
    monthlyPrice: 29,
    annualPrice: 278,
    domains: 5,
    scansPerMonth: 100,
    modules: ["dashboard", "scanner", "api", "reports", "compliance"],
    scanModes: ["lightning", "standard"],
    apiAccess: true,
    teamSeats: 3,
  },
  BUSINESS: {
    id: "BUSINESS",
    name: "Business",
    monthlyPrice: 99,
    annualPrice: 950,
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
    ],
    scanModes: ["lightning", "standard", "mega"],
    apiAccess: true,
    teamSeats: 10,
    badge: "Most Popular",
  },
  ENTERPRISE: {
    id: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: 299,
    annualPrice: 2870,
    domains: "unlimited",
    scansPerMonth: "unlimited",
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

export function canAccessModule(userTier: TierId, moduleId: string): boolean {
  const required = MODULE_TIER_REQUIREMENTS[moduleId] ?? "ENTERPRISE";
  return tierMeetsRequirement(userTier, required);
}

export function getTierLimits(tier: TierId) {
  const config = TIERS[tier];
  return {
    domains: config.domains === "unlimited" ? 999999 : config.domains,
    scansPerMonth: config.scansPerMonth === "unlimited" ? 999999 : config.scansPerMonth,
    teamSeats: config.teamSeats === "unlimited" ? 999999 : config.teamSeats,
  };
}
