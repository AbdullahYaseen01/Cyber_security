"use client";

import { motion } from "framer-motion";

const LINES = [
  { t: "08:42:01", tag: "SCOPE", msg: "Authorized target: acme-retail.demo · blast radius: external" },
  { t: "08:42:04", tag: "DNS", msg: "Resolved 14 hosts · 3 new subdomains vs last scan" },
  { t: "08:42:09", tag: "TLS", msg: "api.acme-retail.demo — cert expires in 18 days · TLS 1.2 only" },
  { t: "08:42:14", tag: "HTTP", msg: "Missing HSTS + CSP on checkout.acme-retail.demo" },
  { t: "08:42:21", tag: "PATH", msg: "Exposed /.env.bak on staging (HIGH · CWE-200)" },
  { t: "08:42:28", tag: "CHAIN", msg: "Identity path: leaked service token → admin panel → PII export" },
  { t: "08:42:35", tag: "POC", msg: "Evidence packed · CVSS 8.6 · remediation assigned to eng-platform" },
];

export function LiveConsole() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.2 }}
      className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0A101C]/95 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.8)]"
    >
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/80" />
          <span className="ml-3 font-mono text-[11px] text-slate-500">agent_terminal · QS-7709</span>
        </div>
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
          <span className="inline-flex items-center gap-1.5 text-emerald-400">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Agent online
          </span>
          <span className="hidden text-slate-500 sm:inline">MTTE ~3h</span>
          <span className="hidden text-slate-500 md:inline">PoC 100%</span>
        </div>
      </div>

      <div className="relative max-h-[320px] space-y-2 overflow-hidden px-4 py-4 font-mono text-[12px] leading-relaxed sm:max-h-none sm:text-[13px]">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#0A101C] to-transparent sm:hidden" />
        {LINES.map((line, i) => (
          <motion.div
            key={line.t + line.tag}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 + i * 0.12, duration: 0.35 }}
            className="flex gap-3"
          >
            <span className="shrink-0 text-slate-600">[{line.t}]</span>
            <span
              className={`shrink-0 font-semibold ${
                line.tag === "POC" || line.tag === "CHAIN"
                  ? "text-cyan-300"
                  : line.tag === "PATH"
                    ? "text-rose-300"
                    : "text-slate-400"
              }`}
            >
              [{line.tag}]
            </span>
            <span className="text-slate-300">{line.msg}</span>
          </motion.div>
        ))}
        <div className="flex items-center gap-2 pt-1 text-cyan-400">
          <span className="text-slate-600">$</span>
          <span>root@quantumshield:~#</span>
          <span className="inline-block h-4 w-2 animate-pulse bg-cyan-400/80" />
        </div>
      </div>

      <div className="grid grid-cols-3 border-t border-white/[0.06] divide-x divide-white/[0.06] text-center">
        {[
          { k: "chain_depth", v: "3" },
          { k: "findings", v: "18" },
          { k: "mode", v: "continuous" },
        ].map((m) => (
          <div key={m.k} className="px-2 py-2.5">
            <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">{m.k}</p>
            <p className="font-mono text-sm font-semibold text-white">{m.v}</p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
