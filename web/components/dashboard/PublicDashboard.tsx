"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { BN } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import Link from "next/link";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { NetworkBadge } from "@/components/shared/NetworkBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import { useToast } from "@/components/shared/ToastProvider";
import { getProgram } from "@/lib/anchor";
import {
  PROGRAM_ID,
  deriveConfigPda,
  deriveEpochPda,
  deriveUserEpochPda,
  deriveUserProfilePda,
  derivePositionPdaV2,
  deriveVaultPda,
  fetchClockUnixTs,
  fetchConfig,
  fetchTokenBalanceUi,
  getCurrentEpochFrom,
} from "@/lib/solana";
import { decodeEpochStateAccount, decodeUserEpochAccount, decodeUserPositionAccount, decodeUserProfileAccount } from "@/lib/decoders";
import { explorerTxUrl, formatDurationSeconds, formatTokenAmount, formatUnixTs, shortPk } from "@/lib/format";
import { formatError } from "@/lib/formatError";

function safeBigintToNumber(value: bigint): number {
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error("Amount is too large");
  return Number(value);
}

function formatEpochCountdown(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "now";
  return formatDurationSeconds(seconds);
}

function planFeeBase(durationDays: 7 | 14 | 30, decimals: number): bigint {
  const base = 10n ** BigInt(decimals);
  if (durationDays === 7) return base / 10n; // 0.1
  if (durationDays === 14) return base; // 1
  return base * 5n; // 5
}

function computeEstimatedReward(args: {
  dailyEmission: bigint;
  totalEffectiveMp: bigint;
  userMp: bigint;
  mpCapBpsPerWallet: number;
  minedCap: bigint;
  minedTotal: bigint;
}) {
  const { dailyEmission, totalEffectiveMp, userMp, mpCapBpsPerWallet, minedCap, minedTotal } = args;
  if (totalEffectiveMp <= 0n) return 0n;
  const capPortion = (totalEffectiveMp * BigInt(mpCapBpsPerWallet)) / 10_000n;
  const cappedUserMp = userMp < capPortion ? userMp : capPortion;
  if (cappedUserMp <= 0n) return 0n;
  const reward = (dailyEmission * cappedUserMp) / totalEffectiveMp;
  const remaining = minedCap > minedTotal ? minedCap - minedTotal : 0n;
  return reward < remaining ? reward : remaining;
}

export function PublicDashboard() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { push: pushToast } = useToast();

  const [config, setConfig] = useState<Awaited<ReturnType<typeof fetchConfig>> | null>(null);
  const [nowTs, setNowTs] = useState<number | null>(null);
  const [positions, setPositions] = useState<
    Array<{ pubkey: string; data: ReturnType<typeof decodeUserPositionAccount> }>
  >([]);
  const [xntBalanceUi, setXntBalanceUi] = useState<string | null>(null);
  const [mindBalanceUi, setMindBalanceUi] = useState<string | null>(null);

  const [epochState, setEpochState] = useState<ReturnType<typeof decodeEpochStateAccount> | null>(null);
  const [userEpoch, setUserEpoch] = useState<ReturnType<typeof decodeUserEpochAccount> | null>(null);

  const [durationDays, setDurationDays] = useState<7 | 14 | 30>(14);
  const [busy, setBusy] = useState<null | "buy" | "heartbeat" | "claim" | "close">(null);
  const [lastSig, setLastSig] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currentEpoch = useMemo(() => {
    if (!config || nowTs == null) return null;
    return getCurrentEpochFrom(config, nowTs);
  }, [config, nowTs]);

  const emissionNotStarted = useMemo(() => {
    if (!config || nowTs == null) return false;
    return nowTs < config.emissionStartTs.toNumber();
  }, [config, nowTs]);

  const nextEpochCountdown = useMemo(() => {
    if (!config || nowTs == null) return null;
    if (nowTs < config.emissionStartTs.toNumber()) {
      return { label: "starts in", seconds: Math.max(0, config.emissionStartTs.toNumber() - nowTs) };
    }
    const epoch = getCurrentEpochFrom(config, nowTs);
    const epochStart = config.emissionStartTs.toNumber() + epoch * config.epochSeconds.toNumber();
    const nextStart = epochStart + config.epochSeconds.toNumber();
    return { label: "next epoch in", seconds: Math.max(0, nextStart - nowTs) };
  }, [config, nowTs]);

  const activePositions = useMemo(() => {
    if (nowTs == null) return [];
    return positions.filter((p) => p.data.lockedAmount > 0n && nowTs < p.data.lockEndTs);
  }, [positions, nowTs]);

  const anyActive = activePositions.length > 0;

  const heartbeatDone = useMemo(() => {
    if (!userEpoch || currentEpoch == null) return false;
    return userEpoch.epochIndex === BigInt(currentEpoch);
  }, [userEpoch, currentEpoch]);

  const claimed = !!userEpoch?.claimed;

  const refresh = useCallback(async () => {
    setError(null);
    const cfg = await fetchConfig(connection);
    setConfig(cfg);
    const ts = await fetchClockUnixTs(connection);
    setNowTs(ts);

    if (!publicKey) {
      setPositions([]);
      setXntBalanceUi(null);
      setMindBalanceUi(null);
      setEpochState(null);
      setUserEpoch(null);
      return;
    }

    // List all positions for this owner via getProgramAccounts (no backend).
    // Filters: owner pubkey at offset 8 (after discriminator) + fixed account size (UserPosition).
    const gpa = await connection.getProgramAccounts(PROGRAM_ID, {
      commitment: "confirmed",
      filters: [
        { dataSize: 93 },
        { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
      ],
    });
    const decoded = gpa
      .map((a) => ({
        pubkey: a.pubkey.toBase58(),
        data: decodeUserPositionAccount(Buffer.from(a.account.data)),
      }))
      .sort((a, b) => b.data.lockStartTs - a.data.lockStartTs);
    setPositions(decoded);

    const xntMint = cfg.xntMint;
    if (xntMint.equals(NATIVE_MINT)) {
      const lamports = await connection.getBalance(publicKey, "confirmed");
      setXntBalanceUi(formatTokenAmount(BigInt(lamports), 9, 6));
    } else {
      const ownerXntAta = getAssociatedTokenAddressSync(xntMint, publicKey);
      setXntBalanceUi(await fetchTokenBalanceUi(connection, ownerXntAta));
    }

    const userMindAta = getAssociatedTokenAddressSync(cfg.mindMint, publicKey);
    setMindBalanceUi(await fetchTokenBalanceUi(connection, userMindAta));

    const epoch = getCurrentEpochFrom(cfg, ts);
    const epochStatePda = deriveEpochPda(epoch);
    const userEpochPda = deriveUserEpochPda(publicKey, epoch);
    const [epochAcc, userAcc] = await Promise.all([
      connection.getAccountInfo(epochStatePda, "confirmed"),
      connection.getAccountInfo(userEpochPda, "confirmed"),
    ]);
    setEpochState(epochAcc?.data ? decodeEpochStateAccount(Buffer.from(epochAcc.data)) : null);
    setUserEpoch(userAcc?.data ? decodeUserEpochAccount(Buffer.from(userAcc.data)) : null);
  }, [connection, publicKey, currentEpoch]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const id = window.setInterval(() => void refresh().catch(() => null), 15_000);
    return () => window.clearInterval(id);
  }, [refresh]);

  const signAndSend = useCallback(
    async (tx: Transaction) => {
      if (!publicKey) throw new Error("Connect a wallet first");
      if (!signTransaction) throw new Error("Wallet does not support signTransaction");
      tx.feePayer = publicKey;
      const latest = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = latest.blockhash;
      const signed = await signTransaction(tx);
      const sig = await connection.sendRawTransaction(signed.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });
      await connection.confirmTransaction(
        {
          signature: sig,
          blockhash: latest.blockhash,
          lastValidBlockHeight: latest.lastValidBlockHeight,
        },
        "confirmed"
      );
      return sig;
    },
    [connection, publicKey, signTransaction]
  );

  const withTx = useCallback(
    async (label: string, fn: () => Promise<string>) => {
      setError(null);
      setLastSig(null);
      pushToast({ title: label, description: "Confirm in your wallet…", variant: "info" });
      try {
        const sig = await fn();
        setLastSig(sig);
        pushToast({ title: "Transaction confirmed", description: shortPk(sig, 6), variant: "success" });
        await refresh();
        return sig;
      } catch (e: unknown) {
        const msg = formatError(e);
        setError(msg);
        pushToast({
          title: msg.includes("Plugin Closed") ? "Wallet action required" : "Transaction failed",
          description: msg.includes("Plugin Closed") ? "Open/unlock the wallet and retry." : "See error details on the page.",
          variant: "error",
        });
        throw e;
      }
    },
    [pushToast, refresh]
  );

  const onDeposit = async () => {
    if (!publicKey) throw new Error("Connect a wallet first");
    if (!anchorWallet) throw new Error("Wallet is not ready for Anchor");
    if (!config) throw new Error("Config not loaded");
    if (busy) return;
    if (emissionNotStarted) throw new Error(`Mining not started yet (start=${config.emissionStartTs.toNumber()})`);

    const feeBase = planFeeBase(durationDays, config.xntDecimals);
    const xntMint = config.xntMint;

    setBusy("buy");
    try {
      if (heartbeatDone && nextEpochCountdown) {
        pushToast({
          title: "Heads up",
          description: `You already heartbeated this epoch. This miner starts earning ${nextEpochCountdown.label} ${formatEpochCountdown(
            nextEpochCountdown.seconds
          )}.`,
          variant: "info",
        });
      }
      await withTx("Buy mining position", async () => {
        const program = getProgram(connection, anchorWallet);
        const tx = new Transaction();

        // Determine next position index from UserProfile PDA (or 0 if missing).
        const profilePda = deriveUserProfilePda(publicKey);
        const profileAcc = await connection.getAccountInfo(profilePda, "confirmed");
        const nextIndex = profileAcc?.data
          ? decodeUserProfileAccount(Buffer.from(profileAcc.data)).nextPositionIndex
          : 0n;

        const positionPda = derivePositionPdaV2(publicKey, nextIndex);

        const ownerXntAta = getAssociatedTokenAddressSync(xntMint, publicKey);
        const vaultAuthority = deriveVaultPda();
        const vaultXntAta = getAssociatedTokenAddressSync(xntMint, vaultAuthority, true);

        tx.add(
          createAssociatedTokenAccountIdempotentInstruction(
            publicKey,
            ownerXntAta,
            publicKey,
            xntMint,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID
          )
        );

        if (xntMint.equals(NATIVE_MINT)) {
          tx.add(
            SystemProgram.transfer({
              fromPubkey: publicKey,
              toPubkey: ownerXntAta,
              lamports: safeBigintToNumber(feeBase),
            }),
            createSyncNativeInstruction(ownerXntAta)
          );
        }

        const createIx = await program.methods
          .createPosition(durationDays, new BN(nextIndex.toString()))
          .accounts({
            owner: publicKey,
            config: deriveConfigPda(),
            userProfile: profilePda,
            position: positionPda,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        tx.add(createIx);

        const depositIx = await program.methods
          .deposit(new BN(feeBase.toString()))
          .accounts({
            owner: publicKey,
            config: deriveConfigPda(),
            position: positionPda,
            vaultAuthority,
            xntMint,
            vaultXntAta,
            ownerXntAta,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .instruction();
        tx.add(depositIx);

        return await signAndSend(tx);
      });
    } finally {
      setBusy(null);
    }
  };

  const onHeartbeat = async () => {
    if (!publicKey) throw new Error("Connect a wallet first");
    if (!anchorWallet) throw new Error("Wallet is not ready for Anchor");
    if (!config) throw new Error("Config not loaded");
    if (busy) return;
    if (!anyActive) throw new Error("Deposit first");
    const epoch = currentEpoch;
    if (epoch == null) throw new Error("Epoch not available");
    if (heartbeatDone) throw new Error("Heartbeat already recorded for this epoch");

    setBusy("heartbeat");
    try {
      await withTx("Heartbeat", async () => {
        const program = getProgram(connection, anchorWallet);
        const epochStatePda = deriveEpochPda(epoch);
        const userEpochPda = deriveUserEpochPda(publicKey, epoch);
        const ix = await program.methods
          .heartbeat(new BN(epoch))
          .accounts({
            owner: publicKey,
            config: deriveConfigPda(),
            epochState: epochStatePda,
            userEpoch: userEpochPda,
            systemProgram: SystemProgram.programId,
          })
          .remainingAccounts(
            activePositions.map((p) => ({
              pubkey: new PublicKey(p.pubkey),
              isSigner: false,
              isWritable: false,
            }))
          )
          .instruction();
        const tx = new Transaction().add(ix);
        return await signAndSend(tx);
      });
    } finally {
      setBusy(null);
    }
  };

  const onClaim = async () => {
    if (!publicKey) throw new Error("Connect a wallet first");
    if (!anchorWallet) throw new Error("Wallet is not ready for Anchor");
    if (!config) throw new Error("Config not loaded");
    if (busy) return;
    if (!anyActive) throw new Error("Deposit first");
    if (!heartbeatDone) throw new Error("Heartbeat required");
    if (claimed) throw new Error("Already claimed for this epoch");
    const epoch = currentEpoch;
    if (epoch == null) throw new Error("Epoch not available");

    setBusy("claim");
    try {
      await withTx("Claim", async () => {
        const program = getProgram(connection, anchorWallet);
        const epochStatePda = deriveEpochPda(epoch);
        const userEpochPda = deriveUserEpochPda(publicKey, epoch);
        const vaultAuthority = deriveVaultPda();
        const userMindAta = getAssociatedTokenAddressSync(config.mindMint, publicKey);
        const ix = await program.methods
          .claim()
          .accounts({
            owner: publicKey,
            config: deriveConfigPda(),
            vaultAuthority,
            epochState: epochStatePda,
            userEpoch: userEpochPda,
            mindMint: config.mindMint,
            userMindAta,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        const tx = new Transaction().add(ix);
        return await signAndSend(tx);
      });
    } finally {
      setBusy(null);
    }
  };

  const onClosePosition = async (positionPubkey: string) => {
    if (!publicKey) throw new Error("Connect a wallet first");
    if (!anchorWallet) throw new Error("Wallet is not ready for Anchor");
    if (busy) return;

    setBusy("close");
    try {
      await withTx("Close position", async () => {
        const program = getProgram(connection, anchorWallet);
        const ix = await program.methods
          .withdraw()
          .accounts({
            owner: publicKey,
            position: new PublicKey(positionPubkey),
            systemProgram: SystemProgram.programId,
          })
          .instruction();
        return await signAndSend(new Transaction().add(ix));
      });
    } finally {
      setBusy(null);
    }
  };

  const estimatedRewardBase = useMemo(() => {
    if (!config || !epochState || !userEpoch) return null;
    return computeEstimatedReward({
      dailyEmission: epochState.dailyEmission,
      totalEffectiveMp: epochState.totalEffectiveMp,
      userMp: userEpoch.userMp,
      mpCapBpsPerWallet: config.mpCapBpsPerWallet,
      minedCap: BigInt(config.minedCap.toString()),
      minedTotal: BigInt(config.minedTotal.toString()),
    });
  }, [config, epochState, userEpoch]);

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-white/5 bg-zinc-950/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-400/30 to-fuchsia-500/20 ring-1 ring-white/10" />
            <div>
              <div className="text-sm font-semibold leading-tight">PoCM Vault Mining</div>
              <div className="text-[11px] text-zinc-400">Deposit → Heartbeat → Claim → Withdraw</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link className="text-xs text-zinc-300 hover:text-white" href="/admin">
              Admin
            </Link>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl gap-4 px-4 pb-24 pt-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Mining Dashboard <span className="text-zinc-400">/</span>{" "}
              <span className="bg-gradient-to-r from-cyan-200 to-fuchsia-200 bg-clip-text text-transparent">
                Testnet
              </span>
            </h1>
            <div className="mt-2 text-sm text-zinc-400">
              Everything is derived on-chain. No backend. Confirm transactions in-wallet.
            </div>
            <div className="mt-3">
              <NetworkBadge />
            </div>
          </div>
          {publicKey ? (
            <div className="flex items-center gap-2">
              <Badge variant="muted">Wallet: {shortPk(publicKey.toBase58(), 6)}</Badge>
              <CopyButton text={publicKey.toBase58()} label="Copy" />
            </div>
          ) : (
            <Badge variant="warning">Connect wallet to start</Badge>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-7">
            <Card>
              <CardHeader
                title="Status Overview"
                description="Live on-chain state (auto-refresh every ~15s)."
                right={<Button variant="secondary" onClick={() => void refresh()} disabled={busy !== null}>Refresh</Button>}
              />
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-zinc-400">Current epoch</div>
                  <div className="mt-1 font-mono text-lg">
                    {currentEpoch == null ? <Skeleton className="h-6 w-24" /> : currentEpoch}
                  </div>
                  {nextEpochCountdown ? (
                    <div className="mt-2 text-xs text-zinc-400">
                      {nextEpochCountdown.label}{" "}
                      <span className="font-mono text-zinc-200">{formatEpochCountdown(nextEpochCountdown.seconds)}</span>
                    </div>
                  ) : null}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-zinc-400">On-chain time (Clock)</div>
                  <div className="mt-1 font-mono text-sm">{nowTs == null ? "(loading)" : formatUnixTs(nowTs)}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-zinc-400">Emission</div>
                  {config ? (
                    <div className="mt-1 text-sm text-zinc-200">
                      <div className="font-mono">
                        {formatTokenAmount(BigInt(config.minedTotal.toString()), config.mindDecimals, 2)} /{" "}
                        {formatTokenAmount(BigInt(config.minedCap.toString()), config.mindDecimals, 2)} MIND
                      </div>
                      <div className="mt-1 text-xs text-zinc-400">
                        start: {formatUnixTs(config.emissionStartTs.toNumber())}
                      </div>
                    </div>
                  ) : (
                    <Skeleton className="h-10 w-full" />
                  )}
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-zinc-400">Your position</div>
                  <div className="mt-1 text-sm text-zinc-200">
                    {!publicKey ? (
                      <Badge variant="muted">not connected</Badge>
                    ) : positions.length === 0 ? (
                      <Badge variant="warning">no position</Badge>
                    ) : anyActive ? (
                      <Badge variant="success">active miners</Badge>
                    ) : (
                      <Badge variant="muted">no active miners</Badge>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">Miners: {positions.length}</div>
                </div>
              </div>
              {emissionNotStarted && config ? (
                <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-sm text-amber-100">
                  Mining not started yet. Emission start:{" "}
                  <span className="font-mono">{formatUnixTs(config.emissionStartTs.toNumber())}</span>
                </div>
              ) : null}
            </Card>
          </div>

          <div className="md:col-span-5">
            <Card>
              <CardHeader
                title="Position"
                description={
                  anyActive
                    ? "You have active miners. Heartbeat each epoch and claim rewards."
                    : "Buy miners any time. Each purchase creates a new position."
                }
                right={
                  config ? (
                    <Badge variant="muted">{config.xntMint.equals(NATIVE_MINT) ? "XNT = wSOL" : "XNT = SPL"}</Badge>
                  ) : null
                }
              />

              {!publicKey ? (
                <div className="mt-4 text-sm text-zinc-400">Connect your wallet to view position controls.</div>
              ) : (
                <div className="mt-4 grid gap-4">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs text-zinc-400">XNT balance</div>
                      <div className="font-mono text-xs text-zinc-300">{xntBalanceUi ?? "(loading)"}</div>
                    </div>
                    <div className="text-xs text-zinc-400">Choose a plan</div>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { d: 7, mult: "1.0x", price: "0.1" },
                        { d: 14, mult: "1.25x", price: "1" },
                        { d: 30, mult: "1.5x", price: "5" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.d}
                          type="button"
                          onClick={() => setDurationDays(opt.d)}
                          className={[
                            "rounded-2xl border px-3 py-3 text-left transition",
                            durationDays === opt.d
                              ? "border-cyan-400/40 bg-cyan-500/10"
                              : "border-white/10 bg-white/5 hover:bg-white/10",
                          ].join(" ")}
                        >
                          <div className="text-sm font-semibold">{opt.d}d</div>
                          <div className="mt-1 text-xs text-zinc-400">{opt.mult}</div>
                          <div className="mt-2 text-xs text-zinc-200">{opt.price} XNT</div>
                        </button>
                      ))}
                    </div>
                    <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs text-amber-100">
                      Deposit is non-refundable (treasury fee). You can buy multiple miners.
                    </div>
                    {publicKey && heartbeatDone && nextEpochCountdown ? (
                      <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
                        You already recorded heartbeat for this epoch. New miners start earning{" "}
                        <span className="font-mono">
                          {nextEpochCountdown.label} {formatEpochCountdown(nextEpochCountdown.seconds)}
                        </span>
                        .
                      </div>
                    ) : null}
                    <Button
                      size="lg"
                      onClick={() => void onDeposit().catch(() => null)}
                      disabled={!config || busy !== null || emissionNotStarted}
                    >
                      {busy === "buy" ? "Submitting…" : "Buy miner"}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-12">
          <div className="md:col-span-7">
            <Card>
              <CardHeader title="Epoch Actions" description="These actions are only relevant while your lock is active." />
              {nextEpochCountdown ? (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-zinc-300">
                  {nextEpochCountdown.label}{" "}
                  <span className="font-mono text-zinc-100">{formatEpochCountdown(nextEpochCountdown.seconds)}</span>
                </div>
              ) : null}
              {!publicKey ? (
                <div className="mt-4 text-sm text-zinc-400">Connect wallet to see epoch actions.</div>
              ) : !anyActive ? (
                <div className="mt-4 text-sm text-zinc-400">
                  Buy a miner to participate in the current epoch.
                </div>
              ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">Heartbeat</div>
                        <div className="mt-1 text-xs text-zinc-400">Record your mining power for the current epoch.</div>
                      </div>
                      <Badge variant={heartbeatDone ? "success" : "warning"}>{heartbeatDone ? "done" : "required"}</Badge>
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={() => void onHeartbeat().catch(() => null)}
                        disabled={busy !== null || heartbeatDone || currentEpoch == null}
                        title={
                          heartbeatDone
                            ? nextEpochCountdown
                              ? `Already recorded. Next epoch in ${formatEpochCountdown(nextEpochCountdown.seconds)}`
                              : "Already recorded"
                            : currentEpoch == null
                              ? "Epoch unavailable"
                              : undefined
                        }
                      >
                        {busy === "heartbeat" ? "Submitting…" : "Heartbeat current epoch"}
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-semibold">Claim</div>
                        <div className="mt-1 text-xs text-zinc-400">Mint MIND rewards for the current epoch.</div>
                      </div>
                      <Badge variant={claimed ? "muted" : heartbeatDone ? "success" : "warning"}>
                        {claimed ? "claimed" : heartbeatDone ? "claimable" : "needs heartbeat"}
                      </Badge>
                    </div>
                    <div className="mt-3 text-xs text-zinc-400">
                      Est. reward:{" "}
                      <span className="font-mono text-zinc-200">
                        {config && estimatedRewardBase != null
                          ? `${formatTokenAmount(estimatedRewardBase, config.mindDecimals, 4)} MIND`
                          : "-"}
                      </span>
                    </div>
                    <div className="mt-4">
                      <Button
                        onClick={() => void onClaim().catch(() => null)}
                        disabled={busy !== null || !heartbeatDone || claimed}
                        title={!heartbeatDone ? "Heartbeat required" : claimed ? "Already claimed" : undefined}
                      >
                        {busy === "claim" ? "Submitting…" : "Claim current epoch"}
                      </Button>
                    </div>
                    <div className="mt-3 text-xs text-zinc-400">
                      MIND balance: <span className="font-mono text-zinc-200">{mindBalanceUi ?? "(loading)"}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          <div className="md:col-span-5">
            <Card>
              <CardHeader title="Your miners" description="Each purchase is a separate position." />
              {!publicKey ? (
                <div className="mt-4 text-sm text-zinc-400">Connect wallet to see your miners.</div>
              ) : positions.length === 0 ? (
                <div className="mt-4 text-sm text-zinc-400">No miners yet.</div>
              ) : (
                <div className="mt-4 grid gap-2">
                  {positions.slice(0, 5).map((p) => {
                    const active = nowTs != null && p.data.lockedAmount > 0n && nowTs < p.data.lockEndTs;
                    const remaining = nowTs != null ? Math.max(0, p.data.lockEndTs - nowTs) : null;
                    const ended = nowTs != null && p.data.lockedAmount > 0n && nowTs >= p.data.lockEndTs;
                    const inactive = p.data.lockedAmount === 0n;
                    return (
                      <div key={p.pubkey} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs text-zinc-400">Position</div>
                            <div className="mt-1 font-mono text-xs text-zinc-200">{shortPk(p.pubkey, 8)}</div>
                          </div>
                          <Badge variant={active ? "success" : inactive ? "warning" : "muted"}>
                            {active ? "active" : inactive ? "inactive" : ended ? "ended" : "inactive"}
                          </Badge>
                        </div>
                        <div className="mt-2 text-xs text-zinc-400">
                          paid:{" "}
                          <span className="font-mono text-zinc-200">
                            {config ? `${formatTokenAmount(p.data.lockedAmount, config.xntDecimals, 6)} XNT` : "-"}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          duration: <span className="font-mono text-zinc-200">{p.data.durationDays}d</span>
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          ends: <span className="font-mono text-zinc-200">{formatUnixTs(p.data.lockEndTs)}</span>
                        </div>
                        {active ? (
                          <div className="mt-2 text-xs text-zinc-400">
                            remaining:{" "}
                            <span className="font-mono text-zinc-200">
                              {remaining == null ? "-" : formatDurationSeconds(remaining)}
                            </span>
                          </div>
                        ) : ended ? (
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <div className="text-xs text-zinc-500">Lock ended. Close to reclaim rent (history will disappear).</div>
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled={busy !== null}
                              onClick={() => void onClosePosition(p.pubkey).catch(() => null)}
                            >
                              Close
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  {positions.length > 5 ? (
                    <div className="text-xs text-zinc-500">Showing 5 newest. (More can be added.)</div>
                  ) : null}
                </div>
              )}
            </Card>
          </div>
        </div>

        {lastSig ? (
          <Card>
            <CardHeader title="Transaction" description="Last confirmed signature." right={<CopyButton text={lastSig} label="Copy sig" />} />
            <div className="mt-3 flex flex-col gap-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 font-mono text-xs">{lastSig}</div>
              <div className="flex items-center gap-2">
                <a
                  className="text-xs text-cyan-200 underline-offset-4 hover:underline"
                  href={explorerTxUrl(lastSig)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View in explorer
                </a>
                <Badge variant="muted">Program: {shortPk(PROGRAM_ID.toBase58(), 6)}</Badge>
              </div>
            </div>
          </Card>
        ) : null}

        {error ? (
          <Card className="border-rose-500/20">
            <CardHeader title="Error" description="Actionable details from simulation / RPC." right={<Badge variant="danger">failed</Badge>} />
            <pre className="mt-3 whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-950/40 p-3 text-xs text-rose-100">
              {error}
            </pre>
          </Card>
        ) : null}

        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 bg-zinc-950/40 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
            <div className="text-xs text-zinc-400">
              {publicKey
                ? anyActive
                  ? "Mining active"
                  : "Ready to buy"
                : "Connect wallet"}
            </div>
            <Button
              size="lg"
              disabled={
                busy !== null ||
                !publicKey ||
                emissionNotStarted ||
                (anyActive && heartbeatDone && claimed)
              }
              onClick={() => {
                if (!publicKey) return;
                if (!anyActive) void onDeposit();
                else if (!heartbeatDone) void onHeartbeat();
                else if (!claimed) void onClaim();
              }}
              title={!publicKey ? "Connect wallet" : undefined}
            >
              {busy ? "Working…" : !anyActive ? "Buy" : !heartbeatDone ? "Heartbeat" : !claimed ? "Claim" : "Up to date"}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
