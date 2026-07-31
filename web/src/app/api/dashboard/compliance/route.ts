import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiOrg } from "@/lib/api-auth";

const FRAMEWORKS = ["ISO27001", "SOC2", "GDPR"];

export async function GET() {
  try {
    const { org } = await requireApiOrg();

    const tasks = await prisma.complianceTask.findMany({
      where: { orgId: org.orgId, framework: { in: FRAMEWORKS } },
      select: { framework: true, status: true },
    });

    const compliance = FRAMEWORKS.map((framework) => {
      const fwTasks = tasks.filter((t) => t.framework === framework);
      const total = fwTasks.length;
      const complete = fwTasks.filter((t) => t.status === "COMPLETE").length;
      const inProgress = fwTasks.filter((t) => t.status === "IN_PROGRESS").length;
      const notStarted = fwTasks.filter((t) => t.status === "NOT_STARTED").length;
      const percentage = total > 0 ? Math.round((complete / total) * 100) : 0;

      return { framework, total, complete, inProgress, notStarted, percentage };
    });

    return NextResponse.json({ compliance });
  } catch (err) {
    return handleApiError(err);
  }
}
