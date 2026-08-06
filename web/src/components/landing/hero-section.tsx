"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Minus,
  Sparkles,
  Shield,
  Zap,
  Lock,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ParticleField } from "@/components/landing/particle-field";
import { ShimmerText } from "@/components/landing/animated-text";
import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { LiveConsole } from "@/components/landing/live-console";
import {
  LANDING_FEATURED_MODULES,
  LANDING_SECONDARY_MODULES,
  LANDING_STATS,
  LANDING_HOW_IT_WORKS,
  LANDING_COMPARISON,
  LANDING_FAQ,
  PRODUCT_SUITE,
  type LandingModule,
} from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.45, ease: "easeOut" as const },
  }),
};

function CmpCell({ value }: { value: boolean | "partial" }) {
  if (value === true) {
    return (
      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
        <Check className="h-3.5 w-3.5" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="inline-flex h-7 items-center rounded-full bg-amber-500/10 px-2 font-mono text-[10px] font-semibold text-amber-300">
        partial
      </span>
    );
  }
  return (
    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.04] text-slate-600">
      <Minus className="h-3.5 w-3.5" />
    </span>
  );
}

function ModuleCard({ mod, index }: { mod: LandingModule; index: number }) {
  const Icon = mod.icon;
  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      className="h-full"
    >
      <Link
        href="/login"
        className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] p-5 transition-all duration-300 hover:-translate-y-1 hover:border-cyan-500/30 hover:bg-white/[0.04]"
      >
        <div className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r ${mod.accent} opacity-50`} />
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
            <Icon className="h-4 w-4 text-cyan-300" />
          </div>
          {mod.badge && (
            <span className="rounded-md border border-cyan-500/20 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
              {mod.badge}
            </span>
          )}
        </div>
        <h3 className="mb-1.5 text-base font-semibold text-white">{mod.label}</h3>
        <p className="mb-4 flex-1 text-sm leading-relaxed text-slate-400">{mod.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {mod.highlights.map((h) => (
            <span
              key={h}
              className="rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-slate-400"
            >
              {h}
            </span>
          ))}
        </div>
        <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-cyan-400 group-hover:gap-2 transition-all">
          Open module <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </Link>
    </motion.div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/[0.06]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-sm font-medium text-white md:text-base">{q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-slate-400">{a}</p>}
    </div>
  );
}

export function HeroSection() {
  const flagship = PRODUCT_SUITE.filter((p) =>
    ["autonomous-pentest", "deep-scanner", "identity-control", "ai-defense"].includes(p.id)
  );

  return (
    <>
      <ParticleField />
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-32 top-1/4 h-96 w-96 animate-float rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute -right-32 top-1/3 h-80 w-80 animate-float-delayed rounded-full bg-sky-600/10 blur-3xl" />
        <div className="absolute inset-0 animate-grid-drift opacity-25 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />
      </div>

      <SiteNav />

      {/* Hero — brand + one story + live console */}
      <section className="relative z-10 mx-auto grid max-w-7xl gap-10 px-5 pb-16 pt-10 md:grid-cols-2 md:items-center md:gap-12 md:px-8 md:pb-24 md:pt-16">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
            World&apos;s cybersecurity OS
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mb-4 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-[3.4rem] lg:leading-[1.08]"
          >
            <span className="block text-white">QuantumShield</span>
            <ShimmerText className="text-gradient">outruns every point tool</ShimmerText>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="mb-7 max-w-xl text-base leading-relaxed text-slate-400 md:text-lg"
          >
            Autonomous AI pentest, deep attack-surface scanning, identity control, AI-attack defense,
            cloud, phishing, dark web, and compliance — one console that beats Scanifier, Veiliux,
            Opal, Adaptive, and single-purpose vendors.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18 }}
            className="flex flex-col gap-3 sm:flex-row"
          >
            <Button variant="glow" size="lg" asChild className="group">
              <Link href="/signup?tier=FREE">
                Start free — scan 1 domain
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/api/auth/demo-login?portal=client">
                <Sparkles className="h-4 w-4" />
                Open live demo
              </Link>
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 flex flex-wrap gap-x-6 gap-y-2 font-mono text-[11px] uppercase tracking-[0.12em] text-slate-500"
          >
            <span className="text-slate-400">Deep Scanner</span>
            <span>·</span>
            <span className="text-slate-400">QuantumStrike AI</span>
            <span>·</span>
            <span className="text-slate-400">Identity</span>
            <span>·</span>
            <span className="text-slate-400">Compliance</span>
          </motion.div>
        </div>

        <LiveConsole />
      </section>

      {/* Market pressure */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-5 py-10 md:grid-cols-4 md:px-8">
          {LANDING_STATS.map((s, i) => (
            <motion.div
              key={s.label}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
            >
              <p className="font-mono text-2xl font-bold text-white md:text-3xl">{s.value}</p>
              <p className="mt-1 text-sm text-slate-300">{s.label}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-slate-600">
                {s.source}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Flagship products — Scanifier-class + Opal/Adaptive beaters */}
      <section id="products" className="relative z-10 mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="mb-10 max-w-2xl">
          <p className="eyebrow mb-3 text-cyan-400/80">Products</p>
          <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl">
            Four products. One operating system.
          </h2>
          <p className="text-slate-400">
            QuantumStrike AI matches autonomous pentest leaders. Deep Scanner owns continuous surface
            coverage. Identity and AI Defense replace Opal- and Adaptive-class point tools.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {flagship.map((p, i) => (
            <motion.div
              key={p.id}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent p-6 md:p-7"
            >
              <div className="mb-4 flex flex-wrap items-center gap-2">
                {p.badge && (
                  <span className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                    {p.badge}
                  </span>
                )}
                <span className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                  beats {p.beats.join(" · ")}
                </span>
              </div>
              <h3 className="mb-1 text-xl font-bold text-white">{p.name}</h3>
              <p className="mb-3 text-sm font-medium text-cyan-300/90">{p.tagline}</p>
              <p className="mb-5 text-sm leading-relaxed text-slate-400">{p.description}</p>
              <ul className="mb-5 space-y-2">
                {p.features.slice(0, 4).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={p.href.startsWith("/dashboard") ? "/login" : p.href}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-cyan-400 transition-colors hover:text-cyan-300"
              >
                Explore {p.name}
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button variant="outline" asChild>
            <Link href="/products">
              View full product suite <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="relative z-10 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
          <div className="mb-12 text-center">
            <p className="eyebrow mb-3 text-cyan-400/80">How it works</p>
            <h2 className="text-3xl font-bold text-white md:text-4xl">From scope to proof in hours</h2>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {LANDING_HOW_IT_WORKS.map((step, i) => (
              <motion.div
                key={step.step}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="relative"
              >
                <p className="mb-3 font-mono text-sm font-bold text-cyan-400">STEP / {step.step}</p>
                <h3 className="mb-2 text-lg font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-slate-400">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform modules */}
      <section id="platform" className="relative z-10 mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-28">
        <div className="mb-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow mb-3 text-cyan-400/80">Platform modules</p>
            <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl">
              Every module security teams actually run
            </h2>
            <p className="text-slate-400">
              Start on Deep Scanner. Unlock API, agents, cloud, phishing, dark web, compliance, and
              reports without stitching five vendors together.
            </p>
          </div>
          <div className="flex gap-3">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Zap className="mb-1 h-4 w-4 text-cyan-400" />
              <p className="text-xs text-slate-400">Real probes</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Shield className="mb-1 h-4 w-4 text-cyan-400" />
              <p className="text-xs text-slate-400">Org-scoped</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
              <Lock className="mb-1 h-4 w-4 text-cyan-400" />
              <p className="text-xs text-slate-400">Tier-gated</p>
            </div>
          </div>
        </div>

        <div className="mb-4 grid gap-4 md:grid-cols-3">
          {LANDING_FEATURED_MODULES.map((mod, i) => (
            <ModuleCard key={mod.id} mod={mod} index={i} />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {LANDING_SECONDARY_MODULES.map((mod, i) => (
            <ModuleCard key={mod.id} mod={mod} index={i + 3} />
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section id="compare" className="relative z-10 border-y border-white/[0.06] bg-white/[0.015]">
        <div className="mx-auto max-w-7xl px-5 py-20 md:px-8 md:py-24">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow mb-3 text-cyan-400/80">Why QuantumShield ranks first</p>
            <h2 className="mb-3 text-3xl font-bold text-white md:text-4xl">
              Built to beat the category — not join it
            </h2>
            <p className="text-slate-400">
              Point tools force you to buy Scanifier-class offense, Opal-class identity, Adaptive-class
              AI defense, Vanta-class compliance, and Veiliux-class services separately. We ship the
              stack.
            </p>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03]">
                  <th className="px-4 py-3 font-medium text-slate-400">Capability</th>
                  <th className="px-3 py-3 text-center font-semibold text-cyan-300">QuantumShield</th>
                  <th className="px-3 py-3 text-center font-medium text-slate-500">Scanifier</th>
                  <th className="px-3 py-3 text-center font-medium text-slate-500">Veiliux</th>
                  <th className="px-3 py-3 text-center font-medium text-slate-500">Opal</th>
                  <th className="px-3 py-3 text-center font-medium text-slate-500">Adaptive</th>
                  <th className="px-3 py-3 text-center font-medium text-slate-500">Vanta</th>
                </tr>
              </thead>
              <tbody>
                {LANDING_COMPARISON.map((row) => (
                  <tr key={row.capability} className="border-b border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-4 py-3.5 text-slate-300">{row.capability}</td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex justify-center">
                        <CmpCell value={row.quantum} />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex justify-center">
                        <CmpCell value={row.scanifier} />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex justify-center">
                        <CmpCell value={row.veiliux} />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex justify-center">
                        <CmpCell value={row.opal} />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex justify-center">
                        <CmpCell value={row.adaptive} />
                      </div>
                    </td>
                    <td className="px-3 py-3.5 text-center">
                      <div className="flex justify-center">
                        <CmpCell value={row.vanta} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="relative z-10 mx-auto max-w-3xl px-5 py-20 md:px-8 md:py-24">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-3 text-cyan-400/80">FAQ</p>
          <h2 className="text-3xl font-bold text-white">Answers before you ask</h2>
        </div>
        <div>
          {LANDING_FAQ.map((item) => (
            <FaqItem key={item.q} q={item.q} a={item.a} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 border-t border-white/10 py-20">
        <div className="mx-auto max-w-7xl px-5 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-transparent to-sky-600/10 px-6 py-12 text-center md:px-14"
          >
            <h3 className="mb-3 text-2xl font-bold text-white md:text-3xl">
              Make QuantumShield your security OS today
            </h3>
            <p className="mx-auto mb-8 max-w-lg text-slate-400">
              Free plan: 1 domain, 1 scan/month. Or open the live demo (
              <span className="font-mono text-cyan-400">demo@quantumshield.io</span>) and see the full
              console.
            </p>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button variant="glow" size="lg" asChild>
                <Link href="/signup?tier=FREE">
                  Start free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/products">Browse products</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
