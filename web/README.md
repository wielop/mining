# mining/web

Public app (Vercel-ready) for interacting with the on-chain program:

- Public panel: `/` (create position, deposit, claim)
- Admin panel: `/admin` (admin_update_config)

## Env vars (Vercel)

- `NEXT_PUBLIC_RPC_URL` (default: `https://rpc.testnet.x1.xyz`)
- `NEXT_PUBLIC_PROGRAM_ID` (default: `2oJ68QPvNqvdegxPczqGYz7bmTyBSW9D6ZYs4w1HSpL9`)

## Local run

```bash
cd web
yarn install
yarn dev
```

## UI redesign notes

- Visual direction: near-black base with cyan/teal glow, thin outlines, and large-number summary cards.
- Unified dashboard with tabs (Mine XNT / Stake MIND / XP) plus a quickstart wizard for first-time users.
- Secondary protocol details moved into `details` accordions to reduce clutter.
- Tailwind additions: custom `night/ink/neon/tide/pulse` colors, glow shadows, and Space Grotesk + JetBrains Mono fonts (see `tailwind.config.ts` and `app/layout.tsx`).
