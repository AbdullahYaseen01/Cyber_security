"use client";

import { PortalLogin } from "@/components/auth/portal-login";

export default function LoginPage() {
  return (
    <PortalLogin
      defaultPortal="client"
      title="Client sign in"
      description="Demo client workspace, or sign in with your account"
    />
  );
}
