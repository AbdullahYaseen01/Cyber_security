export interface ScanPhase {
  id: string;
  label: string;
}

export const SCAN_PHASES: ScanPhase[] = [
  { id: "recon", label: "Reconnaissance" },
  { id: "ai-prioritize", label: "AI Target Prioritization" },
  { id: "source-crawl", label: "Source Crawl & Download" },
  { id: "source-analysis", label: "Line-by-Line Source Analysis" },
  { id: "ai-inference", label: "AI Vulnerability Inference" },
  { id: "ai-exploit", label: "AI Active Exploitation" },
  { id: "deep-scan", label: "Deep Scanning Suite" },
  { id: "owasp-hunt", label: "OWASP Deep Attack Hunting" },
  { id: "elite-exploit", label: "Elite Exploit Suite" },
  { id: "mega-fuzz", label: "Mega Fuzzing" },
  { id: "nuclei", label: "Nuclei Template Checks" },
  { id: "super-scan", label: "Super Scanner Deep Checks" },
  { id: "verify", label: "Exploit Verification" },
];

export const SCAN_PHASE_COUNT = SCAN_PHASES.length;

export function phaseIndex(phaseId: string): number {
  const idx = SCAN_PHASES.findIndex((p) => p.id === phaseId);
  return idx >= 0 ? idx : 0;
}

export function phaseLabel(phaseIdOrIndex: string | number): string {
  if (typeof phaseIdOrIndex === "number") {
    return SCAN_PHASES[phaseIdOrIndex]?.label ?? SCAN_PHASES[0].label;
  }
  return SCAN_PHASES.find((p) => p.id === phaseIdOrIndex)?.label ?? phaseIdOrIndex;
}
