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
  { id: "scanner", label: "Deep Scanner", href: "/scanner", icon: ScanSearch, requiredTier: "STARTER", badge: "Flagship" },
  { id: "api", label: "API Security", href: "/api-security", icon: Plug, requiredTier: "PROFESSIONAL" },
  { id: "agents", label: "Agent Security", href: "/agents", icon: Shield, requiredTier: "BUSINESS" },
  { id: "cloud", label: "Cloud Guard", href: "/cloud", icon: Cloud, requiredTier: "BUSINESS" },
  { id: "phishing", label: "Phishing Shield", href: "/phishing", icon: Fish, requiredTier: "BUSINESS" },
  { id: "darkweb", label: "Dark Web Intel", href: "/darkweb", icon: Eye, requiredTier: "BUSINESS" },
  { id: "compliance", label: "Compliance Hub", href: "/compliance", icon: ClipboardCheck, requiredTier: "PROFESSIONAL" },
  { id: "reports", label: "Reports Center", href: "/reports", icon: FileBarChart, requiredTier: "PROFESSIONAL" },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings, requiredTier: "STARTER" },
  { id: "academy", label: "Academy", href: "/academy", icon: GraduationCap, requiredTier: "ENTERPRISE" },
];

export const SCAN_PHASES = [
  "Reconnaissance",
  "AI Target Prioritization",
  "Source Crawl & Download",
  "Line-by-Line Source Analysis",
  "AI Vulnerability Inference",
  "AI Active Exploitation",
  "Deep Scanning Suite",
  "OWASP Deep Attack Hunting",
  "Elite Exploit Suite",
  "Mega Fuzzing",
  "Nuclei Template Checks",
  "Super Scanner Deep Checks",
  "Exploit Verification",
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
