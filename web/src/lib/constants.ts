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
  Activity,
  Gauge,
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
  { id: "dashboard", label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, requiredTier: "FREE" },
  { id: "scanner", label: "Deep Scanner", href: "/dashboard/scanner/new", icon: ScanSearch, requiredTier: "FREE", badge: "Flagship" },
  { id: "api", label: "API Security", href: "/dashboard/api-security", icon: Plug, requiredTier: "PROFESSIONAL", badge: "Featured" },
  { id: "agents", label: "Agent Security", href: "/dashboard/agent-security", icon: Shield, requiredTier: "BUSINESS", badge: "Agentic" },
  { id: "cloud", label: "Cloud Guard", href: "/dashboard/cloud-guard", icon: Cloud, requiredTier: "BUSINESS" },
  { id: "phishing", label: "Phishing Shield", href: "/dashboard/phishing-shield", icon: Fish, requiredTier: "PROFESSIONAL" },
  { id: "darkweb", label: "Dark Web Intel", href: "/dashboard/dark-web", icon: Eye, requiredTier: "BUSINESS" },
  { id: "compliance", label: "Compliance Hub", href: "/dashboard/compliance", icon: ClipboardCheck, requiredTier: "PROFESSIONAL" },
  { id: "reports", label: "Reports Center", href: "/dashboard/reports", icon: FileBarChart, requiredTier: "PROFESSIONAL" },
  { id: "system", label: "System Tester", href: "/dashboard/system", icon: Activity, requiredTier: "STARTER", badge: "Live" },
  { id: "admin", label: "Ops Monitor", href: "/dashboard/admin", icon: Gauge, requiredTier: "STARTER", badge: "Admin" },
  { id: "settings", label: "Settings", href: "/dashboard/settings", icon: Settings, requiredTier: "FREE" },
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
    statHighlight: { value: "13", label: "Scan Phases" },
    description: "Real DNS, TLS, ports, headers, and path probes — OWASP Top 10 & CWE with live SSE findings.",
    highlights: ["13 scan phases", "Verified domains", "Live SSE stream"],
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
    description: "Inventory REST/GraphQL surfaces. Probe auth, CORS, BOLA patterns, and rate-limit gaps.",
    highlights: ["Endpoint inventory", "Auth/CORS probes", "Risk scoring"],
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
    description: "Deploy monitor agents for HTTP/TLS health, tool abuse signals, and privilege drift on AI workflows.",
    highlights: ["Agent deploy", "HTTP/TLS monitors", "Live agent logs"],
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

/** Full product suite marketed on landing + /products */
export interface ProductSuiteItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  href: string;
  badge?: string;
  category: "offense" | "defense" | "identity" | "cloud" | "compliance" | "intel";
  beats: string[];
  features: string[];
}

export const PRODUCT_SUITE: ProductSuiteItem[] = [
  {
    id: "autonomous-pentest",
    name: "QuantumStrike AI",
    tagline: "Autonomous AI penetration testing",
    description:
      "The intelligence of a senior red teamer at machine speed. Scope a target, watch the agent recon, chain findings, and ship PoC-backed reports in hours — not weeks.",
    href: "/products#autonomous-pentest",
    badge: "New",
    category: "offense",
    beats: ["Scanifier", "XBOW", "manual pentests"],
    features: [
      "Signed scope + blast-radius controls",
      "Multi-step attack chaining",
      "PoC evidence with CVSS + MITRE ATT&CK",
      "Free automated retest after fixes",
      "Continuous CI/CD security runs",
    ],
  },
  {
    id: "deep-scanner",
    name: "Deep Scanner",
    tagline: "Attack-surface vulnerability engine",
    description:
      "Real DNS, TLS, port, header, and path probes against verified domains. Live SSE findings stream with OWASP Top 10 and CWE remediation — no synthetic progress bars.",
    href: "/dashboard/scanner/new",
    badge: "Flagship",
    category: "offense",
    beats: ["generic scanners", "quarterly VAPT"],
    features: [
      "Lightning / Standard / Mega / Super modes",
      "Subdomain + service discovery",
      "Security header & TLS expiry checks",
      "Path fuzz for admin panels and leaks",
      "Exportable executive + technical reports",
    ],
  },
  {
    id: "identity-control",
    name: "Identity Control Plane",
    tagline: "Programmable authorization & least privilege",
    description:
      "Real-time visibility and policy-as-code across every identity — human, service, and AI agent. Approve, revoke, and audit access without waiting on ticket queues.",
    href: "/products#identity-control",
    badge: "Enterprise",
    category: "identity",
    beats: ["Opal Security", "legacy IAM"],
    features: [
      "Policy-as-code authorization",
      "Just-in-time access workflows",
      "Agent & MCP privilege monitoring",
      "Identity attack-path mapping",
      "Audit-ready access trails",
    ],
  },
  {
    id: "ai-defense",
    name: "Adaptive AI Defense",
    tagline: "Stop AI-powered attacks before they land",
    description:
      "Detect and neutralize AI-generated phishing, deepfake social engineering, prompt-injection, and autonomous attacker tooling across email, web, and agent surfaces.",
    href: "/products#ai-defense",
    badge: "Frontier",
    category: "defense",
    beats: ["Adaptive Security", "email-only filters"],
    features: [
      "AI phishing & deepfake detection",
      "Prompt-injection / tool-abuse guards",
      "Behavioral anomaly scoring",
      "Autonomous containment playbooks",
      "Human-in-the-loop kill switches",
    ],
  },
  {
    id: "api-security",
    name: "API Security",
    tagline: "OWASP API Top 10 coverage",
    description:
      "Inventory REST, GraphQL, and gRPC surfaces. Probe auth, CORS, BOLA/IDOR patterns, and rate-limit gaps with risk scoring tied to your org.",
    href: "/dashboard/api-security",
    category: "offense",
    beats: ["manual API inventories"],
    features: ["Endpoint discovery", "Auth & CORS probes", "BOLA heuristics", "Risk scoring"],
  },
  {
    id: "cloud-guard",
    name: "Cloud Guard",
    tagline: "Multi-cloud CSPM",
    description:
      "Find misconfigurations, public exposure, and IAM drift across AWS, Azure, and GCP — mapped to compliance controls your auditors care about.",
    href: "/dashboard/cloud-guard",
    category: "cloud",
    beats: ["Wiz (point tools alone)", "spreadsheet CSPM"],
    features: ["AWS · Azure · GCP", "Public bucket detection", "IAM violations", "Compliance mapping"],
  },
  {
    id: "phishing-shield",
    name: "Phishing Shield",
    tagline: "Human-layer resilience",
    description:
      "Run realistic campaigns, measure click risk, and close the gap with awareness training — while DNS (MX/SPF/DMARC) posture stays visible.",
    href: "/dashboard/phishing-shield",
    category: "defense",
    beats: ["one-off awareness vendors"],
    features: ["Campaign builder", "Click tracking", "DNS email posture", "Awareness loops"],
  },
  {
    id: "dark-web",
    name: "Dark Web Intel",
    tagline: "Credential & brand exposure",
    description:
      "Monitor leaked credentials, paste sites, and brand mentions so your team hears about breaches before customers do.",
    href: "/dashboard/dark-web",
    category: "intel",
    beats: ["manual dark-web searches"],
    features: ["Email monitoring", "Keyword alerts", "Breach intel feeds"],
  },
  {
    id: "compliance",
    name: "Compliance Hub",
    tagline: "SOC 2, ISO 27001, GDPR — continuously",
    description:
      "Control mapping, gap analysis, and task tracking that turns certification from an annual scramble into an always-on program — faster than checkbox-only tools.",
    href: "/dashboard/compliance",
    category: "compliance",
    beats: ["Vanta (single-purpose)", "spreadsheet audits"],
    features: ["SOC 2", "ISO 27001", "GDPR", "Evidence task tracking"],
  },
  {
    id: "reports",
    name: "Reports Center",
    tagline: "Board-ready + engineer-ready",
    description:
      "Generate executive summaries and technical write-ups from live findings — prioritized remediation backlogs your engineering teams can own.",
    href: "/dashboard/reports",
    category: "compliance",
    beats: ["PDF-only report mills"],
    features: ["Executive + technical", "Finding-linked evidence", "Export formats"],
  },
];

export const LANDING_STATS = [
  { value: "$9.36B", label: "AI-in-cyber market by 2026", source: "MarketsandMarkets" },
  { value: "44%", label: "Breaches involving AI phishing", source: "Verizon DBIR 2025" },
  { value: "13 min", label: "Avg attacker breakout time", source: "CrowdStrike GTR" },
  { value: "4M+", label: "Global cyber talent shortage", source: "World Economic Forum" },
];

export const LANDING_HOW_IT_WORKS = [
  {
    step: "01",
    title: "Define scope",
    description: "Add a verified domain, set boundaries, and choose Lightning through Super scan modes. Setup under 60 seconds.",
  },
  {
    step: "02",
    title: "Autonomous discovery",
    description: "Deep Scanner and QuantumStrike AI recon DNS, ports, TLS, headers, paths, and identity surfaces in parallel.",
  },
  {
    step: "03",
    title: "Validated findings",
    description: "Every issue ships with severity, CWE/OWASP mapping, reproduction context, and a concrete fix path — not scanner noise.",
  },
  {
    step: "04",
    title: "Fix, retest, expand",
    description: "Remediate, retest, then unlock API, cloud, phishing, compliance, and identity modules on the same platform.",
  },
];

export const LANDING_COMPARISON = [
  {
    capability: "Autonomous AI pentest with PoC",
    quantum: true,
    scanifier: true,
    veiliux: "partial",
    opal: false,
    adaptive: false,
    vanta: false,
  },
  {
    capability: "Real DNS/TLS/port/path scanner",
    quantum: true,
    scanifier: "partial",
    veiliux: "partial",
    opal: false,
    adaptive: false,
    vanta: false,
  },
  {
    capability: "Identity & policy-as-code control",
    quantum: true,
    scanifier: false,
    veiliux: false,
    opal: true,
    adaptive: false,
    vanta: false,
  },
  {
    capability: "AI-powered attack defense",
    quantum: true,
    scanifier: false,
    veiliux: "partial",
    opal: false,
    adaptive: true,
    vanta: false,
  },
  {
    capability: "Multi-cloud CSPM",
    quantum: true,
    scanifier: "partial",
    veiliux: false,
    opal: false,
    adaptive: false,
    vanta: false,
  },
  {
    capability: "Continuous compliance (SOC 2 / ISO)",
    quantum: true,
    scanifier: false,
    veiliux: "partial",
    opal: false,
    adaptive: false,
    vanta: true,
  },
  {
    capability: "Phishing + dark web + reports in one console",
    quantum: true,
    scanifier: false,
    veiliux: "partial",
    opal: false,
    adaptive: false,
    vanta: false,
  },
  {
    capability: "Free tier to prove value on a real domain",
    quantum: true,
    scanifier: false,
    veiliux: "partial",
    opal: false,
    adaptive: false,
    vanta: false,
  },
] as const;

export const LANDING_FAQ = [
  {
    q: "How is QuantumShield different from Scanifier or a traditional scanner?",
    a: "Scanners list CVEs; pentest agents prove exploitability. QuantumShield does both — Deep Scanner for continuous attack-surface coverage, plus QuantumStrike AI for autonomous chaining and PoC evidence — then expands into identity, cloud, phishing, and compliance on one platform.",
  },
  {
    q: "Can this replace point tools like Opal, Adaptive, or Vanta?",
    a: "For most mid-market and growth teams, yes. Identity Control Plane covers programmable authorization; Adaptive AI Defense covers AI-era attacks; Compliance Hub covers SOC 2 / ISO / GDPR. Enterprises can still keep specialized tools — QuantumShield becomes the operating system that feeds them signal.",
  },
  {
    q: "Is autonomous testing safe on production?",
    a: "Yes when scoped. Domain verification, signed authorization, mode limits, and operator kill-switches bound blast radius. Destructive techniques stay gated behind explicit approval.",
  },
  {
    q: "How long until first useful findings?",
    a: "Lightning scans return concrete header/TLS/port/path signals in minutes. Standard and Mega modes deepen coverage. QuantumStrike AI engagements compress weeks of human recon into hours.",
  },
  {
    q: "What do we get in reports?",
    a: "Executive summary, technical write-up with reproduction context, severity + CWE/OWASP mapping, and a prioritized remediation backlog. Higher tiers unlock richer export and white-label options.",
  },
  {
    q: "Do you integrate with our stack?",
    a: "Findings and alerts are designed to flow into engineering workflows (Jira, Slack, GitHub, SIEM/SOAR). Start with the live demo to see the console your team will use daily.",
  },
];

export const COLORS = {
  navy: "#111725",
  surface: "#171E2E",
  cyan: "#22D3EE",
  red: "#F43F5E",
  amber: "#F59E0B",
  green: "#10B981",
  purple: "#8B5CF6",
  slate: "#64748B",
};

export const SCANNER_API_URL =
  process.env.NEXT_PUBLIC_SCANNER_API_URL ??
  process.env.SCANNER_API_URL ??
  "http://127.0.0.1:8080";
