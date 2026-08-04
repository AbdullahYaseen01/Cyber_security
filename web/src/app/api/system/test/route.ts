import { NextResponse } from "next/server";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";
import { getRecentHealthHistory, runSystemTests } from "@/lib/system-tester";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireApiSubscription();
    const history = await getRecentHealthHistory(120);
    const latestByService = new Map<string, (typeof history)[0]>();
    for (const row of history) {
      if (!latestByService.has(row.serviceName)) {
        latestByService.set(row.serviceName, row);
      }
    }
    return NextResponse.json({
      history,
      latest: Array.from(latestByService.values()),
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST() {
  try {
    const { org } = await requireApiSubscription();
    const result = await runSystemTests(org.orgId);
    return NextResponse.json(result);
  } catch (err) {
    return handleApiError(err);
  }
}
