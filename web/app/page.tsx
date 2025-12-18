"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicPanel } from "@/components/PublicPanel";

export default function HomePage() {
  const { publicKey } = useWallet();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">PoCM Vault Mining</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Public panel (deposit → heartbeat → claim) on X1 testnet.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="text-sm text-zinc-300" href="/admin">
            Admin
          </Link>
          <WalletMultiButton />
        </div>
      </div>

      <div className="mt-8 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <div className="text-sm text-zinc-400">Connected wallet</div>
        <div className="mt-1 font-mono text-sm">
          {publicKey?.toBase58() ?? "(not connected)"}
        </div>
      </div>

      <div className="mt-8">
        <PublicPanel />
      </div>
    </main>
  );
}

