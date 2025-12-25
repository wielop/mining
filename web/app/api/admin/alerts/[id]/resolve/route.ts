import { NextResponse } from "next/server";
import { markAlertResolved } from "@/lib/adminAlertsStore";

// Resolves an alert in the in-memory store.
// TODO: Persist in a real DB so resolves survive restarts.
export async function POST(
  _request: Request,
  context: { params: { id: string } }
) {
  const id = context.params.id;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  markAlertResolved(id);
  return NextResponse.json({ ok: true });
}
