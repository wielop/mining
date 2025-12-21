import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import dotenv from "dotenv";
import { decodeStakingPositionAccount } from "../web/lib/decoders";
import { deriveConfigPda, getProgram, getProvider } from "./common";

dotenv.config();

const durationMultiplierBps = (days: number) => {
  if (days === 7) return 10_000n;
  if (days === 14) return 11_000n;
  if (days === 30) return 12_500n;
  return 15_000n;
};

const main = async () => {
  const program = getProgram();
  const provider = getProvider();
  const programId = program.programId;

  const stakingAccounts = await provider.connection.getProgramAccounts(programId, {
    commitment: "confirmed",
    filters: [{ dataSize: 85 }],
  });

  let totalWeighted = 0n;
  for (const acc of stakingAccounts) {
    const decoded = decodeStakingPositionAccount(Buffer.from(acc.account.data));
    const amount = decoded.amount;
    if (amount === 0n) continue;
    const baseWeight = (amount * durationMultiplierBps(decoded.durationDays)) / 10_000n;
    const boostedWeight = (baseWeight * BigInt(10_000 + decoded.xpBoostBps)) / 10_000n;
    totalWeighted += boostedWeight;
  }

  if (totalWeighted > BigInt("18446744073709551615")) {
    throw new Error("Weighted total exceeds u64");
  }

  const cfgPda = deriveConfigPda();
  const tx = await program.methods
    .adminSetStakingWeightedTotal(new BN(totalWeighted.toString()))
    .accounts({
      admin: (provider.wallet as { publicKey: PublicKey }).publicKey,
      config: cfgPda,
    })
    .rpc();

  console.log("Weighted total:", totalWeighted.toString());
  console.log("Update tx:", tx);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
