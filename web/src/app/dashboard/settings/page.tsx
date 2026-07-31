"use client";

import { signOut } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store";

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your organization and account</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Organization</CardTitle>
          <CardDescription>{user?.orgName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p><span className="text-slate-400">Role:</span> {user?.role}</p>
          <p><span className="text-slate-400">Plan:</span> {user?.tier}</p>
          <p><span className="text-slate-400">Status:</span> {user?.subscriptionStatus}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400 mb-4">{user?.email}</p>
          <Button variant="secondary" onClick={() => signOut({ callbackUrl: "/login" })}>
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
