import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePlatformAdmin } from "@/lib/admin-auth";
import { ApiError, handleApiError } from "@/lib/api-auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    await requirePlatformAdmin(request);

    const users = await prisma.user.findMany({
      take: 50,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        platformRole: true,
        approvalStatus: true,
        lastLoginAt: true,
        createdAt: true,
        orgs: {
          take: 1,
          select: {
            role: true,
            org: {
              select: {
                id: true,
                name: true,
                subscription: { select: { tier: true, status: true } },
              },
            },
          },
        },
      },
    });

    const payments = await prisma.payment.findMany({
      take: 40,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
        org: { select: { name: true } },
      },
    });

    const pendingApprovals = users.filter((u) => u.approvalStatus === "PENDING");
    const pendingPayments = payments.filter((p) => p.status === "PENDING");

    const [userCount, orgCount, activeSubs, scanCount] = await Promise.all([
      prisma.user.count(),
      prisma.organization.count(),
      prisma.subscription.count({ where: { status: "ACTIVE" } }),
      prisma.scan.count(),
    ]);

    return NextResponse.json({
      stats: {
        users: userCount,
        orgs: orgCount,
        activeSubs,
        scans: scanCount,
        pendingApprovals: pendingApprovals.length,
        pendingPayments: pendingPayments.length,
      },
      users,
      payments,
      pendingApprovals,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

const actionSchema = z.object({
  action: z.enum([
    "approve_user",
    "suspend_user",
    "set_role",
    "approve_payment",
    "reject_payment",
    "create_payment",
  ]),
  userId: z.string().optional(),
  paymentId: z.string().optional(),
  platformRole: z.enum(["CLIENT", "ADMIN", "TESTER"]).optional(),
  amount: z.number().int().positive().optional(),
  tier: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const admin = await requirePlatformAdmin(request);
    const body = actionSchema.parse(await request.json());

    if (body.action === "approve_user" || body.action === "suspend_user") {
      if (!body.userId) throw new ApiError("userId required", 400);
      const status = body.action === "approve_user" ? "APPROVED" : "SUSPENDED";
      const user = await prisma.user.update({
        where: { id: body.userId },
        data: { approvalStatus: status },
        select: { id: true, email: true, approvalStatus: true },
      });
      await prisma.auditLog.create({
        data: {
          actorId: admin.userId ?? null,
          actorEmail: admin.email,
          action: body.action,
          targetType: "user",
          targetId: user.id,
          metadata: { status },
        },
      });
      return NextResponse.json({ user });
    }

    if (body.action === "set_role") {
      if (!body.userId || !body.platformRole) {
        throw new ApiError("userId and platformRole required", 400);
      }
      const user = await prisma.user.update({
        where: { id: body.userId },
        data: { platformRole: body.platformRole },
        select: { id: true, email: true, platformRole: true },
      });
      await prisma.auditLog.create({
        data: {
          actorId: admin.userId ?? null,
          actorEmail: admin.email,
          action: "set_role",
          targetType: "user",
          targetId: user.id,
          metadata: { platformRole: body.platformRole },
        },
      });
      return NextResponse.json({ user });
    }

    if (body.action === "approve_payment" || body.action === "reject_payment") {
      if (!body.paymentId) throw new ApiError("paymentId required", 400);
      const status = body.action === "approve_payment" ? "APPROVED" : "REJECTED";
      const payment = await prisma.payment.update({
        where: { id: body.paymentId },
        data: {
          status,
          reviewedBy: admin.email,
          reviewedAt: new Date(),
          notes: body.notes,
        },
      });

      if (status === "APPROVED" && payment.orgId) {
        await prisma.subscription.updateMany({
          where: { orgId: payment.orgId },
          data: {
            status: "ACTIVE",
            tier: payment.tier as "STARTER" | "PROFESSIONAL" | "BUSINESS" | "ENTERPRISE",
          },
        });
      }

      await prisma.auditLog.create({
        data: {
          actorId: admin.userId ?? null,
          actorEmail: admin.email,
          action: body.action,
          targetType: "payment",
          targetId: payment.id,
          metadata: { status, amount: payment.amount },
        },
      });
      return NextResponse.json({ payment });
    }

    if (body.action === "create_payment") {
      if (!body.userId || !body.amount || !body.tier) {
        throw new ApiError("userId, amount, and tier required", 400);
      }
      const membership = await prisma.orgMember.findFirst({
        where: { userId: body.userId },
        select: { orgId: true },
      });
      const payment = await prisma.payment.create({
        data: {
          userId: body.userId,
          orgId: membership?.orgId,
          amount: body.amount,
          tier: body.tier,
          status: "PENDING",
          notes: body.notes,
          method: "manual",
        },
      });
      return NextResponse.json({ payment });
    }

    throw new ApiError("Unknown action", 400);
  } catch (err) {
    return handleApiError(err);
  }
}
