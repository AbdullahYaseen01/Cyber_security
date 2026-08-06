import type { SubscriptionTier } from "@prisma/client";
import type { TierId } from "./tiers";
import { tierMeetsRequirement } from "./tiers";

export const FEATURE_GATES = {
  scanner: {
    lightning: "FREE" as TierId,
    standard: "PROFESSIONAL" as TierId,
    mega: "BUSINESS" as TierId,
    super: "ENTERPRISE" as TierId,
  },
  apiSecurity: { access: "PROFESSIONAL" as TierId, test: "PROFESSIONAL" as TierId },
  agentSecurity: { access: "BUSINESS" as TierId, quarantine: "ENTERPRISE" as TierId },
  cloudGuard: { access: "BUSINESS" as TierId, autoFix: "ENTERPRISE" as TierId },
  phishingShield: { access: "PROFESSIONAL" as TierId, customTemplate: "BUSINESS" as TierId },
  darkWebIntel: { access: "BUSINESS" as TierId, takedown: "ENTERPRISE" as TierId },
  complianceHub: { access: "PROFESSIONAL" as TierId, gapAnalysis: "BUSINESS" as TierId },
  reportsCenter: {
    access: "PROFESSIONAL" as TierId,
    scheduled: "BUSINESS" as TierId,
    whiteLabel: "ENTERPRISE" as TierId,
  },
} as const;

export function hasFeatureAccess(
  userTier: SubscriptionTier | TierId,
  requiredTier: TierId
): boolean {
  return tierMeetsRequirement(userTier as TierId, requiredTier);
}

export function getScanModeTier(mode: string): TierId {
  const key = mode.toLowerCase() as keyof typeof FEATURE_GATES.scanner;
  return FEATURE_GATES.scanner[key] ?? "ENTERPRISE";
}
