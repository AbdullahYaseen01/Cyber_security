"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Shield, ArrowRight, Radar, Target, Lock,
  Globe, Brain, Radio, Sparkles, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticleField } from "@/components/landing/particle-field";
import { ShimmerText, PulseRing } from "@/components/landing/animated-text";
import {
  LANDING_FEATURED_MODULES,
  LANDING_SECONDARY_MODULES,
  type LandingModule,
} from "@/lib/constants";

const STATS = [
  { value: "7", label: "Security Modules" },
  { value: "1M+", label: "Parallel Checks" },
  { value: "18", label: "Scan Phases" },
  { value: "90%", label: "Verify Threshold" },
];

const HERO_FEATURES = [
  {
    icon: Radar,
    title: "18-Phase Deep Scanner",
    desc: "1 million+ parallel checks — OSINT recon, port scanning, remote service analysis, fuzzing, and exploit verification.",
    color: "from-cyan-500/20 to-cyan-500/5",
    border: "hover:border-cyan-500/40",
  },
  {
    icon: Radio,
    title: "Live Threat Feed",
    desc: "Real-time SSE stream with holographic progress — watch vulnerabilities surface as they're found.",
    color: "from-purple-500/20 to-purple-500/5",
    border: "hover:border-purple-500/40",
  },
  {
    icon: Brain,
    title: "AI Vulnerability Inference",
    desc: "Pattern learning from 843+ historical disclosures. Smart prioritization before active exploitation.",
    color: "from-amber-500/20 to-amber-500/5",
    border: "hover:border-amber-500/40",
  },
  {
    icon: Target,
    title: "Exploit Verification",
    desc: "Every finding re-probed with confidence scoring. Bug-bounty-ready reports at 90%+ certainty.",
    color: "from-red-500/20 to-red-500/5",
    border: "hover:border-red-500/40",
  },
  {
    icon: Globe,
    title: "OSINT & Service Intel",
    desc: "WHOIS, DNS zone transfers, email harvesting, Samba/FTP/SMB remote exploit detection.",
    color: "from-green-500/20 to-green-500/5",
    border: "hover:border-green-500/40",
  },
  {
    icon: Wand2,
    title: "LLM-Safe Vibe Coding",
    desc: "Scan AI-generated code for hardcoded secrets, SQLi, XSS, and auth bypass patterns.",
    color: "from-amber-500/20 to-amber-500/5",
    border: "hover:border-amber-500/40",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.55, ease: "easeOut" as const },
  }),
};

function AnimatedStat({ value, label, index }: { value: string; label: string; index: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      custom={index}
      initial="hidden"
      animate={inView ? "visible" : "hidden"}
      variants={fadeUp}
      className="text-center"
    >
      <div className="text-3xl md:text-4xl font-bold font-mono text-gradient">{value}</div>
      <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">{label}</div>
    </motion.div>
  );
}

function ModuleCard({
  mod,
  index,
  variant = "featured",
}: {
  mod: LandingModule;
  index: number;
  variant?: "featured" | "compact";
}) {
  const Icon = mod.icon;
  const isFeatured = variant === "featured";

  return (
    <motion.div
      custom={index}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-40px" }}
      variants={fadeUp}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="h-full"
    >
      <Link
        href="/login"
        className={`flex flex-col h-full glass bg-gradient-to-br ${mod.gradient} border border-white/10 ${mod.border} transition-all duration-300 group relative text-left overflow-hidden ${
          isFeatured ? "p-6 rounded-2xl" : "p-5 rounded-xl"
        }`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4 relative">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`flex-shrink-0 rounded-xl bg-white/10 border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform ${
                isFeatured ? "w-12 h-12" : "w-10 h-10"
              }`}
            >
              <Icon className={`text-cyan-400 ${isFeatured ? "w-6 h-6" : "w-5 h-5"}`} />
            </div>
            <h3 className={`font-semibold text-white leading-tight ${isFeatured ? "text-lg" : "text-base"}`}>
              {mod.label}
            </h3>
          </div>
          {mod.badge && (
            <span className="flex-shrink-0 text-[9px] font-mono px-2 py-1 rounded-full bg-purple-500/25 text-purple-200 border border-purple-500/30 uppercase tracking-wide">
              {mod.badge}
            </span>
          )}
        </div>

        {/* Stat highlight — Deep Scanner only */}
        {mod.statHighlight && (
          <div className="relative mb-4 flex items-end gap-3 px-4 py-3.5 rounded-xl bg-cyan-500/[0.08] border border-cyan-500/25">
            <span className="text-3xl md:text-4xl font-bold font-mono text-gradient leading-none tracking-tight">
              {mod.statHighlight.value}
            </span>
            <span className="text-[10px] text-cyan-300/90 pb-1 uppercase tracking-widest font-medium">
              {mod.statHighlight.label}
            </span>
          </div>
        )}

        {/* Description */}
        <p className={`text-slate-400 leading-relaxed flex-1 relative ${isFeatured ? "text-sm" : "text-xs"}`}>
          {mod.description}
        </p>

        {/* Footer */}
        <div className="relative mt-5 pt-4 border-t border-white/10">
          <div className="flex flex-wrap gap-1.5 mb-3">
            {mod.highlights.map((h) => (
              <span
                key={h}
                className="text-[10px] px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/5"
              >
                {h}
              </span>
            ))}
          </div>
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-cyan-400/80 group-hover:text-cyan-300 transition-colors">
            Explore module
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

function PlatformModulesSection() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.45 }}
      className="mb-20"
    >
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold mb-2">
          <span className="text-gradient">Complete Security Platform</span>
        </h2>
        <p className="text-slate-400 text-sm md:text-base max-w-xl mx-auto">
          Seven production-ready modules — demo every feature with one click.
        </p>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.02] backdrop-blur-sm p-5 md:p-8">
        {/* Row 1 — Core */}
        <div className="mb-2">
          <div className="flex items-center gap-3 mb-5 px-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400/80">
              Core Capabilities
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-cyan-500/30 to-transparent" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {LANDING_FEATURED_MODULES.map((mod, i) => (
              <ModuleCard key={mod.id} mod={mod} index={i} variant="featured" />
            ))}
          </div>
        </div>

        <div className="my-7 md:my-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

        {/* Row 2 — Platform */}
        <div>
          <div className="flex items-center gap-3 mb-5 px-1">
            <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
              Platform Modules
            </span>
            <div className="flex-1 h-px bg-gradient-to-r from-white/10 to-transparent" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LANDING_SECONDARY_MODULES.map((mod, i) => (
              <ModuleCard key={mod.id} mod={mod} index={i + 3} variant="compact" />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function HeroSection() {
  return (
    <>
      <ParticleField />

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute top-1/3 -right-32 w-80 h-80 bg-purple-600/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-cyan-400/5 rounded-full blur-3xl animate-pulse-glow" />
        <div className="absolute inset-0 animate-grid-drift opacity-30 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMiI+PHBhdGggIGQ9Ik0zNiAzNGg0djJoLTR6bTAtNHY0aC04di00em0tMTYgMGg0djJoLTR6bTAtNHY0aC04di00eiIvPjwvZz48L2c+PC9zdmc+')]" />
        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent animate-scan-line" />
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 relative"
        >
          <div className="relative">
            <PulseRing />
            <motion.div
              animate={{ boxShadow: ["0 0 20px rgba(0,240,255,0.2)", "0 0 40px rgba(0,240,255,0.4)", "0 0 20px rgba(0,240,255,0.2)"] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center relative z-10"
            >
              <Shield className="w-5 h-5" />
            </motion.div>
          </div>
          <span className="font-bold text-xl">QuantumShield</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-4"
        >
          <Link href="/pricing" className="text-slate-400 hover:text-white transition-colors text-sm">
            Pricing
          </Link>
          <Link href="/login" className="text-slate-400 hover:text-white transition-colors text-sm">
            Sign In
          </Link>
          <Button variant="glow" asChild>
            <Link href="/signup">Start for $1/mo</Link>
          </Button>
        </motion.div>
      </nav>

      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24">
        {/* Hero headline */}
        <div className="text-center mb-14">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-300 text-sm mb-8"
          >
            <Sparkles className="w-4 h-4" />
            7 Integrated Modules · One Enterprise Platform
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
          >
            <ShimmerText className="text-gradient">Stop Hackers</ShimmerText>
            <br />
            <motion.span
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-white inline-block"
            >
              Before They Strike
            </motion.span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Deep Scanner, API Security, Agent Security, Cloud Guard, Phishing Shield,
            Dark Web Intel, and Compliance Hub — all in one platform.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Button variant="glow" size="lg" asChild className="group">
              <Link href="/signup">
                Start Free Trial
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="secondary" size="lg" asChild>
              <Link href="/login">
                <Sparkles className="w-4 h-4" />
                Try Demo Account
              </Link>
            </Button>
          </motion.div>
        </div>

        <PlatformModulesSection />

        {/* Stats bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto mb-20 p-6 rounded-2xl glass"
        >
          {STATS.map((stat, i) => (
            <AnimatedStat key={stat.label} {...stat} index={i} />
          ))}
        </motion.div>

        {/* Deep-dive capability cards */}
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-bold mb-3">
            <span className="text-gradient">Built for Serious Security Teams</span>
          </h2>
          <p className="text-slate-400 text-sm md:text-base">
            Enterprise-grade scanning engine powering every module
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 text-left">
          {HERO_FEATURES.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp}
                whileHover={{ y: -6, scale: 1.02, transition: { duration: 0.2 } }}
                className={`glass p-6 bg-gradient-to-br ${feature.color} border border-white/10 ${feature.border} transition-all duration-300 group`}
              >
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-semibold text-lg mb-2 text-white">{feature.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* CTA section */}
      <section className="relative z-10 border-t border-white/10 py-24">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center glass p-10 md:p-14 bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-600/10"
          >
            <Lock className="w-10 h-10 text-cyan-400 mx-auto mb-4" />
            <h3 className="text-2xl md:text-3xl font-bold mb-3">Ready to secure your attack surface?</h3>
            <p className="text-slate-400 mb-8 max-w-lg mx-auto">
              Log in with <span className="text-cyan-400 font-mono">demo@quantumshield.io</span> — all modules unlocked.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button variant="glow" size="lg" asChild>
                <Link href="/signup">
                  Get Started — $1/mo <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">Sign In with Demo</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </>
  );
}
