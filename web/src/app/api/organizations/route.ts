import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { slugify, isSlugAvailable } from "@/lib/org";

const orgSchema = z.object({
  name: z.string().min(3).max(50),
  slug: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens only"),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = orgSchema.parse(body);

    const existingMembership = await prisma.orgMember.findFirst({
      where: { userId: session.user.id },
    });
    if (existingMembership) {
      return NextResponse.json({ error: "Organization already exists" }, { status: 409 });
    }

    const slugAvailable = await isSlugAvailable(data.slug);
    if (!slugAvailable) {
      return NextResponse.json({ error: "Slug is already taken" }, { status: 409 });
    }

    const org = await prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: data.name,
          slug: data.slug,
          ownerId: session.user.id,
          members: {
            create: { userId: session.user.id, role: "OWNER" },
          },
        },
      });

      await tx.subscription.create({
        data: {
          orgId: organization.id,
          stripeCustomerId: `pending_${organization.id}`,
          status: "INCOMPLETE",
          tier: "FREE",
        },
      });

      return organization;
    });

    return NextResponse.json({ orgId: org.id, slug: org.slug, name: org.name });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.issues[0].message }, { status: 400 });
    }
    console.error("Create org error:", err);
    return NextResponse.json({ error: "Failed to create organization" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug");
  if (!slug) {
    return NextResponse.json({ error: "slug required" }, { status: 400 });
  }
  const available = await isSlugAvailable(slug);
  return NextResponse.json({ available, suggested: slugify(slug) });
}
