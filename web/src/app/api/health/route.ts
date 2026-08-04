import { NextResponse } from "next/server";
import { getConfigStatus } from "@/lib/env";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const config = getConfigStatus();
  let databaseReachable = false;
  let dbMs: number | null = null;

  if (config.database) {
    const start = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
      dbMs = Date.now() - start;
    } catch {
      databaseReachable = false;
      dbMs = Date.now() - start;
    }
  }

  return NextResponse.json({
    ...config,
    databaseReachable,
    dbMs,
    ready: config.ready && databaseReachable,
    version: "2.0.0",
  });
}
