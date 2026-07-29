import { ModulePage } from "@/components/modules/module-page";
import { Card, CardContent } from "@/components/ui/card";

export default function DarkwebPage() {
  return (
    <ModulePage moduleId="darkweb" title="Dark Web Intelligence" description="Monitor leaked credentials, breaches, and brand exposure">
      <Card><CardContent className="pt-6 text-slate-400 text-sm">Breach monitoring, leak detection, brand protection, org-wide safety score.</CardContent></Card>
    </ModulePage>
  );
}
