"use client";

import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Shield, ArrowRight, CheckCircle2, Radar, Target, Lock,
  Globe, Brain, FileSearch, Radio, Sparkles, Plug, Bot, Code2, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticleField } from "@/components/landing/particle-field";
import { ShimmerText, PulseRing } from "@/components/landing/animated-text";

const STATS = [
  { value: "1M+", label: "Parallel Checks" },
  { value: "18", label: "Scan Phases" },
  { value: "9", label: "Security Modules" },
  { value: "90%", label: "Verify Threshold" },
];

const SPOTLIGHT_MODULES = [
  {
    icon: Bot,
    title: "Agentic Security",
    tag: "New · Featured",
    desc: "Continuous monitoring for AI agents, autonomous workflows, and LLM toolchains. Detect prompt injection, over-permissioned tools, and agent-to-agent lateral movement before production.",
    href: "/agents",
    gradient: "from-purple-500/25 to-cyan-500/10",
    border: "border-purple-500/40",
  },
  {
    icon: Plug,
    title: "API Security",
    tag: "Featured",
    desc: "Auto-discover REST, GraphQL, and gRPC endpoints. BOLA, JWT weakness, rate-limit bypass, and injection tests — built for modern API-first stacks.",
    href: "/api-security",
    gradient: "from-cyan-500/25 to-blue-500/10",
    border: "border-cyan-500/40",
  },
  {
    icon: Code2,
    title: "Vibe-Coding Guard",
    tag: "LLM-Native",
    desc: "Ship fast with Cursor, Copilot, or Claude — we scan AI-generated code for hardcoded secrets, SQLi, XSS, and auth bypass patterns that slip past human review.",
    href: "/scanner",
    gradient: "from-amber-500/25 to-orange-500/10",
    border: "border-amber-500/40",
  },
];

const HERO_FEATURES = [
  {
    icon: Bot,
    title: "Agentic Security",
    desc: "Monitor AI agents, MCP servers, and autonomous workflows. Catch tool abuse, data exfiltration, and privilege escalation in agent pipelines.",
    color: "from-purple-500/20 to-purple-500/5",
    border: "hover:border-purple-500/40",
    featured: true,
  },
  {
    icon: Plug,
    title: "API Security Suite",
    desc: "OpenAPI import, crawler discovery, BOLA/IDOR, JWT attacks, GraphQL introspection abuse, and rate-limit testing.",
    color: "from-cyan-500/20 to-cyan-500/5",
    border: "hover:border-cyan-500/40",
    featured: true,
  },
  {
    icon: Wand2,
    title: "Secure Vibe Coding",
    desc: "LLM-generated code ships fast — our scanner catches the vulnerabilities AI assistants miss: secrets, injection, misconfigurations.",
    color: "from-amber-500/20 to-amber-500/5",
    border: "hover:border-amber-500/40",
    featured: true,
  },
  {
    icon: Radar,
    title: "18-Phase Deep Scanner",
    desc: "OSINT recon, port scanning, remote service analysis, 1M+ fuzz checks, and exploit verification.",
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
    icon: FileSearch,
    title: "11+ Compliance Standards",
    desc: "ISO 27001, NIST CSF, PCI-DSS, GDPR, SOC 2, OWASP ASVS — exportable reports in one click.",
    color: "from-blue-500/20 to-blue-500/5",
    border: "hover:border-blue-500/40",
  },
];

const MODULES = [
  { name: "Deep Scanner", featured: false },
  { name: "API Security", featured: true },
  { name: "Agent Security", featured: true },
  { name: "Cloud Guard", featured: false },
  { name: "Phishing Shield", featured: false },
  { name: "Dark Web Intel", featured: false },
  { name: "Compliance Hub", featured: false },
  { name: "Reports Center", featured: false },
  { name: "Academy", featured: false },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.1, duration: 0.6, ease: "easeOut" as const },
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

export function HeroSection() {
  return (
    <>
      {/* Animated particle network */}
      <ParticleField />

      {/* Animated background orbs */}
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

      <section className="relative z-10 max-w-7xl mx-auto px-8 pt-16 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-sm mb-8"
        >
          <motion.span
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}
          >
            <Bot className="w-4 h-4" />
          </motion.span>
          Agentic Security · API Security · LLM-Safe Vibe Coding
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
          Secure <span className="text-purple-400">AI agents</span>,{" "}
          <span className="text-cyan-400">APIs</span>, and{" "}
          <span className="text-amber-400">LLM-generated code</span> — plus 1M+ parallel checks,
          real-time threat streaming, and 9 integrated security modules in one dashboard.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
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

        {/* Spotlight: Agentic + API + Vibe Coding */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto mb-20 text-left"
        >
          {SPOTLIGHT_MODULES.map((mod, i) => {
            const Icon = mod.icon;
            return (
              <motion.div
                key={mod.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                whileHover={{ y: -8, transition: { duration: 0.2 } }}
                className={`glass p-6 bg-gradient-to-br ${mod.gradient} border-2 ${mod.border} relative overflow-hidden group`}
              >
                <span className="absolute top-3 right-3 text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-cyan-300">
                  {mod.tag}
                </span>
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <Icon className="w-6 h-6 text-cyan-400" />
                </div>
                <h3 className="font-bold text-xl mb-2 text-white">{mod.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">{mod.desc}</p>
                <Link
                  href={mod.href}
                  className="inline-flex items-center gap-1 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                >
                  Explore <ArrowRight className="w-3 h-3" />
                </Link>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Animated stats bar */}
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

        {/* Selling feature cards */}
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
                className={`glass p-6 bg-gradient-to-br ${feature.color} border border-white/10 ${feature.border} transition-all duration-300 group relative ${
                  feature.featured ? "ring-1 ring-cyan-500/30" : ""
                }`}
              >
                {"featured" in feature && feature.featured && (
                  <span className="absolute top-3 right-3 text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                    Featured
                  </span>
                )}
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

      {/* Modules + CTA section */}
      <section className="relative z-10 border-t border-white/10 py-24">
        <div className="max-w-7xl mx-auto px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-14"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              <span className="text-gradient">9 Security Modules</span>, One Platform
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Agentic security and API testing front and center — plus cloud, compliance, and dark web intel.
            </p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-16">
            {MODULES.map((mod, i) => (
              <motion.div
                key={mod.name}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
                whileHover={{ scale: 1.05, borderColor: "rgba(0,240,255,0.4)" }}
                className={`glass p-4 text-center text-sm hover:glow-cyan transition-all cursor-default relative ${
                  mod.featured ? "border border-cyan-500/30 bg-cyan-500/5" : ""
                }`}
              >
                {mod.featured && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-purple-500/30 text-purple-200">
                    Featured
                  </span>
                )}
                <CheckCircle2 className={`w-5 h-5 mx-auto mb-2 ${mod.featured ? "text-purple-400" : "text-cyan-400"}`} />
                {mod.name}
              </motion.div>
            ))}
          </div>

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
              Try the demo account — all modules unlocked, no domain verification required.
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
