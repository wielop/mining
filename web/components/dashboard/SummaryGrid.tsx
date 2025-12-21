"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { formatTokenAmount } from "@/lib/format";

function SummaryCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card className="min-h-[120px] p-4">
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-2 text-[11px] uppercase tracking-[0.2em] text-zinc-400">{label}</div>
      {hint ? <div className="mt-2 text-xs text-zinc-500">{hint}</div> : null}
    </Card>
  );
}

export function SummaryGrid() {
  const { config, currentEpoch, stakingVaultXntBalanceUi, stakingVaultMindBalanceUi, positions, stakingPositions } =
    useDashboard();

  const userLockedXnt = useMemo(() => {
    if (!config) return null;
    const total = positions.reduce((acc, p) => acc + p.data.lockedAmount, 0n);
    return formatTokenAmount(total, config.xntDecimals, 4);
  }, [config, positions]);

  const userStakedMind = useMemo(() => {
    if (!config) return null;
    const total = stakingPositions.reduce((acc, p) => acc + p.data.amount, 0n);
    return formatTokenAmount(total, config.mindDecimals, 4);
  }, [config, stakingPositions]);

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <SummaryCard
        label="Current Epoch"
        value={currentEpoch == null ? <Skeleton className="h-7 w-20" /> : currentEpoch}
        hint="Live mining window"
      />
      <SummaryCard
        label="Emission"
        value={
          config ? (
            `${formatTokenAmount(BigInt(config.minedTotal.toString()), config.mindDecimals, 2)} / ${formatTokenAmount(
              BigInt(config.minedCap.toString()),
              config.mindDecimals,
              2
            )}`
          ) : (
            <Skeleton className="h-7 w-32" />
          )
        }
        hint="MIND mined vs cap"
      />
      <SummaryCard
        label="Pool TVL"
        value={
          stakingVaultXntBalanceUi ? (
            `${stakingVaultXntBalanceUi} XNT`
          ) : (
            <Skeleton className="h-7 w-24" />
          )
        }
        hint="XNT rewards pool"
      />
      <SummaryCard
        label="Total Staked"
        value={
          stakingVaultMindBalanceUi ? (
            `${stakingVaultMindBalanceUi} MIND`
          ) : (
            <Skeleton className="h-7 w-24" />
          )
        }
        hint="MIND locked"
      />
      <SummaryCard
        label="Your Locked XNT"
        value={userLockedXnt ? `${userLockedXnt} XNT` : <Skeleton className="h-7 w-20" />}
        hint="Active mining locks"
      />
      <SummaryCard
        label="Your Staked MIND"
        value={userStakedMind ? `${userStakedMind} MIND` : <Skeleton className="h-7 w-20" />}
        hint="Active stakes"
      />
    </div>
  );
}
