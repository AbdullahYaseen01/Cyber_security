import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

export function getServiceSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export type ScanRealtimeEvent =
  | { type: "progress"; progress: number; currentPhase: string; phaseIndex: number }
  | { type: "finding"; finding: Record<string, unknown> }
  | { type: "phase_change"; phase: string; index: number }
  | { type: "complete"; scanId: string }
  | { type: "error"; message: string };

export async function broadcastScanEvent(
  scanId: string,
  event: ScanRealtimeEvent
): Promise<void> {
  const client = getServiceSupabase();
  if (!client) return;
  await client.channel(`scan_${scanId}`).send({
    type: "broadcast",
    event: event.type,
    payload: event,
  });
}

export async function broadcastNotification(
  userId: string,
  notification: { title: string; message: string; type: string; link?: string }
): Promise<void> {
  const client = getServiceSupabase();
  if (!client) return;
  await client.channel(`user_${userId}`).send({
    type: "broadcast",
    event: "notification",
    payload: notification,
  });
}
