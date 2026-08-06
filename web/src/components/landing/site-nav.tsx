"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Menu, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PulseRing } from "@/components/landing/animated-text";

const LINKS = [
  { href: "/products", label: "Products" },
  { href: "/#platform", label: "Platform" },
  { href: "/#compare", label: "Why us" },
  { href: "/pricing", label: "Pricing" },
];

export function SiteNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="relative z-20 border-b border-white/[0.06] bg-[#070B14]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 md:px-8">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="relative">
            <PulseRing />
            <div className="relative z-10 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 shadow-[0_0_24px_rgba(34,211,238,0.35)]">
              <Shield className="h-4 w-4 text-white" />
            </div>
          </div>
          <span className="text-lg font-bold tracking-tight text-white">QuantumShield</span>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm text-slate-400 transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <Link href="/login" className="text-sm text-slate-400 transition-colors hover:text-white">
            Sign in
          </Link>
          <Button variant="glow" size="sm" asChild>
            <Link href="/signup?tier=FREE">Start free</Link>
          </Button>
        </div>

        <button
          type="button"
          className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-t border-white/[0.06] px-5 py-4 md:hidden"
        >
          <div className="flex flex-col gap-3">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm text-slate-300"
              >
                {l.label}
              </Link>
            ))}
            <Link href="/login" onClick={() => setOpen(false)} className="text-sm text-slate-300">
              Sign in
            </Link>
            <Button variant="glow" asChild className="mt-1 w-full">
              <Link href="/signup?tier=FREE">Start free</Link>
            </Button>
          </div>
        </motion.div>
      )}
    </nav>
  );
}
