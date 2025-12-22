import * as anchor from "@coral-xyz/anchor";
import {
  NATIVE_MINT,
  TOKEN_PROGRAM_ID,
  createAccount,
  createMint,
  createSyncNativeInstruction,
  getAccount,
  getOrCreateAssociatedTokenAccount,
  transfer,
} from "@solana/spl-token";
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import dotenv from "dotenv";
import {
  deriveConfigPda,
  deriveVaultPda,
  fetchConfig,
  getProgram,
  getProvider,
} from "./v2-common";

dotenv.config();

const toBaseUnits = (value: bigint, decimals: number) =>
  value * 10n ** BigInt(decimals);

const parseBigInt = (value: string | undefined, fallback: bigint) => {
  if (!value) {
    return fallback;
  }
  return BigInt(value);
};

const main = async () => {
  const program = getProgram();
  const provider = getProvider();
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  const configPda = deriveConfigPda();
  const vaultAuthority = deriveVaultPda();

  let cfg = await fetchConfig(connection);
  let mindMint = process.env.MIND_MINT
    ? new anchor.web3.PublicKey(process.env.MIND_MINT)
    : null;
  const xntMint = new anchor.web3.PublicKey(
    process.env.XNT_MINT ?? NATIVE_MINT.toBase58()
  );

  if (!cfg) {
    const mindDecimals = Number(process.env.MIND_DECIMALS ?? 9);
    if (!mindMint) {
      mindMint = await createMint(
        connection,
        wallet.payer,
        vaultAuthority,
        null,
        mindDecimals
      );
    }

    const stakingRewardVault = await createAccount(
      connection,
      wallet.payer,
      xntMint,
      vaultAuthority,
      Keypair.generate()
    );
    const treasuryVault = await createAccount(
      connection,
      wallet.payer,
      xntMint,
      vaultAuthority,
      Keypair.generate()
    );
    const stakingMindVault = await createAccount(
      connection,
      wallet.payer,
      mindMint,
      vaultAuthority,
      Keypair.generate()
    );

    const emissionPerDay = parseBigInt(
      process.env.EMISSION_MIND_PER_DAY,
      10_000n
    );
    const emissionPerSec = parseBigInt(
      process.env.EMISSION_PER_SEC,
      toBaseUnits(emissionPerDay, mindDecimals) / 86_400n
    );
    const maxEffectiveHp = parseBigInt(process.env.MAX_EFFECTIVE_HP, 50n);
    const secondsPerDay = parseBigInt(process.env.SECONDS_PER_DAY, 86_400n);

    await program.methods
      .initConfig({
        emissionPerSec: new anchor.BN(emissionPerSec.toString()),
        maxEffectiveHp: new anchor.BN(maxEffectiveHp.toString()),
        secondsPerDay: new anchor.BN(secondsPerDay.toString()),
      })
      .accounts({
        payer: wallet.publicKey,
        admin: wallet.publicKey,
        vaultAuthority,
        config: configPda,
        mindMint,
        xntMint,
        stakingRewardVault,
        treasuryVault,
        stakingMindVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    cfg = {
      admin: wallet.publicKey,
      emissionPerSec,
      mindMint,
      xntMint,
      stakingRewardVault,
      treasuryVault,
      stakingMindVault,
      maxEffectiveHp,
      secondsPerDay,
    };
  }

  if (!cfg) {
    throw new Error("Failed to load config after initialization.");
  }

  const seedStaking = parseBigInt(
    process.env.SEED_STAKING_XNT_BASE,
    toBaseUnits(1n, Number(process.env.XNT_DECIMALS ?? 9))
  );
  const seedTreasury = parseBigInt(
    process.env.SEED_TREASURY_XNT_BASE,
    toBaseUnits(1n, Number(process.env.XNT_DECIMALS ?? 9))
  );
  const totalSeed = seedStaking + seedTreasury;

  if (totalSeed > 0n) {
    const ownerXntAta = (
      await getOrCreateAssociatedTokenAccount(
        connection,
        wallet.payer,
        cfg.xntMint,
        wallet.publicKey
      )
    ).address;

    if (cfg.xntMint.equals(NATIVE_MINT)) {
      const current = (await getAccount(connection, ownerXntAta)).amount;
      if (current < totalSeed) {
        const need = totalSeed - current;
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
          console.warn("Insufficient SOL to wrap for seeding, skipping.");
        }
      }
    }

    const account = await getAccount(connection, ownerXntAta);
    if (account.amount >= totalSeed) {
      if (seedTreasury > 0n) {
        await transfer(
          connection,
          wallet.payer,
          ownerXntAta,
          cfg.treasuryVault,
          wallet.publicKey,
          seedTreasury
        );
      }
      if (seedStaking > 0n) {
        await transfer(
          connection,
          wallet.payer,
          ownerXntAta,
          cfg.stakingRewardVault,
          wallet.publicKey,
          seedStaking
        );
      }
    } else {
      console.warn("Insufficient XNT balance for seeding, skipping.");
    }
  }

  console.log("mining_v2 config:", configPda.toBase58());
  console.log("mindMint:", cfg.mindMint.toBase58());
  console.log("xntMint:", cfg.xntMint.toBase58());
  console.log("stakingRewardVault:", cfg.stakingRewardVault.toBase58());
  console.log("treasuryVault:", cfg.treasuryVault.toBase58());
  console.log("stakingMindVault:", cfg.stakingMindVault.toBase58());
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
