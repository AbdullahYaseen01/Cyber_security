import { AppShell } from "@/components/layout/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-slate-400 text-sm mt-1">Team, billing, API keys, and integrations</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {["Team Members", "Billing & Subscription", "API Keys", "Integrations", "Notifications", "Security (2FA)"].map((section) => (
            <Card key={section}>
              <CardHeader><CardTitle className="text-base">{section}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-slate-400 mb-4">Configure {section.toLowerCase()} settings.</p>
                <Button variant="secondary" size="sm">Manage</Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
