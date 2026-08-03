import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO = {
  email: "demo@quantumshield.io",
  password: "Demo1234!",
  name: "Demo User",
  orgName: "QuantumShield Demo",
  slug: "quantumshield-demo",
};

async function main() {
  const passwordHash = await bcrypt.hash(DEMO.password, 12);

  let user = await prisma.user.upsert({
    where: { email: DEMO.email },
    create: {
      email: DEMO.email,
      password: passwordHash,
      name: DEMO.name,
    },
    update: {
      password: passwordHash,
      name: DEMO.name,
    },
  });

  let org = await prisma.organization.findUnique({ where: { slug: DEMO.slug } });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: DEMO.orgName,
        slug: DEMO.slug,
        ownerId: user.id,
        members: { create: { userId: user.id, role: "OWNER" } },
      },
    });
  } else {
    await prisma.orgMember.upsert({
      where: { orgId_userId: { orgId: org.id, userId: user.id } },
      create: { orgId: org.id, userId: user.id, role: "OWNER" },
      update: { role: "OWNER" },
    });
  }

  await prisma.subscription.upsert({
    where: { orgId: org.id },
    create: {
      orgId: org.id,
      stripeCustomerId: `demo_${org.id}`,
      status: "ACTIVE",
      tier: "ENTERPRISE",
      scansUsedThisMonth: 0,
    },
    update: {
      status: "ACTIVE",
      tier: "ENTERPRISE",
    },
  });

  console.log("Seed complete:");
  console.log(`  Demo login: ${DEMO.email} / ${DEMO.password}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
