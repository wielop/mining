"use client";

import { useMemo } from "react";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { formatDurationSeconds, formatTokenAmount, formatUnixTs } from "@/lib/format";

export function MineSection() {
  const {
    publicKey,
    config,
    nowTs,
    positions,
    activePositions,
    anyActive,
    planOptions,
    durationDays,
    setDurationDays,
    onDeposit,
    busy,
    emissionNotStarted,
    heartbeatDone,
    claimed,
    nextEpochCountdown,
    onHeartbeat,
    onClaim,
    onClaimAll,
    unclaimedEpochs,
    currentEpoch,
    estimatedRewardBase,
    onClosePosition,
  } = useDashboard();

  const primaryPosition = positions[0];
  const lockStatus = useMemo(() => {
    if (!primaryPosition || nowTs == null) return null;
    const active = primaryPosition.data.lockedAmount > 0n && nowTs < primaryPosition.data.lockEndTs;
    const ended = primaryPosition.data.lockedAmount > 0n && nowTs >= primaryPosition.data.lockEndTs;
    const remaining = active ? Math.max(0, primaryPosition.data.lockEndTs - nowTs) : null;
    return { active, ended, remaining };
  }, [primaryPosition, nowTs]);

  return (
    <Card>
      <CardHeader
        title="Mine XNT"
        description="Deposit once, heartbeat each epoch, claim MIND rewards."
        right={anyActive ? <Badge variant="success">active</Badge> : <Badge variant="muted">inactive</Badge>}
      />

      {!publicKey ? (
        <div className="mt-4 text-sm text-zinc-400">Connect wallet to start mining.</div>
      ) : positions.length === 0 ? (
        <div className="mt-4 grid gap-4">
          <div className="text-xs text-zinc-400">Select duration</div>
          <div className="grid grid-cols-3 gap-2">
            {planOptions.map((opt) => (
              <button
                key={opt.d}
                type="button"
                onClick={() => setDurationDays(opt.d)}
                className={[
                  "rounded-2xl border px-3 py-3 text-left text-xs transition",
                  durationDays === opt.d
                    ? "border-cyan-300/50 bg-cyan-300/10 text-white"
                    : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10",
                ].join(" ")}
              >
                <div className="text-sm font-semibold">{opt.d}d</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.2em] text-zinc-500">{opt.mult}</div>
                <div className="mt-2 text-xs text-cyan-200">{opt.price} XNT</div>
              </button>
            ))}
          </div>
          <Button
            size="lg"
            onClick={() => void onDeposit().catch(() => null)}
            disabled={!config || busy !== null || emissionNotStarted}
          >
            {busy === "buy" ? "Submitting…" : "Start Mining"}
          </Button>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-cyan-400/10 bg-ink/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">Position status</div>
              {lockStatus ? (
                <Badge variant={lockStatus.active ? "success" : lockStatus.ended ? "warning" : "muted"}>
                  {lockStatus.active ? "active" : lockStatus.ended ? "ended" : "inactive"}
                </Badge>
              ) : (
                <Badge variant="muted">loading</Badge>
              )}
            </div>
            <div className="mt-3 text-2xl font-semibold text-white">
              {config && primaryPosition
                ? `${formatTokenAmount(primaryPosition.data.lockedAmount, config.xntDecimals, 4)} XNT`
                : "—"}
            </div>
            <div className="mt-2 text-xs text-zinc-400">Locked amount</div>
            <div className="mt-4 grid gap-2 text-xs text-zinc-400">
              <div>
                Start:{" "}
                <span className="font-mono text-zinc-200">
                  {primaryPosition ? formatUnixTs(primaryPosition.data.lockStartTs) : "—"}
                </span>
              </div>
              <div>
                End:{" "}
                <span className="font-mono text-zinc-200">
                  {primaryPosition ? formatUnixTs(primaryPosition.data.lockEndTs) : "—"}
                </span>
              </div>
              {lockStatus?.active ? (
                <div>
                  Countdown:{" "}
                  <span className="font-mono text-zinc-200">
                    {formatDurationSeconds(lockStatus.remaining ?? 0)}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="rounded-3xl border border-cyan-400/10 bg-ink/80 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-zinc-400">Epoch actions</div>
              <Badge variant={heartbeatDone ? "success" : "warning"}>
                {heartbeatDone ? "heartbeat done" : "heartbeat needed"}
              </Badge>
            </div>
            <div className="mt-2 text-xs text-zinc-400">
              Current epoch:{" "}
              <span className="font-mono text-zinc-200">{currentEpoch ?? "—"}</span>
            </div>
            {nextEpochCountdown ? (
              <div className="mt-2 text-xs text-zinc-400">
                Next epoch in{" "}
                <span className="font-mono text-zinc-200">
                  {formatDurationSeconds(nextEpochCountdown.seconds)}
                </span>
              </div>
            ) : (
              <Skeleton className="mt-2 h-4 w-32" />
            )}
            {config && estimatedRewardBase != null ? (
              <div className="mt-2 text-xs text-zinc-400">
                Est. reward:{" "}
                <span className="font-mono text-zinc-200">
                  {formatTokenAmount(estimatedRewardBase, config.mindDecimals, 4)} MIND
                </span>
              </div>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                onClick={() => void onHeartbeat().catch(() => null)}
                disabled={busy !== null || heartbeatDone || !anyActive}
              >
                {busy === "heartbeat" ? "Submitting…" : "Heartbeat"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => void onClaim().catch(() => null)}
                disabled={busy !== null || !heartbeatDone || claimed || !anyActive}
              >
                {busy === "claim" ? "Submitting…" : "Claim"}
              </Button>
            </div>
            {unclaimedEpochs.length > 0 ? (
              <button
                type="button"
                className="mt-3 text-[11px] uppercase tracking-[0.2em] text-cyan-200/80"
                onClick={() => void onClaimAll().catch(() => null)}
                disabled={busy !== null}
              >
                Claim all ({unclaimedEpochs.length})
              </button>
            ) : null}
          </div>
        </div>
      )}

      <details className="group mt-5 rounded-3xl border border-white/5 bg-white/5 p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.2em] text-zinc-300">
          Advanced details
        </summary>
        <div className="mt-3 grid gap-2 text-xs text-zinc-400">
          <div className="flex items-center justify-between">
            <span>Active miners</span>
            <span className="font-mono text-zinc-200">{activePositions.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tier threshold 1</span>
            <span className="font-mono text-zinc-200">{config?.th1.toString() ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Tier threshold 2</span>
            <span className="font-mono text-zinc-200">{config?.th2.toString() ?? "—"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>MP cap per wallet</span>
            <span className="font-mono text-zinc-200">{config ? `${config.mpCapBpsPerWallet} bps` : "—"}</span>
          </div>
        </div>
        {positions.length > 0 ? (
          <div className="mt-4 grid gap-2 text-xs text-zinc-400">
            <div className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">Positions</div>
            {positions.slice(0, 3).map((p) => {
              const active = nowTs != null && p.data.lockedAmount > 0n && nowTs < p.data.lockEndTs;
              const ended = nowTs != null && p.data.lockedAmount > 0n && nowTs >= p.data.lockEndTs;
              return (
                <div key={p.pubkey} className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2">
                  <div className="font-mono text-[11px] text-zinc-300">{p.pubkey.slice(0, 6)}…</div>
                  <div className="flex items-center gap-2">
                    <Badge variant={active ? "success" : ended ? "warning" : "muted"}>
                      {active ? "active" : ended ? "ended" : "inactive"}
                    </Badge>
                    {ended ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => void onClosePosition(p.pubkey).catch(() => null)}
                      >
                        Close
                      </Button>
                    ) : null}
                  </div>
                </div>
              );
            })}
            {positions.length > 3 ? (
              <div className="text-[11px] text-zinc-500">Showing 3 most recent positions.</div>
            ) : null}
          </div>
        ) : null}
      </details>
    </Card>
  );
}
