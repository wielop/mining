import * as anchor from "@coral-xyz/anchor";
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createSyncNativeInstruction,
  getAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { SystemProgram, Transaction } from "@solana/web3.js";
import dotenv from "dotenv";
import {
  deriveConfigPda,
  derivePositionPda,
  deriveProfilePda,
  deriveStakePda,
  deriveVaultPda,
  fetchConfig,
  fetchUserProfile,
  getProgram,
  getProvider,
} from "./v2-common";

dotenv.config();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const main = async () => {
  const program = getProgram();
  const provider = getProvider();
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  const cfg = await fetchConfig(connection);
  if (!cfg) {
    throw new Error("Config not found. Run yarn mainnet:deploy first.");
  }

  const vaultAuthority = deriveVaultPda();
  const configPda = deriveConfigPda();
  const userProfile = deriveProfilePda(wallet.publicKey);
  const nextPosition = await fetchUserProfile(connection, wallet.publicKey);
  const positionIndex = nextPosition?.nextPositionIndex ?? 0n;
  const positionPda = derivePositionPda(wallet.publicKey, positionIndex);

  const ownerXntAta = (
    await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      cfg.xntMint,
      wallet.publicKey
    )
  ).address;

  const ownerMindAta = (
    await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.payer,
      cfg.mindMint,
      wallet.publicKey
    )
  ).address;

  const xntDecimals = Number(process.env.XNT_DECIMALS ?? 9);
  const starterCost = 1n * 10n ** BigInt(xntDecimals);

  if (cfg.xntMint.equals(NATIVE_MINT)) {
    const current = (await getAccount(connection, ownerXntAta)).amount;
    if (current < starterCost) {
      const need = starterCost - current;
      const balance = BigInt(await connection.getBalance(wallet.publicKey));
      if (balance > need) {
        const wrapTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: ownerXntAta,
            lamports: need,
          }),
          createSyncNativeInstruction(ownerXntAta)
        );
        await provider.sendAndConfirm(wrapTx, []);
      } else {
        console.warn("Insufficient SOL to wrap for Starter, skipping smoke.");
        return;
      }
    }
  }

  try {
    await program.methods
      .buyContract(0, new anchor.BN(positionIndex.toString()))
      .accounts({
        owner: wallet.publicKey,
        config: configPda,
        userProfile,
        position: positionPda,
        vaultAuthority,
        xntMint: cfg.xntMint,
        stakingRewardVault: cfg.stakingRewardVault,
        treasuryVault: cfg.treasuryVault,
        ownerXntAta,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  } catch (err) {
    console.warn("Buy starter failed, skipping smoke.", err);
    return;
  }

  await sleep(2000);

  try {
    await program.methods
      .claimMind()
      .accounts({
        owner: wallet.publicKey,
        config: configPda,
        userProfile,
        position: positionPda,
        vaultAuthority,
        mindMint: cfg.mindMint,
        userMindAta: ownerMindAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
  } catch (err) {
    console.warn("Claim failed or nothing to claim yet.", err);
  }

  const mindBalance = (await getAccount(connection, ownerMindAta)).amount;
  if (mindBalance === 0n) {
    console.warn("No MIND to stake, skipping stake.");
    return;
  }

  const stakePda = deriveStakePda(wallet.publicKey);
  await program.methods
    .stakeMind(new anchor.BN(mindBalance.toString()))
    .accounts({
      owner: wallet.publicKey,
      config: configPda,
      userProfile,
      userStake: stakePda,
      vaultAuthority,
      stakingMindVault: cfg.stakingMindVault,
      ownerMindAta,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log("Smoke complete: buy + claim + stake ok.");
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
