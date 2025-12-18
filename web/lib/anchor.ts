import * as anchor from "@coral-xyz/anchor";
import type { Connection } from "@solana/web3.js";
import idl from "@/idl/pocm_vault_mining.json";
import { PROGRAM_ID } from "@/lib/solana";

// The IDL JSON in this repo does not include account sizes/types in `accounts`,
// which breaks Anchor's `program.account.*` helpers. We only use `.methods`.
const idlForClient = {
  ...idl,
  accounts: [],
};

export function getProgram(connection: Connection) {
  const provider = new anchor.AnchorProvider(
    connection,
    // The wallet is injected by wallet-adapter at runtime via `anchor.setProvider`
    // in the calling context. We provide a dummy here; Anchor will still use the
    // wallet from `anchor.getProvider()` for `.rpc()` calls.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (anchor.getProvider() as any)?.wallet ?? ({} as any),
    { commitment: "confirmed" }
  );
  anchor.setProvider(provider);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new (anchor as any).Program(idlForClient, PROGRAM_ID, provider);
}

