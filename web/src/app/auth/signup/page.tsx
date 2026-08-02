"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TIERS, type TierId, type BillingCycle, getTierBillingTotal } from "@/lib/tiers";

function SignupForm() {
  const router = useRouter();
  const params = useSearchParams();
  const tier = (params.get("tier") as TierId) ?? "STARTER";
  const cycle = (params.get("cycle") as BillingCycle) ?? "annual";
  const tierConfig = TIERS[tier] ?? TIERS.STARTER;
  const billingTotal = getTierBillingTotal(tierConfig, cycle);
  const billingPeriod =
    cycle === "annual" ? "/year" : cycle === "quarterly" ? "/quarter" : "/month";

  const [form, setForm] = useState({ email: "", password: "", name: "", orgName: "" });
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, tier, billingCycle: cycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Signup failed");
      toast.success("Account created! Welcome to QuantumShield.");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
          <Shield className="w-6 h-6" />
        </div>
        <CardTitle>Create Account</CardTitle>
        <CardDescription>
          {tierConfig.name} plan · ${billingTotal}
          {billingPeriod} · 7-day trial
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required className="mt-1" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} className="mt-1" />
          </div>
          <div>
            <Label htmlFor="org">Organization Name</Label>
            <Input id="org" value={form.orgName} onChange={(e) => setForm({ ...form, orgName: e.target.value })} required className="mt-1" />
          </div>
          <Button type="submit" variant="glow" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Start 7-Day Trial"}
          </Button>
        </form>
        <p className="text-center text-sm text-slate-400 mt-4">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-cyan-400 hover:underline">Sign in</Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-950/20 via-navy-950 to-navy-950" />
      <div className="relative z-10 w-full flex justify-center">
        <Suspense fallback={<div className="text-slate-400">Loading...</div>}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
