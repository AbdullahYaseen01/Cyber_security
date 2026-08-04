import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { handleApiError, requireApiSubscription } from "@/lib/api-auth";

export async function GET() {
  try {
    const { org } = await requireApiSubscription();
    const endpoints = await prisma.apiEndpoint.findMany({
      where: { orgId: org.orgId },
      include: { domain: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ endpoints });
  } catch (err) {
    return handleApiError(err);
  }
}

const schema = z.object({
  domainId: z.string(),
  path: z.string().min(1),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]),
  authType: z.string().optional(),
});

async function probeEndpoint(base: string, path: string, method: string, authType?: string) {
  const url = `${base.replace(/\/$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  const findings: string[] = [];
  let riskScore = 10;

  try {
    const res = await fetch(url, {
      method: method === "GET" || method === "DELETE" ? method : "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(6000),
      headers: { "User-Agent": "QuantumShield-APISecurity/1.0" },
    });

    if (!authType || authType === "none" || authType === "NONE") {
      if (res.status === 200 || res.status === 201) {
        findings.push("Endpoint reachable without authentication");
        riskScore += 35;
      }
    }
    if (res.status === 401 || res.status === 403) {
      findings.push(`Auth enforced (${res.status})`);
      riskScore = Math.max(10, riskScore - 10);
    }
    if (res.headers.get("access-control-allow-origin") === "*") {
      findings.push("CORS allows any origin");
      riskScore += 20;
    }
    if (!res.headers.get("content-security-policy")) {
      findings.push("No CSP on API response");
      riskScore += 5;
    }
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("json") && res.status < 400) {
      findings.push(`JSON response (${res.status})`);
    }
  } catch {
    findings.push("Probe failed — host unreachable or timed out");
    riskScore += 15;
  }

  return { riskScore: Math.min(100, riskScore), findings, lastTestedAt: new Date() };
}

export async function POST(req: NextRequest) {
  try {
    const { org } = await requireApiSubscription();
    const data = schema.parse(await req.json());

    const domain = await prisma.domain.findFirst({
      where: { id: data.domainId, orgId: org.orgId },
    });
    if (!domain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const probe = await probeEndpoint(`https://${domain.name}`, data.path, data.method, data.authType);

    const endpoint = await prisma.apiEndpoint.create({
      data: {
        orgId: org.orgId,
        domainId: data.domainId,
        path: data.path,
        method: data.method,
        authType: data.authType ?? "none",
        riskScore: probe.riskScore,
        lastTestedAt: probe.lastTestedAt,
        findings: probe.findings,
      },
    });
    return NextResponse.json({ endpoint }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
