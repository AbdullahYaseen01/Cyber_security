import { ModulePage } from "@/components/modules/module-page";
import { Card, CardContent } from "@/components/ui/card";

export default function ApiSecurityPage() {
  return (
    <ModulePage
      moduleId="api"
      title="API Security"
      description="Discover, inventory, and security-test all API endpoints"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {["Endpoints Discovered", "High Risk APIs", "Auth Bypass Tests"].map((label) => (
          <Card key={label}>
            <CardContent className="pt-6">
              <p className="text-xs text-slate-400 uppercase">{label}</p>
              <p className="text-3xl font-mono text-cyan-400 mt-1">—</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-6 text-slate-400 text-sm">
          Upload OpenAPI/Swagger spec or auto-discover endpoints via crawler. BOLA, JWT weakness, rate limit, and injection tests.
        </CardContent>
      </Card>
    </ModulePage>
  );
}
