"use client";

import { Badge } from "@/components/ui/badge";
import { getProgramId, rpcUrl } from "@/lib/solana";
import { shortPk } from "@/lib/format";

export function NetworkBadge() {
  const url = rpcUrl();
  const programId = getProgramId();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="muted" title={url}>
        RPC: {url.replace(/^https?:\/\//, "")}
      </Badge>
      <Badge variant="muted" title={programId.toBase58()}>
        Program: {shortPk(programId.toBase58())}
      </Badge>
    </div>
  );
}
