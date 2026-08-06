"use client";

import { PortalLogin } from "@/components/auth/portal-login";

export default function AdminLoginPage() {
  return (
    <PortalLogin
      defaultPortal="admin"
      title="Admin console"
      description="Manage approvals, payments, users, and the platform"
    />
  );
}
