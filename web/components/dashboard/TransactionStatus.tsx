"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CopyButton } from "@/components/shared/CopyButton";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { explorerTxUrl, shortPk } from "@/lib/format";
import { getProgramId } from "@/lib/solana";

export function TransactionStatus() {
  const { lastSig } = useDashboard();
  if (!lastSig) return null;

  return (
    <Card>
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
          Latest transaction
          <Badge variant="muted">view</Badge>
        </summary>
        <div className="mt-4 grid gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 font-mono text-xs text-zinc-200">
            {lastSig}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400">
            <a href={explorerTxUrl(lastSig)} target="_blank" rel="noreferrer">
              Explorer link
            </a>
            <Badge variant="muted">Program {shortPk(getProgramId().toBase58(), 6)}</Badge>
            <CopyButton text={lastSig} label="Copy sig" />
          </div>
        </div>
      </details>
    </Card>
  );
}
