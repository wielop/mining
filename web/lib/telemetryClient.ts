export type TelemetryEvent =
  | { kind: "tx"; action: string; ok: boolean; durationMs: number }
  | { kind: "app_error"; message?: string };

// Fire-and-forget telemetry used by the admin health dashboard.
export async function sendTelemetry(event: TelemetryEvent) {
  try {
    await fetch("/api/admin/telemetry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(event),
    });
  } catch {
    // Best-effort only; ignore client telemetry failures.
  }
}
