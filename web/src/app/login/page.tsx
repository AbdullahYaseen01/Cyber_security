"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shield, Sparkles, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { DEMO_CREDENTIALS } from "@/lib/demo-auth";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

async function completeLogin(router: ReturnType<typeof useRouter>) {
  const sessionRes = await fetch("/api/auth/session");
  const { user } = await sessionRes.json();

  toast.success("Welcome back!");
  if (user?.needsOnboarding) {
    router.push("/onboarding/organization");
  } else if (user?.subscriptionStatus !== "ACTIVE" && !user?.isDemo) {
    router.push("/onboarding/subscription");
  } else {
    router.push("/dashboard");
  }
}

export default function LoginPage() {
  const router = useRouter();
  const [demoLoading, setDemoLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(data: LoginForm) {
    const result = await signIn("credentials", {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      toast.error("Invalid email or password");
      return;
    }

    await completeLogin(router);
  }

  async function handleDemoLogin() {
    setDemoLoading(true);
    try {
      await fetch("/api/auth/demo", { method: "POST" });
      const result = await signIn("credentials", {
        email: DEMO_CREDENTIALS.email,
        password: DEMO_CREDENTIALS.password,
        redirect: false,
      });
      if (result?.error) {
        toast.error("Demo login failed");
        return;
      }
      await completeLogin(router);
    } finally {
      setDemoLoading(false);
    }
  }

  function copyCredentials() {
    navigator.clipboard.writeText(
      `Email: ${DEMO_CREDENTIALS.email}\nPassword: ${DEMO_CREDENTIALS.password}`
    );
    setCopied(true);
    toast.success("Demo credentials copied");
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-purple-600/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md"
      >
        <Card className="border-white/10 bg-white/[0.03] backdrop-blur-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>Access your QuantumShield dashboard</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-purple-600/10 border border-cyan-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-semibold text-cyan-300">Demo Account — Full Access</span>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Enterprise tier, all modules, all scan modes. No domain verification required.
              </p>
              <div className="space-y-1 text-xs font-mono mb-3">
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Email</span>
                  <span className="text-slate-200">{DEMO_CREDENTIALS.email}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-slate-500">Password</span>
                  <span className="text-slate-200">{DEMO_CREDENTIALS.password}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="glow"
                  size="sm"
                  className="flex-1"
                  onClick={handleDemoLogin}
                  disabled={demoLoading || isSubmitting}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {demoLoading ? "Signing in..." : "Use Demo Account"}
                </Button>
                <Button type="button" variant="secondary" size="sm" onClick={copyCredentials}>
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[#0B0F19] px-3 text-slate-500">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  placeholder="you@company.com"
                  className="mt-1"
                />
                {errors.email && (
                  <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                  placeholder="••••••••"
                  className="mt-1"
                />
                {errors.password && (
                  <p className="text-xs text-red-400 mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" variant="secondary" className="w-full" disabled={isSubmitting || demoLoading}>
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>

            <p className="text-center text-sm text-slate-400">
              No account?{" "}
              <Link href="/signup" className="text-cyan-400 hover:underline">
                Start for $5/mo
              </Link>
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
