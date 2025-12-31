import dotenv from "dotenv";
import * as anchor from "@coral-xyz/anchor";
import {
  createTransferInstruction,
  getAccount,
  getAssociatedTokenAddress,
  getMint,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { Transaction } from "@solana/web3.js";

import { getProvider } from "./v2-common";
import { fetchLevelConfig } from "../web/lib/solana";

dotenv.config();

const MN_DECIMALS_DEFAULT = 9;

const parseAmount = (value: string | undefined): bigint => {
  if (!value) {
    throw new Error("Set BURN_AMOUNT_TOKENS to the token count you want to burn.");
  }
  if (value.includes(".")) {
    throw new Error("BURN_AMOUNT_TOKENS must be an integer number of tokens.");
  }
  return BigInt(value);
};

const main = async () => {
  const amountTokens = parseAmount(process.env.BURN_AMOUNT_TOKENS);
  const provider = getProvider();
  const wallet = provider.wallet as anchor.Wallet;
  const connection = provider.connection;

  if (!wallet.publicKey) {
    throw new Error("Wallet is not loaded.");
  }

  console.log("Wallet:", wallet.publicKey.toBase58());

  const levelConfig = await fetchLevelConfig(connection);
  console.log("Level config burn vault:", levelConfig.mindBurnVault.toBase58());

  const mintInfo = await getMint(connection, levelConfig.mindMint, "confirmed");
  const decimals = mintInfo.decimals ?? MN_DECIMALS_DEFAULT;
  const amountBase = amountTokens * 10n ** BigInt(decimals);

  if (amountBase > BigInt("18446744073709551615")) {
    throw new Error("Amount exceeds u64 limit");
  }

  const ownerMindAta = await getAssociatedTokenAddress(
    levelConfig.mindMint,
    wallet.publicKey
  );
  const ownerAccount = await getAccount(connection, ownerMindAta, "confirmed", TOKEN_PROGRAM_ID);
  if (ownerAccount.amount < amountBase) {
    throw new Error(
      `Insufficient MIND: have ${ownerAccount.amount} base, need ${amountBase} base (${amountTokens} tokens)`
    );
  }

  const burnAccount = await getAccount(
    connection,
    levelConfig.mindBurnVault,
    "confirmed",
    TOKEN_PROGRAM_ID
  );
  const incineratorProgram = new anchor.web3.PublicKey("1nc1nerator11111111111111111111111111111111");
  if (!burnAccount.owner.equals(incineratorProgram)) {
    throw new Error("Burn vault owner is not the incinerator address.");
  }

  const tx = new Transaction().add(
    createTransferInstruction(
      ownerMindAta,
      levelConfig.mindBurnVault,
      wallet.publicKey,
      amountBase,
      [],
      TOKEN_PROGRAM_ID
    )
  );

  console.log(`Burning ${amountTokens} MIND (${amountBase} base units)...`);
  const signature = await provider.sendAndConfirm(tx, []);
  console.log("Burn tx signature:", signature);
};

main().catch((err) => {
  console.error("Burn script failed:", err);
  process.exit(1);
});
