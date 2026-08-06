import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireTesterOrAdmin } from "@/lib/admin-auth";
import { ApiError, handleApiError } from "@/lib/api-auth";
import { runSystemTests } from "@/lib/system-tester";

export const runtime = "nodejs";

export async function GET() {
  try {
    await requireTesterOrAdmin();

    const [staff, testRuns, health, agents] = await Promise.all([
      prisma.user.findMany({
        where: { platformRole: { in: ["TESTER", "ADMIN"] } },
        take: 40,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          email: true,
          name: true,
          platformRole: true,
          approvalStatus: true,
          lastLoginAt: true,
        },
      }),
      prisma.testRun.findMany({
        take: 20,
        orderBy: { createdAt: "desc" },
      }),
      prisma.healthCheck.findMany({
        take: 24,
        orderBy: { createdAt: "desc" },
      }),
      prisma.agent.findMany({
        take: 20,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          status: true,
          agentType: true,
          lastRunAt: true,
          lastHeartbeat: true,
          org: { select: { name: true } },
        },
      }),
    ]);

    return NextResponse.json({ staff, testRuns, health, agents });
  } catch (err) {
    return handleApiError(err);
  }
}

const postSchema = z.object({
  action: z.enum(["run_system_tests", "create_test_run"]),
  name: z.string().optional(),
  suite: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const actor = await requireTesterOrAdmin();
    const body = postSchema.parse(await request.json());

    if (body.action === "run_system_tests") {
      const started = Date.now();
      const run = await prisma.testRun.create({
        data: {
          name: body.name ?? "System probe suite",
          suite: "system",
          status: "RUNNING",
          startedBy: actor.userId,
        },
      });

      const health = await runSystemTests(null);
      const passed = health.services.filter((r) => r.status === "healthy").length;
      const failed = health.services.filter((r) => r.status !== "healthy").length;

      const updated = await prisma.testRun.update({
        where: { id: run.id },
        data: {
          status: failed > 0 || health.overall !== "healthy" ? "FAILED" : "PASSED",
          passed,
          failed,
          durationMs: Date.now() - started,
          results: health as object,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ run: updated, health });
    }

    if (body.action === "create_test_run") {
      const run = await prisma.testRun.create({
        data: {
          name: body.name ?? "Manual QA run",
          suite: body.suite ?? "manual",
          status: "PASSED",
          passed: 1,
          failed: 0,
          startedBy: actor.userId,
          completedAt: new Date(),
          durationMs: 120,
          results: { note: "Recorded by tester console" },
        },
      });
      return NextResponse.json({ run });
    }

    throw new ApiError("Unknown action", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
