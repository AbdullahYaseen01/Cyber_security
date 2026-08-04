import { createHash } from "crypto";

/** NextAuth requires a secret (min 32 chars) in production. */
export function getAuthSecret(): string {
  const explicit = process.env.AUTH_SECRET?.trim();
  if (explicit && explicit.length >= 32) return explicit;

  // Fallback when Supabase service key is set but AUTH_SECRET was missed in Vercel
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (serviceKey && serviceKey.length >= 32) {
    return createHash("sha256").update(`quantumshield-auth:${serviceKey}`).digest("hex");
  }

  if (process.env.NODE_ENV !== "production") {
    return "development-secret-min-32-characters-long";
  }

  return "";
}

export function isDatabaseConfigured(): boolean {
  const url = process.env.DATABASE_URL?.trim();
  return Boolean(url && url.startsWith("postgresql"));
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export function getAppUrl(): string {
  const authUrl = process.env.AUTH_URL?.trim();
  // Local dev: don't send users to production when AUTH_URL points at Vercel
  if (process.env.NODE_ENV === "development" && authUrl?.includes("vercel.app")) {
    return "http://localhost:3000";
  }
  return (
    authUrl ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export function getConfigStatus() {
  const authSecret = getAuthSecret();
  return {
    authSecret: authSecret.length >= 32,
    database: isDatabaseConfigured(),
    supabase: isSupabaseConfigured(),
    appUrl: getAppUrl(),
    ready: authSecret.length >= 32 && isDatabaseConfigured(),
  };
}
