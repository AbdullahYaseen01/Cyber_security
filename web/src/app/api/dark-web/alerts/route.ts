import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiSubscription();
    let alerts = await prisma.darkWebAlert.findMany({
      where: { orgId: org.orgId },
      orderBy: { createdAt: "desc" },
    });

    // Seed simulated intel once per org if empty
    if (alerts.length === 0) {
      const monitor = await prisma.darkWebMonitor.findUnique({ where: { orgId: org.orgId } });
      const domains = (monitor?.monitoredDomains as string[] | null) ?? ["demo.quantumshield.io"];
      await prisma.darkWebAlert.createMany({
        data: [
          {
            orgId: org.orgId,
            type: "credential_leak",
            severity: "HIGH",
            title: `Credential mention for ${domains[0] ?? "org"}`,
            description: "Simulated dark-web feed: employee emails appeared in a paste dump.",
            source: "simulated-paste",
            affectedEmails: [`admin@${domains[0] ?? "example.com"}`],
            status: "NEW",
          },
          {
            orgId: org.orgId,
            type: "brand_mention",
            severity: "MEDIUM",
            title: "Brand mention on underground forum",
            description: "Simulated actor discussion referencing your monitored domain.",
            source: "simulated-forum",
            status: "NEW",
          },
        ],
      });
      alerts = await prisma.darkWebAlert.findMany({
        where: { orgId: org.orgId },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({ alerts });
  } catch (err) {
    return handleApiError(err);
  }
}
