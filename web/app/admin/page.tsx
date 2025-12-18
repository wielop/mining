"use client";

import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { AdminPanel } from "@/components/AdminPanel";

export default function AdminPage() {
  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Admin Panel</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Update thresholds/limits (requires admin wallet).
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link className="text-sm text-zinc-300" href="/">
            Public
          </Link>
          <WalletMultiButton />
        </div>
      </div>

      <div className="mt-8">
        <AdminPanel />
      </div>
    </main>
  );
}

