import { ModulePage } from "@/components/modules/module-page";
import { Card, CardContent } from "@/components/ui/card";

export default function PhishingPage() {
  return (
    <ModulePage moduleId="phishing" title="Phishing Shield" description="Employee security awareness and simulated phishing campaigns">
      <Card><CardContent className="pt-6 text-slate-400 text-sm">50+ templates, campaign builder, awareness scorecards, AI spear-phishing generator.</CardContent></Card>
    </ModulePage>
  );
}
