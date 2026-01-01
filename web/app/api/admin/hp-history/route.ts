// HP history timeline for admin panel
import { NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import {
  decodeMinerPositionAccount,
  decodeUserMiningProfileAccount,
  MINER_POSITION_LEN_V1,
  MINER_POSITION_LEN_V2,
  USER_PROFILE_LEN_V1,
  USER_PROFILE_LEN_V2,
} from "@/lib/decoders";
import { fetchClockUnixTs, fetchConfig, getProgramId, getRpcUrl } from "@/lib/solana";

const BPS_DENOMINATOR = 10_000n;
const CACHE_TTL_MS = 15_000;
const DEFAULT_RANGE_HOURS = 24 * 7; // 7 days
const DEFAULT_STEP_HOURS = 6;
const MAX_POINTS = 300;

type CachedEntry = {
  key: string;
  ts: number;
  payload: ReturnType<typeof buildResponse>;
};

let cached: CachedEntry | null = null;

function rigTypeFromDuration(startTs: number, endTs: number, secondsPerDay: number) {
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
}

function rigBuffBps(rigType: number, buffLevel: number) {
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
}

function levelBonusBps(level: number) {
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
}

const buildResponse = (points: Array<{ ts: number; baseHp: bigint; buffHp: bigint; effectiveHp: bigint }>) =>
  ({
    points: points.map((p) => ({
      ts: p.ts,
      baseHp: p.baseHp.toString(),
      buffHp: p.buffHp.toString(),
      effectiveHp: p.effectiveHp.toString(),
    })),
    updatedAt: new Date().toISOString(),
  } satisfies {
    points: Array<{ ts: number; baseHp: string; buffHp: string; effectiveHp: string }>;
    updatedAt: string;
  });

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rangeHours = Math.max(
      1,
      Math.min(Number(searchParams.get("hours") ?? DEFAULT_RANGE_HOURS), 24 * 30)
    );
    const stepHours = Math.max(1, Math.min(Number(searchParams.get("stepHours") ?? DEFAULT_STEP_HOURS), 24));
    const key = `${rangeHours}:${stepHours}`;

    const nowMs = Date.now();
    if (cached && cached.key === key && nowMs - cached.ts < CACHE_TTL_MS) {
      return NextResponse.json(cached.payload);
    }

    const connection = new Connection(getRpcUrl(), "confirmed");
    const [cfg, nowTs] = await Promise.all([fetchConfig(connection), fetchClockUnixTs(connection)]);
    const programId = getProgramId();

    const [positionsV1, positionsV2, profilesV1, profilesV2] = await Promise.all([
      connection.getProgramAccounts(programId, {
        commitment: "confirmed",
        filters: [{ dataSize: MINER_POSITION_LEN_V1 }],
      }),
      connection.getProgramAccounts(programId, {
        commitment: "confirmed",
        filters: [{ dataSize: MINER_POSITION_LEN_V2 }],
      }),
      connection.getProgramAccounts(programId, {
        commitment: "confirmed",
        filters: [{ dataSize: USER_PROFILE_LEN_V1 }],
      }),
      connection.getProgramAccounts(programId, {
        commitment: "confirmed",
        filters: [{ dataSize: USER_PROFILE_LEN_V2 }],
      }),
    ]);

    const levels = new Map<string, number>();
    const loadProfile = (entry: (typeof profilesV1)[number]) => {
      const decoded = decodeUserMiningProfileAccount(Buffer.from(entry.account.data));
      const owner = new PublicKey(decoded.owner).toBase58();
      levels.set(owner, decoded.level || 1);
    };
    profilesV1.forEach(loadProfile);
    profilesV2.forEach(loadProfile);

    const positions = [...positionsV1, ...positionsV2].map((entry) => ({
      pubkey: entry.pubkey,
      data: decodeMinerPositionAccount(Buffer.from(entry.account.data)),
    }));

    const secondsPerDay = Number(cfg.secondsPerDay);
    const startTs = nowTs - rangeHours * 3600;
    const points: Array<{ ts: number; baseHp: bigint; buffHp: bigint; effectiveHp: bigint }> = [];

    const steps = Math.min(Math.ceil(rangeHours / stepHours) + 1, MAX_POINTS);
    for (let i = 0; i < steps; i++) {
      const ts = startTs + i * stepHours * 3600;
      const perOwner = new Map<
        string,
        {
          base: bigint;
          buffed: bigint;
          level: number;
        }
      >();

      for (const pos of positions) {
        const decoded = pos.data;
        if (decoded.deactivated || decoded.expired) continue;
        if (decoded.startTs > ts || decoded.endTs <= ts) continue;
        const owner = new PublicKey(decoded.owner).toBase58();
        const rigType = decoded.hpScaled
          ? decoded.rigType
          : rigTypeFromDuration(decoded.startTs, decoded.endTs, secondsPerDay);
        const buffBpsBase = rigBuffBps(rigType, decoded.buffLevel);
        const buffApplied =
          decoded.buffLevel > 0 &&
          (decoded.buffAppliedFromCycle === 0n || BigInt(ts) >= decoded.buffAppliedFromCycle);
        const buffBps = buffApplied ? BigInt(buffBpsBase) : 0n;
        const baseHp = decoded.hp;
        const buffedHp = (baseHp * (BPS_DENOMINATOR + buffBps)) / BPS_DENOMINATOR;
        const prev = perOwner.get(owner) ?? {
          base: 0n,
          buffed: 0n,
          level: levels.get(owner) ?? 1,
        };
        prev.base += baseHp;
        prev.buffed += buffedHp;
        perOwner.set(owner, prev);
      }

      let baseSum = 0n;
      let buffSum = 0n;
      let effectiveSum = 0n;
      for (const entry of perOwner.values()) {
        baseSum += entry.base;
        buffSum += entry.buffed;
        const bonusBps = levelBonusBps(entry.level);
        const effective = (entry.buffed * (BPS_DENOMINATOR + bonusBps)) / BPS_DENOMINATOR;
        effectiveSum += effective;
      }

      if (cfg.networkHpActive > effectiveSum) {
        effectiveSum = cfg.networkHpActive;
      }

      points.push({ ts, baseHp: baseSum, buffHp: buffSum, effectiveHp: effectiveSum });
    }

    const payload = buildResponse(points);
    cached = { key, ts: nowMs, payload };
    return NextResponse.json(payload);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
