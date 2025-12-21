"use client";

import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/components/dashboard/DashboardContext";

export function XPSection() {
  const { xpStats, userProfile, config } = useDashboard();

  return (
    <Card>
      <CardHeader
        title="XP"
        description="XP boosts staking rewards."
        right={xpStats ? <Badge variant="muted">{xpStats.tierName}</Badge> : null}
      />
      <div className="mt-4">
        <div className="text-2xl font-semibold text-white">{userProfile?.miningXp.toString() ?? "—"} XP</div>
        <div className="mt-2 text-xs text-zinc-400">
          {xpStats?.nextTierName ? `Next: ${xpStats.nextTierName}` : "Max tier unlocked"}
        </div>
        <div className="mt-4 h-2 w-full rounded-full bg-white/5">
          <div
            className="h-2 rounded-full bg-cyan-300/60"
            style={{ width: `${xpStats?.progress ?? 0}%` }}
          />
        </div>
        <div className="mt-2 text-xs text-zinc-500">
          {xpStats?.nextTierName
            ? `${xpStats.remaining.toString()} XP to ${xpStats.nextTierName}`
            : "XP cap reached"}
        </div>
      </div>

      <details className="group mt-5 rounded-3xl border border-white/5 bg-white/5 p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
          Tier thresholds
        </summary>
        <div className="mt-3 grid gap-2 text-xs text-zinc-400">
          <div className="flex items-center justify-between">
            <span>Silver</span>
            <span>{config?.xpTierSilver.toString() ?? "—"} XP</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Gold</span>
            <span>{config?.xpTierGold.toString() ?? "—"} XP</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Diamond</span>
            <span>{config?.xpTierDiamond.toString() ?? "—"} XP</span>
          </div>
        </div>
      </details>
    </Card>
  );
}
