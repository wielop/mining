import { NextResponse } from "next/server";
import { recordAppError, recordTxSample } from "@/lib/adminMetricsStore";

const WINDOW_15M = 15 * 60 * 1000;

// Simple telemetry intake for admin health calculations.
// TODO: Move to persistent storage + authenticated intake for production.
export async function POST(request: Request) {
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  if (payload.kind === "tx") {
    const latencyMs = Number(payload.durationMs ?? 0);
    recordTxSample(
      {
        ts: Date.now(),
        ok: Boolean(payload.ok),
        latencyMs: Number.isFinite(latencyMs) ? Math.max(0, latencyMs) : 0,
        action: String(payload.action ?? "unknown"),
      },
      WINDOW_15M
    );
    return NextResponse.json({ ok: true });
  }
  if (payload.kind === "app_error") {
    recordAppError(
      { ts: Date.now(), message: payload.message ? String(payload.message) : undefined },
      WINDOW_15M
    );
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "Unknown telemetry kind" }, { status: 400 });
}
