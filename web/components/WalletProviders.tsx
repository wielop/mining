"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ConnectionProvider, WalletProvider, useWallet } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { checkRpcHealth, getProgramId, getRpcUrl } from "@/lib/solana";

export function WalletProviders({ children }: { children: React.ReactNode }) {
  // Vercel env vars are per-environment (Preview/Production); verify values there.
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [envError, setEnvError] = useState<string | null>(null);
  const usingProxyRef = useRef(false);
  const wallets = useMemo(
    () => [new BackpackWalletAdapter(), new PhantomWalletAdapter(), new SolflareWalletAdapter()],
    []
  );

  useEffect(() => {
    try {
      setEndpoint(getRpcUrl());
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setEnvError(msg);
    }
  }, []);

  useEffect(() => {
    const logKey = "__mining_v2_diag_logged__";
    const globalAny = globalThis as { [key: string]: unknown };
    if (!(logKey in globalAny)) {
      globalAny[logKey] = true;
      try {
        console.log("[mining_v2] rpc", getRpcUrl());
        console.log("[mining_v2] program", getProgramId().toBase58());
      } catch (e) {
        console.error("[mining_v2] env error", e);
      }
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = async () => {
      if (!endpoint) return;
      const result = await checkRpcHealth(endpoint);
      if (result.ok) {
        console.log("[mining_v2] rpc health ok", result.method, result.url);
        return;
      }
      console.error("[mining_v2] rpc health failed", result.error);
      if (!usingProxyRef.current && result.error.includes("Failed to fetch")) {
        if (mounted) {
          usingProxyRef.current = true;
          const proxyUrl = new URL("/api/rpc", window.location.origin).toString();
          console.warn("[mining_v2] switching to /api/rpc proxy", proxyUrl);
          setEndpoint(proxyUrl);
        }
      }
    };
    void run();
    return () => {
      mounted = false;
    };
  }, [endpoint]);

  if (envError) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-2xl px-4 py-16">
          <h1 className="text-xl font-semibold">Configuration error</h1>
          <p className="mt-3 text-sm text-zinc-300">{envError}</p>
        </div>
      </div>
    );
  }

  if (!endpoint) {
    return (
      <div className="min-h-dvh bg-zinc-950 text-zinc-100">
        <div className="mx-auto max-w-2xl px-4 py-16 text-sm text-zinc-400">Loading configuration…</div>
      </div>
    );
  }

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletLogger />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

function WalletLogger() {
  const { publicKey } = useWallet();
  useEffect(() => {
    if (!publicKey) return;
    const logKey = "__mining_v2_wallet_logged__";
    const globalAny = globalThis as { [key: string]: unknown };
    if (logKey in globalAny) return;
    globalAny[logKey] = true;
    console.log("[mining_v2] wallet", publicKey.toBase58());
  }, [publicKey]);
  return null;
}
