"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Shield,
  Sparkles,
  Copy,
  Check,
  Loader2,
  UserRound,
  ShieldCheck,
  FlaskConical,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PORTAL_ACCOUNTS, type PortalId } from "@/lib/portal-accounts";
import { homeForRole, mapSessionToStoreUser, waitForSessionUser } from "@/lib/session-client";
import { useAuthStore } from "@/store";
import { cn } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

const PORTALS: {
  id: PortalId;
  title: string;
  description: string;
  icon: typeof UserRound;
  accent: string;
}[] = [
  {
    id: "client",
    title: "Client demo",
    description: "Full workspace · agents · scanner",
    icon: UserRound,
    accent: "from-cyan-400/15 to-sky-500/10 border-cyan-400/25 hover:border-cyan-300/40",
  },
  {
    id: "tester",
    title: "Tester demo",
    description: "QA runs · health · staff tools",
    icon: FlaskConical,
    accent: "from-amber-400/15 to-orange-500/10 border-amber-400/25 hover:border-amber-300/40",
  },
  {
    id: "admin",
    title: "Admin demo",
    description: "Approvals · payments · system",
    icon: ShieldCheck,
    accent: "from-violet-400/15 to-purple-500/10 border-violet-400/25 hover:border-violet-300/40",
  },
];

export function PortalLogin({
  defaultPortal = "client",
  title = "Sign in",
  description = "Choose a portal or continue with email",
}: {
  defaultPortal?: PortalId;
  title?: string;
  description?: string;
}) {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [activePortal, setActivePortal] = useState<PortalId | null>(null);
  const [copied, setCopied] = useState(false);
  const account = PORTAL_ACCOUNTS[defaultPortal];

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: account.email,
      password: "",
    },
  });

  useEffect(() => {
    const error = new URLSearchParams(window.location.search).get("error");
    if (!error) return;
    const messages: Record<string, string> = {
      config: "Server not configured. Add AUTH_SECRET and DATABASE_URL in Vercel project settings.",
      database: "Database not connected. Add DATABASE_URL (Supabase) in Vercel.",
      demo: "Demo login failed. Check Vercel env vars and redeploy.",
    };
    toast.error(messages[error] ?? "Login failed. Please try again.");
    setActivePortal(null);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  async function completeLogin() {
    const user = await waitForSessionUser(8, 100);
    if (!user?.id) {
      toast.error("Session not ready. Please try again.");
      return false;
    }

    const mapped = mapSessionToStoreUser(user);
    if (mapped) setUser(mapped);

    toast.success(
      user.isDemo
        ? `${PORTAL_ACCOUNTS[
            user.platformRole === "ADMIN"
              ? "admin"
              : user.platformRole === "TESTER"
                ? "tester"
                : "client"
          ].label} ready`
        : "Welcome back!"
    );

    if (user.needsOnboarding) {
      router.push("/onboarding/organization");
    } else if (user.subscriptionStatus !== "ACTIVE" && !user.isDemo) {
      router.push("/onboarding/subscription");
    } else {
      router.push(homeForRole(user.platformRole));
    }
    router.refresh();
    return true;
  }

  async function onSubmit(data: LoginForm) {
    const result = await signIn("credentials", {
      email: data.email.trim(),
      password: data.password,
      redirect: false,
    });

    if (result?.error) {
      if (result.error === "Configuration") {
        toast.error("Server not configured. Add AUTH_SECRET and DATABASE_URL in Vercel.");
      } else {
        toast.error("Invalid email or password");
      }
      return;
    }

    await completeLogin();
  }

  function handlePortalLogin(portal: PortalId) {
    setActivePortal(portal);
    window.location.assign(`/api/auth/demo-login?portal=${portal}`);
  }

  function fillCredentials(portal: PortalId) {
    const creds = PORTAL_ACCOUNTS[portal];
    setValue("email", creds.email);
    setValue("password", creds.password);
    toast.message(`Filled ${creds.label} credentials`);
  }

  function copyCredentials() {
    const lines = PORTALS.map((p) => {
      const c = PORTAL_ACCOUNTS[p.id];
      return `${c.label}\nEmail: ${c.email}\nPassword: ${c.password}`;
    }).join("\n\n");
    navigator.clipboard.writeText(lines);
    setCopied(true);
    toast.success("All demo credentials copied");
    setTimeout(() => setCopied(false), 2000);
  }

  const busy = Boolean(activePortal) || isSubmitting;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-lg animate-rise">
        <Card className="shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)]">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto mb-3 w-12 h-12 rounded-[12px] bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" strokeWidth={2.4} />
            </div>
            <CardTitle className="text-[22px] tracking-tight">{title}</CardTitle>
            <CardDescription className="text-[13px]">{description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="eyebrow">One-click demo portals</p>
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="text-[11px] text-muted hover:text-foreground inline-flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  Copy all
                </button>
              </div>

              <div className="grid gap-2">
                {PORTALS.map((portal) => {
                  const Icon = portal.icon;
                  const creds = PORTAL_ACCOUNTS[portal.id];
                  const loading = activePortal === portal.id;
                  const highlighted = defaultPortal === portal.id;

                  return (
                    <div
                      key={portal.id}
                      className={cn(
                        "rounded-[12px] border bg-gradient-to-br p-3 transition-colors",
                        portal.accent,
                        highlighted && "ring-1 ring-cyan-300"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 w-8 h-8 rounded-[9px] bg-white/80 border border-[var(--line)] grid place-items-center">
                          <Icon className="w-4 h-4 text-foreground" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[13.5px] font-semibold">{portal.title}</p>
                            {highlighted && (
                              <span className="chip text-[10px] text-cyan-800 border-cyan-200">
                                This page
                              </span>
                            )}
                          </div>
                          <p className="text-[11.5px] text-muted mt-0.5">{portal.description}</p>
                          <p className="text-[11px] font-mono text-subtle mt-1.5 truncate">
                            {creds.email}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2.5 flex gap-2">
                        <Button
                          type="button"
                          variant="glow"
                          size="sm"
                          className="flex-1"
                          onClick={() => handlePortalLogin(portal.id)}
                          disabled={busy}
                        >
                          {loading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5" />
                          )}
                          {loading ? "Signing in…" : `Login as ${portal.id}`}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => fillCredentials(portal.id)}
                          disabled={busy}
                        >
                          Fill
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[var(--surface)] px-3 text-subtle">or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  {...register("email")}
                  placeholder="you@company.com"
                  className="mt-1"
                />
                {errors.email && (
                  <p className="text-xs text-rose-400 mt-1">{errors.email.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  {...register("password")}
                  placeholder="••••••••"
                  className="mt-1"
                />
                {errors.password && (
                  <p className="text-xs text-rose-400 mt-1">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" variant="secondary" className="w-full" disabled={busy}>
                {isSubmitting ? "Signing in…" : "Sign in"}
              </Button>
            </form>

            <div className="flex items-center justify-between text-[12.5px] text-muted pt-1">
              <div className="flex gap-3">
                <Link href="/login" className="hover:text-cyan-300 transition-colors">
                  Client
                </Link>
                <Link href="/tester/login" className="hover:text-amber-300 transition-colors">
                  Tester
                </Link>
                <Link href="/admin/login" className="hover:text-violet-300 transition-colors">
                  Admin
                </Link>
              </div>
              <Link href="/signup" className="text-cyan-300 hover:underline">
                Start free
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
