# SHINSIGHT — Project Status

> Updated: March 26, 2026

## Verified on Aptos Testnet (Real APT)

| Test | Verdict | TX |
|------|---------|-----|
| Create call (BTC UP $88K) | ✅ | `0xf78cac...` |
| Buyer deposits 0.1 APT | ✅ Funds locked | `0x8ea913...` |
| Settlement (BTC $70,643 < $88K) | ✅ FALSE | `0xe2c354...` |
| Escrow split | ✅ KOL +0.027, Buyer +0.063, Protocol +0.01 | Verified |

## Architecture

```
Frontend (Next.js) → Supabase Edge Functions → Settlement Service (Node.js)
                          ↓                            ↓
                     Postgres DB              Aptos Testnet (Move)
                          ↓                            ↓
                     pg_cron (1min)           Pyth Hermes (prices)
```

## Component Status

| Component | Status | Notes |
|-----------|--------|-------|
| Move contract (3 modules) | ✅ Deployed | create_call, deposit, settle_with_price, expire |
| Settlement service | ✅ Working | @aptos-labs/ts-sdk, BCS-signed, DB sync |
| Supabase schema + RLS | ✅ Deployed | Keys protected, anon blocked from base table |
| 4 Edge Functions | ✅ Deployed | submit-call, unlock-key, settle-call, link-call-onchain |
| pg_cron auto-trigger | ✅ Configured | Calls settle-call every 60s |
| DB sync after settlement | ✅ Wired | Settlement service updates status, logs, KOL stats |
| Frontend | ✅ Building | Next.js 16, wallet connect, all pages |
| Dockerfile + fly.toml | ✅ Ready | Fly.io deployment config |
| Fake seed data | ✅ Purged | Only real on-chain calls in DB |

## What Needs Deployment

| Item | Action |
|------|--------|
| Settlement service | `fly deploy` (needs Fly.io account + secrets) |
| Supabase secrets | Set `SETTLEMENT_SERVICE_URL` to deployed URL |
| Frontend | Deploy to Vercel (standard Next.js) |

## Key Addresses

| Name | Value |
|------|-------|
| Contract | `0xf526cbc526a400390a5e180730fe516e12ccb724e59c70217bca81c3ea4598e9` |
| Buyer test wallet | `0x9db30d84fe7b3768c198b46dbdc50edb4d6c6c95f36820fa4185c54f9a7482d0` |
| Pyth (testnet) | `0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387` |
| Supabase | `zutqtdkarfnkokmmvsqr` |

## Known Limitations (Testnet)

- `MIN_REVEAL_GAP = 180s` (3 min) — production should be 3600s
- `settle_with_price` used instead of on-chain Pyth (not initialized on testnet)
- Settlement service must be publicly reachable for Edge Function → service calls
