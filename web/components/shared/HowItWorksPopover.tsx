"use client";

import { useState } from "react";

export function HowItWorksPopover() {
  const [activeTab, setActiveTab] = useState<"flow" | "start">("flow");
  return (
    <details className="relative">
      <summary className="cursor-pointer rounded-full border border-rose-500/40 bg-rose-500/20 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-rose-100 hover:bg-rose-500/30">
        How it works
      </summary>
      <div className="absolute right-0 mt-2 w-80 rounded-2xl border border-cyan-400/20 bg-ink/95 p-4 text-xs text-zinc-300 shadow-[0_0_24px_rgba(34,242,255,0.15)]">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("flow")}
            className={[
              "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
              activeTab === "flow"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-200",
            ].join(" ")}
          >
            How it works
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("start")}
            className={[
              "rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.2em]",
              activeTab === "start"
                ? "bg-white/10 text-white"
                : "text-zinc-500 hover:text-zinc-200",
            ].join(" ")}
          >
            Getting started
          </button>
        </div>

        {activeTab === "flow" ? (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">MINING FLOW</div>
            <ol className="mt-3 space-y-2 text-xs text-zinc-300">
              <li>
                1. Buy a mining contract to get hashpower (HP) for a set time. Your HP stays fixed, but your share can
                change as others join or expire.
              </li>
              <li>2. Global MIND emission is split pro-rata across all active HP.</li>
              <li>3. If network HP is zero, emission pauses.</li>
              <li>4. Claim MIND anytime.</li>
              <li>5. When a contract expires, you can deactivate it to free up HP.</li>
              <li>6. Stake MIND to earn XNT rewards.</li>
              <li>7. Rewards are distributed over time, based on your share of the pool.</li>
              <li>8. Badges can boost staking rewards — up to a +20% bonus cap.</li>
            </ol>
          </div>
        ) : (
          <div className="mt-4 max-h-72 overflow-y-auto pr-1">
            <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              Getting started – 6 simple steps
            </div>
            <div className="mt-3 space-y-3 text-xs text-zinc-300">
              <div>
                <div className="font-semibold text-zinc-200">1) Connect wallet & get WXNT</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-zinc-300">
                  <li>Connect your X1 wallet.</li>
                  <li>Make sure you have some WXNT to pay for mining contracts and a bit of XNT for gas.</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-zinc-200">2) Buy your first rig</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-zinc-300">
                  <li>Go to “Choose a rig” and pick Starter / Pro / Industrial.</li>
                  <li>Check the Selected box to see hashpower, duration and cost.</li>
                  <li>Click “Start mining” to launch the rig.</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-zinc-200">3) Watch your share & emission</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-zinc-300">
                  <li>On the main dashboard you’ll see: Your HP, Network HP, Your share and Est. MIND/day.</li>
                  <li>Your share can change when other users start or finish their rigs.</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-zinc-200">4) Claim MIND</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-zinc-300">
                  <li>As your rig mines, MIND builds up in your rigs section.</li>
                  <li>Use “Start Claim” to collect rewards from all active rigs.</li>
                  <li>Claiming does not stop your rigs.</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-zinc-200">5) Stake MIND → earn XNT</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-zinc-300">
                  <li>In the Staking section, enter how much MIND you want to stake and click “Stake”.</li>
                  <li>
                    Rewards are funded from mining purchases (30% of revenue) and distributed over time based on your
                    share of the pool.
                  </li>
                  <li>You can claim XNT anytime with “Claim XNT”.</li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-zinc-200">6) Unstaking & burn</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-zinc-300">
                  <li>You can unstake MIND whenever you want.</li>
                  <li>
                    3% of unstaked MIND is burned – this helps stabilize rewards and discourages rapid in-out cycles.
                  </li>
                </ul>
              </div>
              <div>
                <div className="font-semibold text-zinc-200">Quick recap</div>
                <ul className="mt-1 list-disc space-y-1 pl-4 text-zinc-300">
                  <li>Mining = WXNT → time-limited hashpower → you earn MIND.</li>
                  <li>Staking = MIND → staking pool → you earn XNT.</li>
                  <li>No fixed APR, no magic yield – everything comes from real payments into the system.</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </details>
  );
}
