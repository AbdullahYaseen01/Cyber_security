"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/site-footer";
import { PRODUCT_SUITE } from "@/lib/constants";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4 },
  }),
};

const CATEGORY_LABEL: Record<string, string> = {
  offense: "Offense & validation",
  defense: "Defense & resilience",
  identity: "Identity & access",
  cloud: "Cloud security",
  compliance: "Compliance & reporting",
  intel: "Threat intelligence",
};

export default function ProductsClient() {
  return (
    <div className="min-h-screen bg-[#070B14] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(34,211,238,0.1),_transparent_55%)]" />
      <SiteNav />

      <main className="relative z-10 mx-auto max-w-7xl px-5 pb-24 pt-12 md:px-8 md:pt-16">
        <div className="mb-14 max-w-3xl">
          <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-400">
            Product suite
          </p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
            Everything a security team needs — without five vendors
          </h1>
          <p className="mb-8 text-lg leading-relaxed text-slate-400">
            QuantumStrike AI delivers Scanifier-class autonomous pentesting. Deep Scanner owns continuous
            attack-surface coverage. Identity Control and Adaptive AI Defense replace Opal- and
            Adaptive-class tools. Cloud, phishing, dark web, compliance, and reports complete the OS.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button variant="glow" size="lg" asChild>
              <Link href="/signup?tier=FREE">
                Start free <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/api/auth/demo-login?portal=client">Open live demo</Link>
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {PRODUCT_SUITE.map((product, i) => (
            <motion.article
              key={product.id}
              id={product.id}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-40px" }}
              variants={fadeUp}
              className="scroll-mt-24 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]"
            >
              <div className="grid md:grid-cols-[1fr_280px]">
                <div className="border-b border-white/[0.06] p-6 md:border-b-0 md:border-r md:p-8">
                  <div className="mb-3 flex flex-wrap items-center gap-2">
                    <span className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-slate-400">
                      {CATEGORY_LABEL[product.category] ?? product.category}
                    </span>
                    {product.badge && (
                      <span className="rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                        {product.badge}
                      </span>
                    )}
                  </div>
                  <h2 className="mb-1 text-2xl font-bold text-white">{product.name}</h2>
                  <p className="mb-3 text-sm font-medium text-cyan-300/90">{product.tagline}</p>
                  <p className="mb-5 max-w-2xl text-sm leading-relaxed text-slate-400">
                    {product.description}
                  </p>
                  <ul className="mb-6 grid gap-2 sm:grid-cols-2">
                    {product.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-slate-300">
                        <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-cyan-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={product.href.startsWith("/dashboard") ? "/login" : "/signup?tier=FREE"}>
                      {product.href.startsWith("/dashboard") ? "Open in console" : "Get started"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
                <div className="flex flex-col justify-between bg-white/[0.015] p-6 md:p-8">
                  <div>
                    <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-slate-500">
                      Replaces / beats
                    </p>
                    <ul className="space-y-2">
                      {product.beats.map((b) => (
                        <li
                          key={b}
                          className="rounded-lg border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-slate-300"
                        >
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="mt-6 font-mono text-[10px] uppercase tracking-wider text-slate-600">
                    id · {product.id}
                  </p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>

        <div className="mt-16 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-8 text-center md:p-12">
          <h3 className="mb-3 text-2xl font-bold">Ready to consolidate your security stack?</h3>
          <p className="mx-auto mb-6 max-w-lg text-slate-400">
            Start free on one domain, or jump into the populated demo console used by security teams evaluating QuantumShield.
          </p>
          <div className="flex flex-col justify-center gap-3 sm:flex-row">
            <Button variant="glow" size="lg" asChild>
              <Link href="/signup?tier=FREE">Start free</Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link href="/pricing">See pricing</Link>
            </Button>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
