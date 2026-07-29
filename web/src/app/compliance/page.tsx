import { ModulePage } from "@/components/modules/module-page";
import { Card, CardContent } from "@/components/ui/card";

export default function CompliancePage() {
  return (
    <ModulePage moduleId="compliance" title="Compliance Hub" description="Track and automate compliance across frameworks">
      <Card><CardContent className="pt-6 text-slate-400 text-sm">ISO 27001, SOC 2, GDPR, PCI-DSS, NIST CSF, HIPAA. Gap analysis, evidence vault, audit readiness.</CardContent></Card>
    </ModulePage>
  );
}
