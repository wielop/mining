# mining/web

Public app (Vercel-ready) for interacting with the on-chain program:

- Public panel: `/` (create position, deposit, heartbeat, claim)
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
