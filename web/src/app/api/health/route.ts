import { NextResponse } from "next/server";
import { getConfigStatus } from "@/lib/env";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

export async function GET() {
  const config = getConfigStatus();
  let databaseReachable = false;

  if (config.database) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseReachable = true;
    } catch {
      databaseReachable = false;
    }
  }

  return NextResponse.json({
    ...config,
    databaseReachable,
    ready: config.ready && databaseReachable,
  });
}
