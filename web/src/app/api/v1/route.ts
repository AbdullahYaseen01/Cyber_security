import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    name: "QuantumShield API",
    version: "1.0.0",
    docs: "/api/docs",
    endpoints: [
      "GET  /api/auth/me",
      "POST /api/auth/signup",
      "POST /api/auth/login",
      "POST /api/auth/logout",
      "GET  /api/domains",
      "POST /api/domains",
      "GET  /api/scans",
      "POST /api/scans",
      "POST /api/billing/checkout",
    ],
  });
}
