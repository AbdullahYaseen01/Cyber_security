"use client";

import { PortalLogin } from "@/components/auth/portal-login";

export default function TesterLoginPage() {
  return (
    <PortalLogin
      defaultPortal="tester"
      title="Tester console"
      description="Run QA suites, monitor health, and manage staff tests"
    />
  );
}
