import * as anchor from "@coral-xyz/anchor";
import { TOKEN_PROGRAM_ID, createAccount, createMint } from "@solana/spl-token";
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import dotenv from "dotenv";
import {
  deriveConfigPda,
  deriveLevelConfigPda,
  deriveStakingRewardVaultPda,
  deriveTreasuryVaultPda,
  deriveVaultPda,
  fetchConfig,
  getProgram,
  getProvider,
} from "./v2-common";

dotenv.config();

const toBaseUnits = (value: bigint, decimals: number) =>
  value * 10n ** BigInt(decimals);

const XNT_DECIMALS = 9;

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
  const levelConfigPda = deriveLevelConfigPda();
  const vaultAuthority = deriveVaultPda();
  const stakingRewardVault = deriveStakingRewardVaultPda();
  const treasuryVault = deriveTreasuryVaultPda();

  let cfg = await fetchConfig(connection);
  let mindMint = process.env.MIND_MINT
    ? new anchor.web3.PublicKey(process.env.MIND_MINT)
    : null;

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
        stakingRewardVault,
        treasuryVault,
        stakingMindVault,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    cfg = await fetchConfig(connection);
  }

  if (!cfg) {
    throw new Error("Failed to load config after initialization.");
  }

  if (!cfg.xntMint.equals(SystemProgram.programId)) {
    await program.methods
      .adminUseNativeXnt()
      .accounts({
        admin: wallet.publicKey,
        config: configPda,
        stakingRewardVault,
        treasuryVault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    cfg = await fetchConfig(connection);
  }

  if (!cfg) {
    throw new Error("Failed to load config after initialization.");
  }

  const levelConfigInfo = await connection.getAccountInfo(levelConfigPda, "confirmed");
  if (!levelConfigInfo) {
    const burnVaultEnv = process.env.MIND_BURN_VAULT;
    const treasuryVaultEnv = process.env.MIND_TREASURY_VAULT;
    const mindBurnVault = burnVaultEnv
      ? new PublicKey(burnVaultEnv)
      : await createAccount(
          connection,
          wallet.payer,
          cfg.mindMint,
          wallet.publicKey,
          Keypair.generate()
        );
    const mindTreasuryVault = treasuryVaultEnv
      ? new PublicKey(treasuryVaultEnv)
      : await createAccount(
          connection,
          wallet.payer,
          cfg.mindMint,
          wallet.publicKey,
          Keypair.generate()
        );

    await program.methods
      .initLevelConfig()
      .accounts({
        admin: wallet.publicKey,
        config: configPda,
        levelConfig: levelConfigPda,
        mindMint: cfg.mindMint,
        mindBurnVault,
        mindTreasuryVault,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  const seedStaking = parseBigInt(
    process.env.SEED_STAKING_XNT_BASE,
    toBaseUnits(1n, XNT_DECIMALS)
  );
  const seedTreasury = parseBigInt(
    process.env.SEED_TREASURY_XNT_BASE,
    toBaseUnits(1n, XNT_DECIMALS)
  );
  const totalSeed = seedStaking + seedTreasury;

  if (totalSeed > 0n) {
    const balance = BigInt(await connection.getBalance(wallet.publicKey));
    if (balance > totalSeed) {
      const tx = new Transaction();
      if (seedTreasury > 0n) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: cfg.treasuryVault,
            lamports: Number(seedTreasury),
          })
        );
      }
      if (seedStaking > 0n) {
        tx.add(
          SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: cfg.stakingRewardVault,
            lamports: Number(seedStaking),
          })
        );
      }
      await provider.sendAndConfirm(tx, []);
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
  console.log("levelConfig:", levelConfigPda.toBase58());
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
