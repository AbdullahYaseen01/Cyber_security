"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ScanSearch, Globe, Plus, History, FileWarning } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const LINKS = [
  {
    href: "/dashboard/scanner/domains",
    icon: Globe,
    title: "Domain Management",
    description: "Add and verify domains before scanning",
  },
  {
    href: "/dashboard/scanner/new",
    icon: Plus,
    title: "New Scan",
    description: "Configure and launch a security scan",
  },
  {
    href: "/dashboard/scanner/history",
    icon: History,
    title: "Scan History",
    description: "View past scans and compare results",
  },
  {
    href: "/dashboard/scanner/findings",
    icon: FileWarning,
    title: "Findings",
    description: "Review and remediate vulnerabilities",
  },
];

export default function ScannerHubPage() {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
          <ScanSearch className="w-5 h-5 text-cyan-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Deep Scanner</h1>
          <p className="text-slate-400 text-sm">Flagship vulnerability assessment engine</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {LINKS.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full hover:border-cyan-500/30 hover:scale-[1.01] transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <link.icon className="w-5 h-5 text-cyan-400" />
                  <CardTitle className="text-lg">{link.title}</CardTitle>
                </div>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="border-cyan-500/20">
        <CardContent className="pt-6 flex items-center justify-between">
          <div>
            <p className="font-semibold">Ready to scan?</p>
            <p className="text-sm text-slate-400">Add a verified domain, then launch your first scan.</p>
          </div>
          <Button variant="glow" asChild>
            <Link href="/dashboard/scanner/new">Start Scan</Link>
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
