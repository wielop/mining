# Mainnet runbook (mining_v2)

## Srodowisko
- RPC: https://rpc.mainnet.x1.xyz
- Program ID: z `target/deploy/mining_v2-keypair.json`
- Wallet deploy/admin: ten sam dla deploy i init
- Upgrade authority: zostaje u admina (bez multisig)

## Tokeny i vaulty
- MIND mint: nowy na mainnet (decimals: 9)
- MIND mint authority: vault PDA
- Burn vault: incinerator
- Treasury vault: ATA admina
- XNT: wSOL (mint `So11111111111111111111111111111111111111112`)

## Konfiguracja (domyslne parametry)
- emission: 10_000 MIND / dzien
- max_effective_hp: 250
- seconds_per_day: 86_400 (24h, do zmiany po deployu przez admin update)
- rig buff cap: 15%

## Przed deployem
1) (Opcjonalnie) jesli chcesz nowy Program ID, wygeneruj nowy keypair:
   `solana-keygen new -o target/deploy/mining_v2-keypair.json`
   - Potem zaktualizuj `Anchor.toml`, `web/lib/solana.ts` i `MAINNET_DATA.md`.
2) Ustaw zmienne srodowiskowe:
   - `RPC_URL=https://rpc.mainnet.x1.xyz`
   - `WALLET=~/.config/solana/id.json`
   - `NEXT_PUBLIC_PROGRAM_ID=<program_id_z_keypair>`
3) Sprawdz `UNSTAKE_BURN_BPS` w `programs/mining_v2/src/lib.rs` (powinno byc 6%).

## Deploy + init
1) Deploy:
   - `yarn mainnet:deploy`
2) Zapisz output adresow do `MAINNET_DATA.md`.
3) Rig buff (wymaga `RIG_BUFF_MIND_PER_HP_PER_DAY`):
   - `ts-node scripts/mainnet-v2-init-rig-buff.ts`
4) (Opcjonalnie) Przelicz network HP:
   - `ts-node scripts/mainnet-v2-recalc-network-hp.ts`
5) (Opcjonalnie) Zmiana `seconds_per_day` po deployu:
   - panel `/admin` → Update config → Seconds per day

## Web (Vercel)
- `NEXT_PUBLIC_RPC_URL=https://rpc.mainnet.x1.xyz`
- `NEXT_PUBLIC_PROGRAM_ID=<program_id_z_keypair>`
- (opcjonalnie) `NEXT_PUBLIC_RPC_PROXY=/api/rpc`

## Post-deploy check
- `V2_SMOKE_BUY=1 V2_SMOKE_CLAIM=1 V2_SMOKE_STAKE=1 yarn mainnet:smoke`
- Zweryfikuj config na chainie oraz dane w `MAINNET_DATA.md`.

## Staking / epoch
- `roll_epoch`: admin-only
- Cron off-chain: uruchamiac `roll_epoch` co 24h
