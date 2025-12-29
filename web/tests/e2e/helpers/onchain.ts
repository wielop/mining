import { Connection, PublicKey } from "@solana/web3.js";
import {
  decodeMinerPositionAccount,
  decodeUserMiningProfileAccount,
  MINER_POSITION_LEN_V1,
  MINER_POSITION_LEN_V2,
} from "../../../lib/decoders";
import {
  deriveUserProfilePda,
  fetchClockUnixTs,
  fetchConfig,
  getProgramId,
  getRpcUrl,
} from "../../../lib/solana";

const BPS_DENOMINATOR = 10_000n;

const levelBonusBps = (level: number) => {
  switch (level) {
    case 1:
      return 0n;
    case 2:
      return 160n;
    case 3:
      return 340n;
    case 4:
      return 550n;
    case 5:
      return 780n;
    default:
      return 1000n;
  }
};

const rigTypeFromDuration = (startTs: number, endTs: number, secondsPerDay: number) => {
  if (!Number.isFinite(secondsPerDay) || secondsPerDay <= 0) return 0;
  const duration = Math.max(0, endTs - startTs);
  const days = Math.round(duration / secondsPerDay);
  switch (days) {
    case 7:
      return 0;
    case 14:
      return 1;
    case 28:
      return 2;
    default:
      return 0;
  }
};

const rigBuffBps = (rigType: number, buffLevel: number) => {
  if (rigType === 0) return buffLevel >= 1 ? 100 : 0;
  if (rigType === 1) {
    if (buffLevel >= 3) return 350;
    if (buffLevel === 2) return 200;
    if (buffLevel === 1) return 100;
    return 0;
  }
  if (rigType === 2) {
    if (buffLevel >= 3) return 500;
    if (buffLevel === 2) return 300;
    if (buffLevel === 1) return 150;
    return 0;
  }
  return 0;
};

export type WalletHpSnapshot = {
  baseHp: bigint;
  buffedHp: bigint;
  accountBonusHp: bigint;
  effectiveHp: bigint;
  level: number;
  networkHp: bigint;
};

export const fetchWalletHp = async (ownerAddress: string): Promise<WalletHpSnapshot> => {
  const connection = new Connection(getRpcUrl(), "confirmed");
  const programId = getProgramId();
  const owner = new PublicKey(ownerAddress);
  const [cfg, nowTs, profileAcc, positionsV1, positionsV2] = await Promise.all([
    fetchConfig(connection),
    fetchClockUnixTs(connection),
    connection.getAccountInfo(deriveUserProfilePda(owner), "confirmed"),
    connection.getProgramAccounts(programId, {
      commitment: "confirmed",
      filters: [
        { dataSize: MINER_POSITION_LEN_V1 },
        { memcmp: { offset: 8, bytes: owner.toBase58() } },
      ],
    }),
    connection.getProgramAccounts(programId, {
      commitment: "confirmed",
      filters: [
        { dataSize: MINER_POSITION_LEN_V2 },
        { memcmp: { offset: 8, bytes: owner.toBase58() } },
      ],
    }),
  ]);
  if (!cfg) {
    throw new Error("Config not found");
  }

  const profile = profileAcc?.data
    ? decodeUserMiningProfileAccount(Buffer.from(profileAcc.data))
    : null;
  const level = profile?.level ?? 1;
  const levelBps = levelBonusBps(level);
  const secondsPerDay = Number(cfg.secondsPerDay) > 0 ? Number(cfg.secondsPerDay) : 86_400;

  const active = [...positionsV1, ...positionsV2]
    .map((entry) => decodeMinerPositionAccount(Buffer.from(entry.account.data)))
    .filter((p) => !p.deactivated && !p.expired && p.endTs > nowTs);

  let baseHp = 0n;
  let buffedHp = 0n;
  for (const p of active) {
    const rigType = p.hpScaled
      ? p.rigType
      : rigTypeFromDuration(p.startTs, p.endTs, secondsPerDay);
    const buffBpsBase = rigBuffBps(rigType, p.buffLevel);
    const buffApplied =
      p.buffLevel > 0 &&
      (p.buffAppliedFromCycle === 0n || BigInt(nowTs) >= p.buffAppliedFromCycle);
    const buffBps = buffApplied ? BigInt(buffBpsBase) : 0n;
    baseHp += p.hp;
    buffedHp += (p.hp * (BPS_DENOMINATOR + buffBps)) / BPS_DENOMINATOR;
  }

  const effectiveHp =
    buffedHp > 0n
      ? (buffedHp * (BPS_DENOMINATOR + levelBps)) / BPS_DENOMINATOR
      : 0n;
  const accountBonusHp = effectiveHp > buffedHp ? effectiveHp - buffedHp : 0n;

  return {
    baseHp,
    buffedHp,
    accountBonusHp,
    effectiveHp,
    level,
    networkHp: cfg.networkHpActive,
  };
};

export const fetchNetworkHp = async () => {
  const connection = new Connection(getRpcUrl(), "confirmed");
  const cfg = await fetchConfig(connection);
  if (!cfg) {
    throw new Error("Config not found");
  }
  return cfg.networkHpActive;
};
