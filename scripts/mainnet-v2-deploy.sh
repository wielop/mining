#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export ANCHOR_PROVIDER_URL="${ANCHOR_PROVIDER_URL:-${RPC_URL:-https://rpc.mainnet.x1.xyz}}"
export ANCHOR_WALLET="${ANCHOR_WALLET:-${WALLET:-$HOME/.config/solana/id.json}}"

echo "ANCHOR_PROVIDER_URL=$ANCHOR_PROVIDER_URL"
echo "ANCHOR_WALLET=$ANCHOR_WALLET"

anchor --version

echo "Building..."
anchor build

echo "Deploying..."
anchor deploy --provider.cluster "$ANCHOR_PROVIDER_URL" --provider.wallet "$ANCHOR_WALLET"

echo "Initializing config + seeding vaults..."
yarn -s ts-node scripts/mainnet-v2-init.ts

echo "Done."
