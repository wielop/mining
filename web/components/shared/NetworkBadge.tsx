"use client";

import { Badge } from "@/components/ui/badge";
import { rpcUrl, PROGRAM_ID } from "@/lib/solana";
import { shortPk } from "@/lib/format";

export function NetworkBadge() {
  const url = rpcUrl();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="muted" title={url}>
        RPC: {url.replace(/^https?:\/\//, "")}
      </Badge>
      <Badge variant="muted" title={PROGRAM_ID.toBase58()}>
        Program: {shortPk(PROGRAM_ID.toBase58())}
      </Badge>
    </div>
  );
}
