import { PublicKey, type Connection } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";

export const DEFAULT_RPC_URL = "https://rpc.testnet.x1.xyz";
export const DEFAULT_PROGRAM_ID = "4BwetFdBHSkDTAByraaXiiwLFTQ5jj8w4mHGpYMrNn4r";

export function rpcUrl() {
  return process.env.NEXT_PUBLIC_RPC_URL ?? DEFAULT_RPC_URL;
}

export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? DEFAULT_PROGRAM_ID
);

export const deriveConfigPda = () =>
  PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];

export const deriveVaultPda = () =>
  PublicKey.findProgramAddressSync([Buffer.from("vault")], PROGRAM_ID)[0];

export const derivePositionPda = (owner: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("position"), owner.toBuffer()],
    PROGRAM_ID
  )[0];

export const deriveEpochPda = (epochIndex: number) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("epoch"), new BN(epochIndex).toArrayLike(Buffer, "le", 8)],
    PROGRAM_ID
  )[0];

export const deriveUserEpochPda = (owner: PublicKey, epochIndex: number) =>
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("user_epoch"),
      owner.toBuffer(),
      new BN(epochIndex).toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID
  )[0];

export type DecodedConfig = {
  admin: PublicKey;
  xntMint: PublicKey;
  mindMint: PublicKey;
  vaultXntAta: PublicKey;
  mindDecimals: number;
  xntDecimals: number;
  dailyEmissionInitial: BN;
  dailyEmissionCurrent: BN;
  epochSeconds: BN;
  softHalvingPeriodDays: BN;
  softHalvingBpsDrop: number;
  emissionStartTs: BN;
  lastEpochTs: BN;
  minedTotal: BN;
  minedCap: BN;
  totalSupplyMind: BN;
  mpCapBpsPerWallet: number;
  th1: BN;
  th2: BN;
  allowEpochSecondsEdit: boolean;
};

export async function fetchClockUnixTs(connection: Connection) {
  const info = await connection.getAccountInfo(
    // SYSVAR_CLOCK_PUBKEY
    new PublicKey("SysvarC1ock11111111111111111111111111111111"),
    "confirmed"
  );
  if (!info) throw new Error("Clock sysvar unavailable");
  return Number(info.data.readBigInt64LE(32));
}

export async function fetchConfig(connection: Connection): Promise<DecodedConfig> {
  const configPda = deriveConfigPda();
  const info = await connection.getAccountInfo(configPda, "confirmed");
  if (!info) {
    throw new Error(`Config not found: ${configPda.toBase58()}`);
  }
  const data = info.data;
  if (data.length < 233) {
    throw new Error(`Config account too small: ${data.length} bytes`);
  }
  let offset = 8;
  const readPubkey = () => {
    const pk = new PublicKey(data.subarray(offset, offset + 32));
    offset += 32;
    return pk;
  };
  const readU8 = () => data.readUInt8(offset++);
  const readBool = () => data.readUInt8(offset++) !== 0;
  const readU16 = () => {
    const v = data.readUInt16LE(offset);
    offset += 2;
    return v;
  };
  const readU64 = () => {
    const v = data.readBigUInt64LE(offset);
    offset += 8;
    return new BN(v.toString());
  };
  const readI64 = () => {
    const v = data.readBigInt64LE(offset);
    offset += 8;
    return new BN(v.toString());
  };

  const admin = readPubkey();
  const xntMint = readPubkey();
  const mindMint = readPubkey();
  const vaultXntAta = readPubkey();
  const mindDecimals = readU8();
  const xntDecimals = readU8();
  const dailyEmissionInitial = readU64();
  const dailyEmissionCurrent = readU64();
  const epochSeconds = readU64();
  const softHalvingPeriodDays = readU64();
  const softHalvingBpsDrop = readU16();
  const emissionStartTs = readI64();
  const lastEpochTs = readI64();
  const minedTotal = readU64();
  const minedCap = readU64();
  const totalSupplyMind = readU64();
  const mpCapBpsPerWallet = readU16();
  const th1 = readU64();
  const th2 = readU64();
  const allowEpochSecondsEdit = readBool();
  // bumps: 2x u8
  readU8();
  readU8();

  return {
    admin,
    xntMint,
    mindMint,
    vaultXntAta,
    mindDecimals,
    xntDecimals,
    dailyEmissionInitial,
    dailyEmissionCurrent,
    epochSeconds,
    softHalvingPeriodDays,
    softHalvingBpsDrop,
    emissionStartTs,
    lastEpochTs,
    minedTotal,
    minedCap,
    totalSupplyMind,
    mpCapBpsPerWallet,
    th1,
    th2,
    allowEpochSecondsEdit,
  };
}

export function getCurrentEpochFrom(cfg: Pick<DecodedConfig, "epochSeconds" | "emissionStartTs">, nowTs: number) {
  return Math.floor(
    (nowTs - cfg.emissionStartTs.toNumber()) / cfg.epochSeconds.toNumber()
  );
}

export async function fetchTokenBalanceUi(connection: Connection, ata: PublicKey) {
  try {
    const bal = await connection.getTokenAccountBalance(ata, "confirmed");
    return bal.value.uiAmountString ?? "0";
  } catch {
    return "0";
  }
}
