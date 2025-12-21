import { getRpcUrl } from "@/lib/solana";

function resolveRpcUrl() {
  const serverUrl = process.env.RPC_URL?.trim();
  if (serverUrl) {
    let parsed: URL;
    try {
      parsed = new URL(serverUrl);
    } catch {
      throw new Error(`Invalid RPC_URL: "${serverUrl}"`);
    }
    if (parsed.protocol !== "https:") {
      throw new Error(`RPC_URL must be https, got "${parsed.protocol}"`);
    }
    return serverUrl;
  }
  return getRpcUrl();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const url = resolveRpcUrl();
    const upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return Response.json({ error: msg }, { status: 500 });
  }
}
