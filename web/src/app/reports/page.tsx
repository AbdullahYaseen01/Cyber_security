import { ModulePage } from "@/components/modules/module-page";
import { Card, CardContent } from "@/components/ui/card";

export default function ReportsPage() {
  return (
    <ModulePage moduleId="reports" title="Reports Center" description="Centralized reporting across all security modules">
      <Card><CardContent className="pt-6 text-slate-400 text-sm">11 standard reports, drag-and-drop builder, PDF/HTML/DOCX export, scheduled delivery, white-labeling.</CardContent></Card>
    </ModulePage>
  );
}
