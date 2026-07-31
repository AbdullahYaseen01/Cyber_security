import {
  LayoutDashboard,
  ScanSearch,
  Plug,
  Shield,
  Cloud,
  Fish,
  Eye,
  ClipboardCheck,
  FileBarChart,
  Settings,
  GraduationCap,
  type LucideIcon,
} from "lucide-react";
import type { TierId } from "./tiers";

export { SCAN_PHASES, SCAN_PHASE_COUNT, phaseIndex, phaseLabel } from "./scan-phases";
export type { ScanPhase } from "./scan-phases";

export interface NavItem {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  requiredTier: TierId;
  badge?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiredTier: "STARTER" },
  { id: "scanner", label: "Deep Scanner", href: "/dashboard/scanner", icon: ScanSearch, requiredTier: "STARTER", badge: "Flagship" },
  { id: "api", label: "API Security", href: "/dashboard/api-security", icon: Plug, requiredTier: "PROFESSIONAL", badge: "Featured" },
  { id: "agents", label: "Agent Security", href: "/dashboard/agent-security", icon: Shield, requiredTier: "BUSINESS", badge: "Agentic" },
  { id: "cloud", label: "Cloud Guard", href: "/dashboard/cloud-guard", icon: Cloud, requiredTier: "BUSINESS" },
  { id: "phishing", label: "Phishing Shield", href: "/dashboard/phishing-shield", icon: Fish, requiredTier: "PROFESSIONAL" },
  { id: "darkweb", label: "Dark Web Intel", href: "/dashboard/dark-web", icon: Eye, requiredTier: "BUSINESS" },
  { id: "compliance", label: "Compliance Hub", href: "/dashboard/compliance", icon: ClipboardCheck, requiredTier: "PROFESSIONAL" },
  { id: "reports", label: "Reports Center", href: "/dashboard/reports", icon: FileBarChart, requiredTier: "PROFESSIONAL" },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: Settings, requiredTier: "STARTER" },
  { id: "academy", label: "Academy", href: "/dashboard/academy", icon: GraduationCap, requiredTier: "ENTERPRISE" },
];

export const COLORS = {
  navy: "#0B0F19",
  cyan: "#00F0FF",
  red: "#FF3366",
  amber: "#FFB800",
  green: "#00E676",
  purple: "#7C3AED",
};

export const SCANNER_API_URL =
  process.env.NEXT_PUBLIC_SCANNER_API_URL ??
  process.env.SCANNER_API_URL ??
  "http://127.0.0.1:8080";
