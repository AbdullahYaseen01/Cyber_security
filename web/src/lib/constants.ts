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

export interface LandingModule {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
  description: string;
  highlights: string[];
  gradient: string;
  border: string;
  statHighlight?: { value: string; label: string };
  metric?: { value: string; label: string };
  accent: string;
}

/** Top row — flagship modules on landing hero */
export const LANDING_FEATURED_MODULES: LandingModule[] = [
  {
    id: "scanner",
    label: "Deep Scanner",
    href: "/dashboard/scanner",
    icon: ScanSearch,
    badge: "Flagship",
    statHighlight: { value: "1 Million+", label: "Parallel Checks" },
    description: "18-phase offensive security — OSINT recon, port scanning, fuzzing, and exploit verification in real time.",
    highlights: ["18 scan phases", "OSINT recon", "Live SSE stream"],
    gradient: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    border: "hover:border-cyan-400/50",
    accent: "from-cyan-400 via-cyan-500 to-blue-500",
  },
  {
    id: "api",
    label: "API Security",
    href: "/dashboard/api-security",
    icon: Plug,
    badge: "Featured",
    metric: { value: "OWASP API", label: "Top 10 Coverage" },
    description: "Discover REST, GraphQL, and gRPC endpoints. Test BOLA, JWT flaws, rate limits, and injection.",
    highlights: ["Auto-discovery", "BOLA/IDOR tests", "Risk scoring"],
    gradient: "from-blue-500/15 via-cyan-500/5 to-transparent",
    border: "hover:border-blue-400/50",
    accent: "from-blue-400 via-cyan-400 to-cyan-500",
  },
  {
    id: "agents",
    label: "Agent Security",
    href: "/dashboard/agent-security",
    icon: Shield,
    badge: "Agentic",
    metric: { value: "24/7", label: "Agent Monitoring" },
    description: "Monitor AI agents, MCP servers, and autonomous workflows for tool abuse and privilege escalation.",
    highlights: ["Agent deploy", "Endpoint monitoring", "Token management"],
    gradient: "from-purple-500/20 via-purple-500/5 to-transparent",
    border: "hover:border-purple-400/50",
    accent: "from-purple-400 via-violet-400 to-cyan-400",
  },
];

/** Second row — platform modules on landing hero */
export const LANDING_SECONDARY_MODULES: LandingModule[] = [
  {
    id: "cloud",
    label: "Cloud Guard",
    href: "/dashboard/cloud-guard",
    icon: Cloud,
    description: "Multi-cloud CSPM for AWS, Azure, and GCP — misconfigurations, public buckets, and IAM violations.",
    highlights: ["AWS · Azure · GCP", "Misconfig detection", "Compliance mapping"],
    gradient: "from-sky-500/15 to-transparent",
    border: "hover:border-sky-400/50",
    accent: "from-sky-400 to-blue-500",
  },
  {
    id: "phishing",
    label: "Phishing Shield",
    href: "/dashboard/phishing-shield",
    icon: Fish,
    description: "Run realistic phishing simulations and security awareness campaigns across your organization.",
    highlights: ["Campaign builder", "Click tracking", "Awareness training"],
    gradient: "from-emerald-500/15 to-transparent",
    border: "hover:border-emerald-400/50",
    accent: "from-emerald-400 to-green-500",
  },
  {
    id: "darkweb",
    label: "Dark Web Intel",
    href: "/dashboard/dark-web",
    icon: Eye,
    description: "Monitor credential leaks, breach exposure, and brand mentions across dark web sources.",
    highlights: ["Email monitoring", "Keyword alerts", "Breach intel"],
    gradient: "from-rose-500/15 to-transparent",
    border: "hover:border-rose-400/50",
    accent: "from-rose-400 to-orange-500",
  },
  {
    id: "compliance",
    label: "Compliance Hub",
    href: "/dashboard/compliance",
    icon: ClipboardCheck,
    description: "ISO 27001, SOC 2, and GDPR control mapping with gap analysis and task tracking.",
    highlights: ["ISO 27001", "SOC 2", "GDPR"],
    gradient: "from-indigo-500/15 to-transparent",
    border: "hover:border-indigo-400/50",
    accent: "from-indigo-400 to-blue-500",
  },
];

export const LANDING_MODULES: LandingModule[] = [
  ...LANDING_FEATURED_MODULES,
  ...LANDING_SECONDARY_MODULES,
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
