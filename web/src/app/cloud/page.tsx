import { ModulePage } from "@/components/modules/module-page";
import { Card, CardContent } from "@/components/ui/card";

export default function CloudPage() {
  return (
    <ModulePage moduleId="cloud" title="Cloud Guard (CSPM)" description="Multi-cloud misconfiguration and compliance scanning">
      <Card><CardContent className="pt-6 text-slate-400 text-sm">Connect AWS, Azure, GCP. Detect public buckets, permissive security groups, unencrypted databases, IAM violations.</CardContent></Card>
    </ModulePage>
  );
}
