import tls from "node:tls";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

function checkTlsDays(hostname: string): Promise<number | null> {
  return new Promise((resolve) => {
    const socket = tls.connect(
      { host: hostname, port: 443, servername: hostname, rejectUnauthorized: false },
      () => {
        const cert = socket.getPeerCertificate();
        socket.end();
        if (!cert?.valid_to) {
          resolve(null);
          return;
        }
        const days = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000);
        resolve(days);
      }
    );
    socket.setTimeout(4000, () => {
      socket.destroy();
      resolve(null);
    });
    socket.on("error", () => resolve(null));
  });
}

async function log(
  orgId: string,
  agentId: string,
  executionId: string,
  level: string,
  message: string,
  metadata?: Prisma.InputJsonValue
) {
  await prisma.agentLog.create({
    data: {
      orgId,
      agentId,
      executionId,
      level,
      message,
      metadata,
    },
  });
}

/** Execute a monitor/responder/hunter/compliance agent with real network checks. */
export async function runAgent(agentId: string): Promise<{ ok: boolean; executionId: string }> {
  const executionId = `exec_${Date.now().toString(36)}`;
  const agent = await prisma.agent.findUnique({ where: { id: agentId } });
  if (!agent) throw new Error("Agent not found");

  await prisma.agent.update({
    where: { id: agentId },
    data: { status: "ONLINE", lastHeartbeat: new Date() },
  });

  const config = (agent.config ?? {}) as { targetUrl?: string; intervalMinutes?: number };
  const target =
    agent.targetUrl ||
    config.targetUrl ||
    (typeof agent.hostname === "string" && agent.hostname.includes(".")
      ? `https://${agent.hostname}`
      : null);

  await log(agent.orgId, agentId, executionId, "info", `Run started (${agent.agentType})`);

  try {
    if (agent.agentType === "monitor" || !agent.agentType) {
      if (!target) {
        await log(agent.orgId, agentId, executionId, "warn", "No targetUrl configured");
        await prisma.agent.update({
          where: { id: agentId },
          data: { status: "WARNING", lastRunAt: new Date() },
        });
        return { ok: false, executionId };
      }

      const start = Date.now();
      let status = 0;
      let ok = false;
      try {
        const res = await fetch(target, {
          method: "GET",
          redirect: "follow",
          signal: AbortSignal.timeout(8000),
          headers: { "User-Agent": "QuantumShield-Agent/1.0" },
        });
        status = res.status;
        ok = res.ok;
      } catch (e) {
        await log(agent.orgId, agentId, executionId, "error", `HTTP check failed: ${String(e)}`);
        await prisma.agent.update({
          where: { id: agentId },
          data: { status: "WARNING", lastRunAt: new Date(), lastHeartbeat: new Date() },
        });
        return { ok: false, executionId };
      }

      const ms = Date.now() - start;
      await log(agent.orgId, agentId, executionId, "info", `HTTP ${status} in ${ms}ms`, {
        status,
        ms,
        target,
      });

      const host = new URL(target).hostname;
      const days = await checkTlsDays(host);
      if (days !== null) {
        await log(agent.orgId, agentId, executionId, "info", `TLS days remaining: ${days}`);
        if (days < 14) {
          await log(agent.orgId, agentId, executionId, "warn", `Certificate expires in ${days} days`);
          await prisma.agent.update({
            where: { id: agentId },
            data: {
              status: "WARNING",
              lastRunAt: new Date(),
              lastHeartbeat: new Date(),
              alerts: { tlsDaysLeft: days, httpStatus: status } as Prisma.InputJsonValue,
            },
          });
          return { ok: false, executionId };
        }
      }

      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: ok ? "ONLINE" : "WARNING",
          lastRunAt: new Date(),
          lastHeartbeat: new Date(),
          alerts: { httpStatus: status, responseMs: ms, tlsDaysLeft: days } as Prisma.InputJsonValue,
        },
      });
      await log(agent.orgId, agentId, executionId, "info", "Run completed successfully");
      return { ok, executionId };
    }

    if (agent.agentType === "compliance") {
      const openCritical = await prisma.finding.count({
        where: { orgId: agent.orgId, severity: "CRITICAL", status: "OPEN" },
      });
      await log(
        agent.orgId,
        agentId,
        executionId,
        openCritical > 0 ? "warn" : "info",
        `Open critical findings: ${openCritical}`
      );
      await prisma.agent.update({
        where: { id: agentId },
        data: {
          status: openCritical > 0 ? "WARNING" : "ONLINE",
          lastRunAt: new Date(),
          lastHeartbeat: new Date(),
        },
      });
      return { ok: openCritical === 0, executionId };
    }

    // hunter / responder — scan recent findings
    const recent = await prisma.finding.findMany({
      where: { orgId: agent.orgId },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { title: true, severity: true },
    });
    await log(agent.orgId, agentId, executionId, "info", `Reviewed ${recent.length} recent findings`, {
      findings: recent,
    });
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "ONLINE", lastRunAt: new Date(), lastHeartbeat: new Date() },
    });
    return { ok: true, executionId };
  } catch (err) {
    await log(agent.orgId, agentId, executionId, "error", String(err));
    await prisma.agent.update({
      where: { id: agentId },
      data: { status: "WARNING", lastRunAt: new Date() },
    });
    return { ok: false, executionId };
  }
}

/** Run all agents that are due (used by cron). */
export async function runDueAgents() {
  const agents = await prisma.agent.findMany({
    where: {
      OR: [
        { lastRunAt: null },
        { lastRunAt: { lt: new Date(Date.now() - 5 * 60_000) } },
      ],
    },
    take: 20,
  });
  const results = [];
  for (const a of agents) {
    results.push(await runAgent(a.id));
  }
  return results;
}
