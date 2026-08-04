import { NextRequest, NextResponse } from "next/server";
import { runSystemTests } from "@/lib/system-tester";
import { runDueAgents } from "@/lib/agent-engine";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Vercel cron + manual trigger. Protect with CRON_SECRET or SETUP_SECRET. */
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET || process.env.SETUP_SECRET;
  if (secret && auth !== `Bearer ${secret}`) {
    const urlSecret = req.nextUrl.searchParams.get("secret");
    if (urlSecret !== secret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const [health, agents] = await Promise.all([
    runSystemTests(null),
    runDueAgents().catch((e) => ({ error: String(e) })),
  ]);

  return NextResponse.json({ health, agents });
}
