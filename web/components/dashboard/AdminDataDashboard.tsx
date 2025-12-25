"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TopBar } from "@/components/shared/TopBar";
import { AdminNav } from "@/components/admin/AdminNav";
import { fetchConfig } from "@/lib/solana";
import { formatError } from "@/lib/formatError";
import type { AlertEntry, FlowStats, ProtocolSnapshot } from "@/lib/adminData";

type AdminState = {
  snapshot: ProtocolSnapshot;
  flows: FlowStats[];
  alerts: AlertEntry[];
};

const formatNumber = (value: number, digits = 0) =>
  Number.isFinite(value)
    ? value.toLocaleString("en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      })
    : "-";

const formatToken = (value: number, digits = 2) => formatNumber(value, digits);

const formatTimestamp = (value: string | null) =>
  value ? new Date(value).toLocaleString() : "-";

// Admin Data Center dashboard for protocol snapshot, flows, and alerts.
export function AdminDataDashboard() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [isAdmin, setIsAdmin] = useState(false);
  const [state, setState] = useState<AdminState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [window, setWindow] = useState<FlowStats["window"]>("24h");

  const fetchState = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/admin/state", { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`API error ${res.status}`);
      }
      const data = (await res.json()) as AdminState;
      setState(data);
    } catch (err) {
      setError(formatError(err));
    }
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!publicKey) {
        setIsAdmin(false);
        return;
      }
      try {
        const cfg = await fetchConfig(connection);
        if (!active) return;
        setIsAdmin(cfg?.admin.equals(publicKey) ?? false);
      } catch {
        if (!active) return;
        setIsAdmin(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [connection, publicKey]);

  useEffect(() => {
    void fetchState();
    const interval = setInterval(fetchState, 30_000);
    return () => clearInterval(interval);
  }, [fetchState]);

  const selectedFlow = useMemo(
    () => state?.flows.find((item) => item.window === window) ?? null,
    [state, window]
  );

  const onResolve = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/alerts/${id}/resolve`, { method: "POST" });
      if (!res.ok) throw new Error(`Resolve failed (${res.status})`);
      await fetchState();
    } catch (err) {
      setError(formatError(err));
    }
  };

  return (
    <div className="min-h-screen bg-ink text-white">
      <TopBar link={{ href: "/", label: "Dashboard" }} />

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-10">
        <AdminNav active="data" isAdmin={isAdmin} />

        {!isAdmin ? (
          <Card className="mt-6 p-4 text-sm text-zinc-400">
            Connect with the admin wallet to view the Data Center.
          </Card>
        ) : null}

        {state ? (
          <>
            <section className="mt-6 grid gap-4 lg:grid-cols-3">
              <Card className="p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Mining snapshot
                </div>
                <div className="mt-3 space-y-2 text-sm text-zinc-200">
                  <div>Network HP: {formatNumber(state.snapshot.mining.networkHp)}</div>
                  <div>Max HP: {formatNumber(state.snapshot.mining.maxHp)}</div>
                  <div>
                    Daily emission: {formatToken(state.snapshot.mining.dailyEmissionMind)} MIND
                  </div>
                  <div>
                    Total mined: {formatToken(state.snapshot.mining.totalMindMined)} MIND
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Staking snapshot
                </div>
                <div className="mt-3 space-y-2 text-sm text-zinc-200">
                  <div>
                    Total staked: {formatToken(state.snapshot.staking.totalStakedMind)} MIND
                  </div>
                  <div>
                    Reward pool: {formatToken(state.snapshot.staking.rewardPoolXnt)} XNT
                  </div>
                  <div>Epoch ends: {formatTimestamp(state.snapshot.staking.epochEndsAt)}</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                  Treasury snapshot
                </div>
                <div className="mt-3 space-y-2 text-sm text-zinc-200">
                  <div>Available: {formatToken(state.snapshot.treasury.available)} XNT</div>
                  <div>
                    In staking bucket: {formatToken(state.snapshot.treasury.inStakingBucket)} XNT
                  </div>
                  <div>In LP: {formatToken(state.snapshot.treasury.inLp)} XNT</div>
                  <div>Investments: {formatToken(state.snapshot.treasury.inInvestments)} XNT</div>
                  <div>Reserve: {formatToken(state.snapshot.treasury.inReserve)} XNT</div>
                </div>
              </Card>
            </section>

            <section className="mt-8">
              <div className="flex flex-wrap items-center gap-2">
                {(["24h", "7d", "30d"] as const).map((value) => (
                  <Button
                    key={value}
                    size="sm"
                    variant={window === value ? "default" : "ghost"}
                    onClick={() => setWindow(value)}
                  >
                    {value}
                  </Button>
                ))}
              </div>
              <Card className="mt-4 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Flows</div>
                <div className="mt-3 grid gap-2 text-sm text-zinc-200">
                  <div>
                    XNT from mining: {selectedFlow ? formatToken(selectedFlow.xntFromMining) : "-"}
                  </div>
                  <div>
                    XNT to staking rewards:{" "}
                    {selectedFlow ? formatToken(selectedFlow.xntToStakingRewards) : "-"}
                  </div>
                  <div>
                    XNT to treasury: {selectedFlow ? formatToken(selectedFlow.xntToTreasury) : "-"}
                  </div>
                  <div>
                    XNT used for buyback: {selectedFlow ? formatToken(selectedFlow.xntUsedForBuyback) : "-"}
                  </div>
                  <div>
                    XNT added to LP: {selectedFlow ? formatToken(selectedFlow.xntAddedToLp) : "-"}
                  </div>
                </div>
              </Card>
            </section>

            <section className="mt-8">
              <Card className="p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-zinc-400">Alerts</div>
                <div className="mt-3 space-y-3 text-sm text-zinc-200">
                  {state.alerts.length === 0 ? (
                    <div className="text-xs text-zinc-500">No alerts.</div>
                  ) : (
                    state.alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div
                            className={[
                              "text-xs font-semibold uppercase tracking-[0.2em]",
                              alert.level === "CRITICAL"
                                ? "text-rose-200"
                                : alert.level === "WARN"
                                ? "text-amber-200"
                                : "text-zinc-300",
                            ].join(" ")}
                          >
                            {alert.level}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {formatTimestamp(alert.createdAt)}
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-white">{alert.message}</div>
                        {alert.details ? (
                          <div className="mt-1 text-xs text-zinc-500">{alert.details}</div>
                        ) : null}
                        <div className="mt-3 flex items-center gap-3 text-xs text-zinc-400">
                          <span>Resolved: {alert.resolved ? "Yes" : "No"}</span>
                          {!alert.resolved ? (
                            <button
                              type="button"
                              className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200"
                              onClick={() => void onResolve(alert.id)}
                            >
                              Mark resolved
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            </section>
          </>
        ) : null}

        {error ? <div className="mt-6 text-sm text-amber-200">{error}</div> : null}
      </main>
    </div>
  );
}
