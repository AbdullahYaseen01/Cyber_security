"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";
import { isDemoUser } from "@/lib/demo-auth";
import { canAccessModule, MODULE_TIER_REQUIREMENTS, TIERS } from "@/lib/tiers";

interface DashboardModuleProps {
  moduleId: string;
  title: string;
  description: string;
  children: React.ReactNode;
}

export function DashboardModule({ moduleId, title, description, children }: DashboardModuleProps) {
  const user = useAuthStore((s) => s.user);
  const tier = user?.tier ?? "STARTER";
  const isDemo = isDemoUser(user);
  const locked = !canAccessModule(tier, moduleId, { isDemo });

  if (locked) {
    const reqTier = MODULE_TIER_REQUIREMENTS[moduleId] ?? "ENTERPRISE";
    const reqConfig = TIERS[reqTier];
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center border-white/10 bg-white/[0.03]">
          <CardHeader>
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-slate-500" />
            </div>
            <CardTitle>{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-400 mb-6">
              This module requires the{" "}
              <span className="text-cyan-400 font-medium">{reqConfig.name}</span> plan
              (${reqConfig.monthlyPrice}/mo) or higher.
            </p>
            <Button variant="glow" asChild>
              <Link href="/onboarding/subscription">Upgrade to Unlock</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="text-slate-400 text-sm mt-1">{description}</p>
      </div>
      {children}
    </div>
  );
}
