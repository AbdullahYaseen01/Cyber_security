import { NextResponse } from "next/server";
import { ensureDemoUser } from "@/lib/demo-auth";

export async function POST() {
  try {
    const { user, membership } = await ensureDemoUser();
    return NextResponse.json({
      ok: true,
      email: user.email,
      orgId: membership.orgId,
      tier: "ENTERPRISE",
    });
  } catch (err) {
    console.error("Demo provision error:", err);
    return NextResponse.json({ error: "Failed to provision demo account" }, { status: 500 });
  }
}
