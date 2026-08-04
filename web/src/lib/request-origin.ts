import { getAppUrl } from "@/lib/env";

/** Resolve the public site origin (custom domain, not deployment preview URL). */
export function getRequestOrigin(request: Request): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  if (forwardedHost) {
    const host = forwardedHost.split(",")[0]?.trim();
    if (host) return `${proto}://${host}`;
  }

  return getAppUrl().replace(/\/$/, "");
}
