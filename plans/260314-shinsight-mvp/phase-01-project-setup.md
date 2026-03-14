# Phase 1 — Project Setup

## Overview

- **Priority:** P1
- **Duration:** 2 days (Week 1, Day 1-2)
- **Status:** Pending
- **Goal:** Scaffold all three project layers, install tooling, provision accounts

## Context Links

- [Plan Overview](plan.md)
- [PRD v2.0](../../PRD_SHINSIGHT.md)
- [Brainstorm](../reports/brainstorm-260314-2326-shinsight-mvp-architecture.md)

## Key Insights

- `create-aptos-dapp` scaffolds Move + TS frontend but uses Vite — we want Next.js, so scaffold Move separately
- Pyth dependency added in Move.toml from the start
- Supabase CLI (`supabase init`) creates local dev environment with Edge Functions support
- Wallet adapter requires specific peer deps — pin versions early

## Requirements

### Functional
- Move project compiles with empty modules
- Next.js app runs locally with dark theme base
- Supabase project initialized with local dev mode
- Aptos devnet account funded with test APT

### Non-Functional
- All three layers runnable with single `make dev` or similar
- Git repo initialized with .gitignore covering secrets

## Architecture

```
shinsight/
├── contract/                  # Move smart contract
│   ├── sources/
│   │   ├── escrow.move
│   │   ├── oracle_settlement.move
│   │   └── call_registry.move
│   ├── tests/
│   └── Move.toml
├── web/                       # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   ├── components/
│   │   ├── lib/
│   │   └── styles/
│   ├── tailwind.config.ts
│   ├── next.config.ts
│   └── package.json
├── supabase/                  # Supabase project
│   ├── migrations/
│   ├── functions/
│   │   ├── unlock-key/
│   │   ├── settle-call/
│   │   └── verify-payment/
│   ├── seed.sql
│   └── config.toml
├── Makefile
├── .env.example
└── .gitignore
```

## Related Code Files (to create)

- `contract/Move.toml` — Move project manifest with Pyth dep
- `contract/sources/escrow.move` — empty module stub
- `contract/sources/oracle_settlement.move` — empty module stub
- `contract/sources/call_registry.move` — empty module stub
- `web/` — Next.js scaffold via `npx create-next-app@latest`
- `supabase/` — via `supabase init`
- `.env.example` — template for all env vars
- `Makefile` — dev commands

## Implementation Steps

1. **Install prerequisites**
   ```bash
   # Aptos CLI
   curl -fsSL "https://aptos.dev/scripts/install_cli.py" | python3
   aptos --version

   # Supabase CLI
   brew install supabase/tap/supabase
   supabase --version

   # Node.js 20+ (assume installed)
   node --version
   ```

2. **Initialize Move project**
   ```bash
   mkdir -p contract/sources contract/tests
   ```
   Create `contract/Move.toml`:
   ```toml
   [package]
   name = "shinsight"
   version = "0.0.1"

   [addresses]
   shinsight = "_"
   pyth = "0x7e783b349d3e89cf5931af376ebeadbfab855b3fa239b7ada8f5a92fbea6b387"

   [dependencies]
   AptosFramework = { git = "https://github.com/aptos-labs/aptos-core.git", subdir = "aptos-move/framework/aptos-framework", rev = "main" }
   Pyth = { git = "https://github.com/pyth-network/pyth-crosschain.git", subdir = "target_chains/aptos/contracts", rev = "main" }
   ```

3. **Create Aptos devnet account**
   ```bash
   cd contract
   aptos init --network devnet
   # Saves .aptos/config.yaml with private key + account address
   aptos account fund-with-faucet --account default --amount 100000000
   ```

4. **Create empty Move module stubs** (verify compilation)
   ```move
   // sources/escrow.move
   module shinsight::escrow { }

   // sources/oracle_settlement.move
   module shinsight::oracle_settlement { }

   // sources/call_registry.move
   module shinsight::call_registry { }
   ```
   Run: `aptos move compile`

5. **Scaffold Next.js app**
   ```bash
   npx create-next-app@latest web --typescript --tailwind --eslint --app --src-dir --no-import-alias
   cd web
   npm install @aptos-labs/wallet-adapter-react @aptos-labs/ts-sdk
   npm install @radix-ui/react-dialog @radix-ui/react-slot  # shadcn deps
   npx shadcn@latest init  # select dark theme defaults
   ```

6. **Configure dark theme base colors** in `web/tailwind.config.ts`:
   ```
   background: #0C0B09, accent: #EF9F27, verdict-true: #1D9E75,
   verdict-false: #E24B4A, verdict-expired: #888780
   ```

7. **Initialize Supabase**
   ```bash
   supabase init  # creates supabase/ directory
   supabase start # starts local Postgres + Edge Functions runtime
   ```

8. **Create `.env.example`**
   ```
   # Aptos
   NEXT_PUBLIC_APTOS_NETWORK=devnet
   NEXT_PUBLIC_MODULE_ADDRESS=<contract-address>
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
   SUPABASE_SERVICE_ROLE_KEY=<service-key>
   # Encryption
   MASTER_KEY_SECRET=<32-byte-hex>
   # Pyth
   PYTH_PRICE_SERVICE_URL=https://hermes.pyth.network
   ```

9. **Create Makefile**
   ```makefile
   dev-contract:
   	cd contract && aptos move compile
   dev-web:
   	cd web && npm run dev
   dev-supabase:
   	supabase start
   test-contract:
   	cd contract && aptos move test
   ```

10. **Init git + .gitignore**
    ```
    .env, .aptos/, node_modules/, .next/, supabase/.temp/
    ```

## Todo List

- [ ] Install Aptos CLI, Supabase CLI
- [ ] Create Move project with Pyth dependency
- [ ] Fund devnet account
- [ ] Create empty module stubs, verify compilation
- [ ] Scaffold Next.js with Tailwind + shadcn dark theme
- [ ] Install wallet adapter + Aptos SDK
- [ ] Initialize Supabase local dev
- [ ] Create .env.example, Makefile, .gitignore
- [ ] Verify all three layers start without errors

## Success Criteria

- `aptos move compile` succeeds with 0 errors
- `npm run dev` serves Next.js on localhost:3000 with dark background
- `supabase start` runs local Postgres + Edge Functions
- Devnet account shows funded balance

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Pyth dependency version mismatch | MEDIUM | Pin to specific git rev, not `main` |
| Aptos CLI version incompatibility | LOW | Use latest stable, check changelog |
| Supabase local Docker issues | LOW | Fallback to cloud project for dev |

## Security Considerations

- Never commit `.aptos/config.yaml` (contains private key)
- Never commit `.env` files
- Use `.env.example` as template

## Next Steps

- Proceed to [Phase 2 — Smart Contract](phase-02-smart-contract.md)
