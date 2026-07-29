"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { canAccessModule, MODULE_TIER_REQUIREMENTS, TIERS } from "@/lib/tiers";

interface ModulePageProps {
  moduleId: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}

export function ModulePage({ moduleId, title, description, children }: ModulePageProps) {
  const user = useAuthStore((s) => s.user);
  const tier = user?.tier ?? "STARTER";
  const locked = !canAccessModule(tier, moduleId);

  if (locked) {
    const reqTier = MODULE_TIER_REQUIREMENTS[moduleId] ?? "ENTERPRISE";
    const reqConfig = TIERS[reqTier];
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="max-w-md text-center">
            <CardHeader>
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-slate-500" />
              </div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400 mb-6">
                This module requires the <span className="text-cyan-400 font-medium">{reqConfig.name}</span> plan
                (${reqConfig.monthlyPrice}/mo) or higher.
              </p>
              <Button variant="glow" asChild>
                <Link href="/pricing">Upgrade to Unlock</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-slate-400 text-sm mt-1">{description}</p>
        </div>
        {children}
      </div>
    </AppShell>
  );
}
