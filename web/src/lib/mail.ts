/**
 * Lightweight email sender.
 * Uses Resend HTTP API when RESEND_API_KEY is set; otherwise stores an in-app
 * notification so the report is still delivered inside the product.
 */

export type MailResult =
  | { ok: true; provider: "resend" | "inapp"; id?: string }
  | { ok: false; error: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}): Promise<MailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from =
    process.env.EMAIL_FROM?.trim() ||
    "QuantumShield <onboarding@resend.dev>";

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [opts.to],
          subject: opts.subject,
          html: opts.html,
          text: opts.text,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          ok: false,
          error: typeof body.message === "string" ? body.message : `Resend ${res.status}`,
        };
      }
      return { ok: true, provider: "resend", id: body.id };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  return { ok: true, provider: "inapp" };
}

export function buildScanReportHtml(input: {
  domain: string;
  mode: string;
  findingsCount: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  findings: Array<{ title: string; severity: string; url: string; remediation?: string | null }>;
  reportUrl: string;
  score?: number | null;
  grade?: string | null;
}) {
  const rows = input.findings
    .slice(0, 40)
    .map(
      (f) => `
      <tr>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#e2e8f0">${escapeHtml(f.title)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#94a3b8">${escapeHtml(f.severity)}</td>
        <td style="padding:10px 12px;border-bottom:1px solid #1e293b;color:#67e8f9;font-family:monospace;font-size:12px">${escapeHtml(f.url)}</td>
      </tr>`
    )
    .join("");

  return `<!doctype html>
<html>
<body style="margin:0;background:#070b14;color:#e2e8f0;font-family:Inter,Segoe UI,sans-serif">
  <div style="max-width:640px;margin:0 auto;padding:32px 20px">
    <h1 style="margin:0 0 8px;font-size:22px;color:#67e8f9">QuantumShield scan report</h1>
    <p style="margin:0 0 20px;color:#94a3b8">Target <strong style="color:#e2e8f0">${escapeHtml(input.domain)}</strong> · ${escapeHtml(input.mode)}</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:22px">
      ${stat("Findings", String(input.findingsCount))}
      ${stat("Critical", String(input.critical))}
      ${stat("High", String(input.high))}
      ${stat("Medium", String(input.medium))}
      ${stat("Low", String(input.low))}
      ${input.grade ? stat("Grade", input.grade) : ""}
    </div>
    <table style="width:100%;border-collapse:collapse;background:#121a2a;border:1px solid #1e293b;border-radius:12px;overflow:hidden">
      <thead>
        <tr style="background:#162033;text-align:left;color:#94a3b8;font-size:12px">
          <th style="padding:10px 12px">Finding</th>
          <th style="padding:10px 12px">Severity</th>
          <th style="padding:10px 12px">URL</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="3" style="padding:16px;color:#94a3b8">No findings recorded.</td></tr>`}</tbody>
    </table>
    <p style="margin:22px 0 0">
      <a href="${escapeHtml(input.reportUrl)}" style="display:inline-block;background:linear-gradient(90deg,#06b6d4,#0d9488);color:#042f2e;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">
        View full report
      </a>
    </p>
    <p style="margin:18px 0 0;color:#64748b;font-size:12px">Sent by QuantumShield</p>
  </div>
</body>
</html>`;
}

function stat(label: string, value: string) {
  return `<div style="background:#121a2a;border:1px solid #1e293b;border-radius:12px;padding:10px 14px;min-width:84px">
    <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em">${label}</div>
    <div style="font-size:20px;font-weight:700;margin-top:4px">${escapeHtml(value)}</div>
  </div>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
