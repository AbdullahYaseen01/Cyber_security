import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { AppShell } from "@/components/layout/app-shell";
import { isDemoUserEmail } from "@/lib/demo-auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!session.user.orgId) {
    redirect("/onboarding/organization");
  }

  if (!isDemoUserEmail(session.user.email)) {
    const subscription = await prisma.subscription.findUnique({
      where: { orgId: session.user.orgId },
    });

    if (subscription?.status !== "ACTIVE") {
      redirect("/onboarding/subscription");
    }
  }

  return <AppShell>{children}</AppShell>;
}
