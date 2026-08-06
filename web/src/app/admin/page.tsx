"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2,
  CheckCircle2,
  CreditCard,
  LayoutDashboard,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PortalShell } from "@/components/layout/portal-shell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ManagePayload = {
  stats: {
    users: number;
    orgs: number;
    activeSubs: number;
    scans: number;
    pendingApprovals: number;
    pendingPayments: number;
  };
  users: Array<{
    id: string;
    email: string;
    name: string | null;
    platformRole: string;
    approvalStatus: string;
    lastLoginAt: string | null;
    createdAt: string;
    orgs: Array<{
      role: string;
      org: {
        name: string;
        subscription: { tier: string; status: string } | null;
      };
    }>;
  }>;
  payments: Array<{
    id: string;
    amount: number;
    currency: string;
    tier: string;
    status: string;
    createdAt: string;
    user: { email: string; name: string | null };
    org: { name: string } | null;
  }>;
};

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin#users", label: "Users", icon: Users },
  { href: "/admin#payments", label: "Payments", icon: CreditCard },
];

export default function AdminDashboardPage() {
  const [data, setData] = useState<ManagePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/manage", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load admin data");
      setData(await res.json());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function act(payload: Record<string, unknown>, key: string) {
    setActing(key);
    try {
      const res = await fetch("/api/admin/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Action failed");
      }
      toast.success("Updated");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setActing(null);
    }
  }

  return (
    <PortalShell
      title="Admin console"
      subtitle="Approvals · payments · platform management"
      accent="bg-gradient-to-br from-violet-400 to-purple-500"
      nav={NAV}
      loginPath="/admin/login"
    >
      <div className="flex items-center justify-between gap-3 mb-5">
        <div>
          <p className="eyebrow">Platform control</p>
          <h1 className="text-[22px] font-semibold tracking-tight mt-1">Operations dashboard</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
          Refresh
        </Button>
      </div>

      {loading && !data ? (
        <div className="card p-10 grid place-items-center text-muted">
          <Loader2 className="w-5 h-5 animate-spin" />
        </div>
      ) : data ? (
        <div className="space-y-5 animate-rise">
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            {[
              { label: "Users", value: data.stats.users, icon: Users },
              { label: "Orgs", value: data.stats.orgs, icon: Building2 },
              { label: "Active subs", value: data.stats.activeSubs, icon: ShieldCheck },
              { label: "Scans", value: data.stats.scans, icon: LayoutDashboard },
              { label: "Pending users", value: data.stats.pendingApprovals, icon: CheckCircle2 },
              { label: "Pending pay", value: data.stats.pendingPayments, icon: CreditCard },
            ].map((stat) => (
              <div key={stat.label} className="card p-3.5">
                <div className="flex items-center justify-between text-subtle">
                  <span className="text-[11px] uppercase tracking-wide font-semibold">{stat.label}</span>
                  <stat.icon className="w-3.5 h-3.5" />
                </div>
                <p className="text-[22px] font-semibold mt-2 tabular">{stat.value}</p>
              </div>
            ))}
          </div>

          <section id="users" className="card overflow-hidden">
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <p className="text-[14px] font-semibold">Users & approvals</p>
                <p className="text-[12px] text-muted">Approve, suspend, or change portal role</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="text-subtle text-left">
                  <tr className="border-b">
                    <th className="px-4 py-2.5 font-medium">User</th>
                    <th className="px-4 py-2.5 font-medium">Role</th>
                    <th className="px-4 py-2.5 font-medium">Status</th>
                    <th className="px-4 py-2.5 font-medium">Org</th>
                    <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((user) => {
                    const org = user.orgs[0]?.org;
                    return (
                      <tr key={user.id} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <p className="font-medium">{user.name ?? "—"}</p>
                          <p className="text-[12px] text-muted">{user.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            className="input h-8 text-[12px] px-2"
                            value={user.platformRole}
                            disabled={acting === `role-${user.id}`}
                            onChange={(e) =>
                              void act(
                                {
                                  action: "set_role",
                                  userId: user.id,
                                  platformRole: e.target.value,
                                },
                                `role-${user.id}`
                              )
                            }
                          >
                            <option value="CLIENT">CLIENT</option>
                            <option value="TESTER">TESTER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "chip",
                              user.approvalStatus === "APPROVED" && "text-emerald-300 border-emerald-400/30",
                              user.approvalStatus === "PENDING" && "text-amber-300 border-amber-400/30",
                              user.approvalStatus === "SUSPENDED" && "text-rose-300 border-rose-400/30"
                            )}
                          >
                            {user.approvalStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted">
                          <p>{org?.name ?? "—"}</p>
                          <p className="text-[11px]">
                            {org?.subscription?.tier ?? "—"} · {org?.subscription?.status ?? "—"}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-1.5">
                            {user.approvalStatus !== "APPROVED" && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={!!acting}
                                onClick={() =>
                                  void act({ action: "approve_user", userId: user.id }, `approve-${user.id}`)
                                }
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </Button>
                            )}
                            {user.approvalStatus !== "SUSPENDED" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!!acting}
                                onClick={() =>
                                  void act({ action: "suspend_user", userId: user.id }, `suspend-${user.id}`)
                                }
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Suspend
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section id="payments" className="card overflow-hidden">
            <div className="px-4 py-3 border-b">
              <p className="text-[14px] font-semibold">Payments</p>
              <p className="text-[12px] text-muted">Review and approve subscription payments</p>
            </div>
            {data.payments.length === 0 ? (
              <div className="p-8 text-center text-muted text-[13px]">
                No payment records yet. Create one from a user action or billing flow.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead className="text-subtle text-left">
                    <tr className="border-b">
                      <th className="px-4 py-2.5 font-medium">Customer</th>
                      <th className="px-4 py-2.5 font-medium">Amount</th>
                      <th className="px-4 py-2.5 font-medium">Tier</th>
                      <th className="px-4 py-2.5 font-medium">Status</th>
                      <th className="px-4 py-2.5 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.payments.map((payment) => (
                      <tr key={payment.id} className="border-b border-white/[0.04]">
                        <td className="px-4 py-3">
                          <p className="font-medium">{payment.user.email}</p>
                          <p className="text-[12px] text-muted">{payment.org?.name ?? "—"}</p>
                        </td>
                        <td className="px-4 py-3 tabular">
                          ${(payment.amount / 100).toFixed(2)} {payment.currency}
                        </td>
                        <td className="px-4 py-3">{payment.tier}</td>
                        <td className="px-4 py-3">
                          <span className="chip">{payment.status}</span>
                        </td>
                        <td className="px-4 py-3">
                          {payment.status === "PENDING" && (
                            <div className="flex justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={!!acting}
                                onClick={() =>
                                  void act(
                                    { action: "approve_payment", paymentId: payment.id },
                                    `pay-ok-${payment.id}`
                                  )
                                }
                              >
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                disabled={!!acting}
                                onClick={() =>
                                  void act(
                                    { action: "reject_payment", paymentId: payment.id },
                                    `pay-no-${payment.id}`
                                  )
                                }
                              >
                                Reject
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : null}
    </PortalShell>
  );
}
