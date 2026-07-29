import { ModulePage } from "@/components/modules/module-page";
import { Card, CardContent } from "@/components/ui/card";

export default function AgentsPage() {
  return (
    <ModulePage moduleId="agents" title="Agent Security" description="Endpoint and workload continuous monitoring">
      <Card><CardContent className="pt-6 text-slate-400 text-sm">Deploy lightweight agents on Linux, Windows, macOS, Docker, or Kubernetes. FIM, process monitoring, secrets scanning.</CardContent></Card>
    </ModulePage>
  );
}
