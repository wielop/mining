"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useDashboard } from "@/components/dashboard/DashboardContext";
import { formatDurationSeconds } from "@/lib/format";

function StepShell({
  title,
  status,
  children,
}: {
  title: string;
  status: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-cyan-400/10 bg-ink/70 p-4 shadow-[0_0_20px_rgba(34,242,255,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-zinc-100">{title}</div>
        {status}
      </div>
      {children ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}

export function ActionWizard() {
  const {
    publicKey,
    positions,
    stakingPositions,
    planOptions,
    durationDays,
    setDurationDays,
    onDeposit,
    busy,
    emissionNotStarted,
    anyActive,
    heartbeatDone,
    claimed,
    nextEpochCountdown,
    onHeartbeat,
    onClaim,
    setStakeDialogOpen,
  } = useDashboard();

  const showWizard = !publicKey || positions.length === 0 || stakingPositions.length === 0;
  if (!showWizard) return null;

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <StepShell
        title="1. Connect Wallet"
        status={publicKey ? <Badge variant="success">connected</Badge> : <Badge variant="warning">required</Badge>}
      >
        <div className="text-xs text-zinc-400">
          {publicKey ? "Wallet ready." : "Connect your wallet to start mining and staking."}
        </div>
      </StepShell>

      <StepShell
        title="2. Start Mining"
        status={
          positions.length > 0 ? (
            <Badge variant="success">position created</Badge>
          ) : (
            <Badge variant="warning">choose duration</Badge>
          )
        }
      >
        {positions.length === 0 ? (
          <>
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
              disabled={!publicKey || busy !== null || emissionNotStarted}
              title={!publicKey ? "Connect wallet" : undefined}
            >
              {busy === "buy" ? "Submitting…" : "Start Mining"}
            </Button>
          </>
        ) : (
          <div className="text-xs text-zinc-400">
            Position ready. Head to heartbeat + claim when the epoch turns.
          </div>
        )}
      </StepShell>

      <StepShell
        title="3. Heartbeat + Claim"
        status={
          anyActive ? (
            <Badge variant={claimed ? "success" : heartbeatDone ? "warning" : "warning"}>
              {claimed ? "claimed" : heartbeatDone ? "claimable" : "heartbeat"}
            </Badge>
          ) : (
            <Badge variant="muted">inactive</Badge>
          )
        }
      >
        {anyActive ? (
          <>
            {nextEpochCountdown ? (
              <div className="text-xs text-zinc-400">
                Next epoch in{" "}
                <span className="font-mono text-zinc-200">
                  {formatDurationSeconds(nextEpochCountdown.seconds)}
                </span>
              </div>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                onClick={() => void onHeartbeat().catch(() => null)}
                disabled={busy !== null || heartbeatDone}
              >
                {busy === "heartbeat" ? "Submitting…" : "Heartbeat"}
              </Button>
              <Button
                onClick={() => void onClaim().catch(() => null)}
                disabled={busy !== null || !heartbeatDone || claimed}
                variant="secondary"
              >
                {busy === "claim" ? "Submitting…" : "Claim"}
              </Button>
            </div>
          </>
        ) : (
          <div className="text-xs text-zinc-500">Activate a miner to unlock heartbeat + claim.</div>
        )}
      </StepShell>

      <div className="lg:col-span-3 rounded-3xl border border-cyan-400/10 bg-ink/70 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-semibold text-zinc-100">4. Stake MIND</div>
          <Badge variant={stakingPositions.length > 0 ? "success" : "warning"}>
            {stakingPositions.length > 0 ? "staked" : "optional"}
          </Badge>
        </div>
        <div className="mt-3 text-xs text-zinc-400">
          Stake MIND to earn a share of the rewards pool. Choose amount and duration in one flow.
        </div>
        <div className="mt-4">
          <Button size="lg" onClick={() => setStakeDialogOpen(true)} disabled={!publicKey}>
            Stake MIND
          </Button>
        </div>
      </div>
    </div>
  );
}
