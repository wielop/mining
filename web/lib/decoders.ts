export type DecodedPosition = {
  lockedAmount: bigint;
  lockStartTs: number;
  lockEndTs: number;
  durationDays: number;
  timeMultiplierBps: number;
};

export type DecodedEpochState = {
  epochIndex: bigint;
  startTs: number;
  endTs: number;
  totalEffectiveMp: bigint;
  dailyEmission: bigint;
  finalized: boolean;
};

export type DecodedUserEpoch = {
  owner: Uint8Array;
  epochIndex: bigint;
  userMp: bigint;
  claimed: boolean;
};

function assertMinLen(data: Buffer, min: number, label: string) {
  if (data.length < min) throw new Error(`${label} too small: ${data.length} bytes`);
}

function readU128LE(data: Buffer, offset: number): bigint {
  const lo = data.readBigUInt64LE(offset);
  const hi = data.readBigUInt64LE(offset + 8);
  return lo + (hi << 64n);
}

export function decodeUserPositionAccount(data: Buffer): DecodedPosition {
  // Anchor discriminator (8) + UserPosition fields.
  // Rust order: owner, locked_amount, lock_start_ts, lock_end_ts, duration_days,
  // time_multiplier_bps, last_active_epoch, accrued_owed, last_claimed_epoch, bump.
  assertMinLen(data, 8 + 32 + 8 + 8 + 8 + 2 + 2 + 8 + 8 + 8 + 1, "UserPosition");
  let offset = 8;
  offset += 32; // owner
  const lockedAmount = data.readBigUInt64LE(offset);
  offset += 8;
  const lockStartTs = Number(data.readBigInt64LE(offset));
  offset += 8;
  const lockEndTs = Number(data.readBigInt64LE(offset));
  offset += 8;
  const durationDays = data.readUInt16LE(offset);
  offset += 2;
  const timeMultiplierBps = data.readUInt16LE(offset);
  return { lockedAmount, lockStartTs, lockEndTs, durationDays, timeMultiplierBps };
}

export function decodeEpochStateAccount(data: Buffer): DecodedEpochState {
  // discriminator (8) + EpochState fields.
  assertMinLen(data, 8 + 8 + 8 + 8 + 16 + 8 + 1 + 1, "EpochState");
  let offset = 8;
  const epochIndex = data.readBigUInt64LE(offset);
  offset += 8;
  const startTs = Number(data.readBigInt64LE(offset));
  offset += 8;
  const endTs = Number(data.readBigInt64LE(offset));
  offset += 8;
  const totalEffectiveMp = readU128LE(data, offset);
  offset += 16;
  const dailyEmission = data.readBigUInt64LE(offset);
  offset += 8;
  const finalized = data.readUInt8(offset) !== 0;
  return { epochIndex, startTs, endTs, totalEffectiveMp, dailyEmission, finalized };
}

export function decodeUserEpochAccount(data: Buffer): DecodedUserEpoch {
  // discriminator (8) + UserEpoch fields.
  assertMinLen(data, 8 + 32 + 8 + 16 + 1 + 1, "UserEpoch");
  let offset = 8;
  const owner = data.subarray(offset, offset + 32);
  offset += 32;
  const epochIndex = data.readBigUInt64LE(offset);
  offset += 8;
  const userMp = readU128LE(data, offset);
  offset += 16;
  const claimed = data.readUInt8(offset) !== 0;
  return { owner, epochIndex, userMp, claimed };
}

