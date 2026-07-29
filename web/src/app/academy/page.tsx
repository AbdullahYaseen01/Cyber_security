import { ModulePage } from "@/components/modules/module-page";
import { Card, CardContent } from "@/components/ui/card";

export default function AcademyPage() {
  return (
    <ModulePage moduleId="academy" title="QuantumShield Academy" description="Security training content and certifications">
      <Card><CardContent className="pt-6 text-slate-400 text-sm">Enterprise security training modules, certifications, and upsell content.</CardContent></Card>
    </ModulePage>
  );
}
