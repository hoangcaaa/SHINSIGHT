# SHINSIGHT — Codebase Summary

## Repository Structure

```
/Users/baobao/WORKSPACE/01_ACTION/SHINSIGHT/
├── contract/              # Move smart contract (Aptos)
├── supabase/              # Backend: Edge Functions + Migrations
├── web/                   # Frontend: Next.js 16
├── docs/                  # Project documentation
├── plans/                 # Development roadmap & phases
├── .claude/               # Claude AI configuration
├── PRD_SHINSIGHT.md       # Product Requirements Document
└── Makefile               # Build & deployment commands
```

## Layer 1: Smart Contract (`/contract`)

**Framework:** Move 2025 on Aptos testnet

### Directory: `contract/sources/`

| Module | Lines | Purpose |
|--------|-------|---------|
| `call_registry.move` | 200~ | Call creation, hash registration, reveal logic |
| `escrow.move` | 250~ | Buyer deposits, settlement distribution |
| `oracle_settlement.move` | 150~ | Oracle authorization, verdict execution |

### Key Structures

**call_registry.move**
```move
struct Call {
  call_id: u64,
  kol: address,
  content_hash: vector<u8>,
  reveal_timestamp: u64,
  unlock_price: u64,
  is_revealed: bool,
  verdict: Option<bool>,
}
```

**escrow.move**
```move
struct EscrowPool {
  call_id: u64,
  coins: Coin<AptosCoin>,
  buyers: vector<BuyerDeposit>,
  total_deposited: u64,
  is_settled: bool,
}
```

**Dependencies:**
- AptosFramework (official Aptos framework)
- Pyth (oracle price feeds)
- Wormhole (cross-chain messaging, future use)

## Layer 2: Backend (`/supabase`)

**Framework:** Supabase with Deno Edge Functions + PostgreSQL

### Directory: `supabase/functions/`

| Function | Deno? | Purpose |
|----------|-------|---------|
| `submit-call/index.ts` | ✓ | KOL call submission, encryption, hash |
| `unlock-key/index.ts` | ✓ | Buyer unlock, key serving |
| `settle-call/index.ts` | ✓ | Oracle settlement, verdict execution |
| `link-call-onchain/index.ts` | ✓ | Monitor Aptos TXN confirmation |
| `_shared/encryption.ts` | ✓ | AES-256-GCM, SHA256 utilities |

### Database Schema (`seed.sql`)

**Tables:**
- `calls` — Call metadata (asset, direction, reveal_timestamp, unlock_price, content_hash)
- `buyers` — Purchase records (buyer_addr, call_id, unlock_timestamp)
- `keys` — Encrypted call data + decryption keys
- `kol_profile` — KOL reputation (total_calls, accurate, false, reputation_score)
- `settlement_log` — Oracle verdicts + distribution breakdown

**RLS Policies:**
- `calls`: Creator can read encrypted_data; all can read metadata after reveal
- `keys`: Only purchaser can read before reveal; public after reveal_timestamp
- `kol_profile`: All can read (public reputation)
- `settlement_log`: All can read (audit trail)

### Encryption (`_shared/encryption.ts`)

```typescript
// AES-256-GCM symmetric encryption
async function encryptCallData(plaintext: string): {
  ciphertext: string,    // base64
  key: string,          // base64 (256 bits)
  iv: string            // base64 (96 bits)
}

// SHA256 hashing for content commitment
async function sha256Hash(data: string): string  // hex
```

## Layer 3: Frontend (`/web`)

**Framework:** Next.js 16 App Router, React 19, Tailwind CSS 4

### Directory: `web/src/`

```
src/
├── app/                       # Next.js App Router
│   ├── page.tsx              # Live feed (sealed + revealed)
│   ├── layout.tsx            # Root layout, providers
│   ├── oracles/              # KOL leaderboard
│   └── revealed/             # Call archive
├── components/               # React UI components
│   ├── calls/                # Call card variants
│   │   ├── call-card-sealed.tsx       # Sealed view (before purchase)
│   │   ├── call-card-revealed.tsx     # Verdict view
│   │   ├── call-card-flip.tsx         # Animation flip logic
│   │   ├── unlock-button.tsx          # Payment trigger
│   │   ├── countdown-timer.tsx        # Reveal countdown
│   │   ├── verdict-stripe.tsx         # Settlement display
│   │   └── settlement-breakdown.tsx   # Distribution breakdown
│   ├── filters/              # Feed filtering UI
│   │   ├── asset-filter.tsx
│   │   └── verdict-filter.tsx
│   └── providers/            # Context + state (wallet, auth)
├── lib/                      # Utilities & services
│   ├── wallet.ts            # Aptos wallet integration
│   ├── api-client.ts        # Supabase + edge function calls
│   ├── crypto.ts            # Client-side AES decryption
│   ├── types.ts             # TypeScript interfaces
│   └── constants.ts         # Network, address constants
└── stubs/                    # Stub implementations (for testing)
```

### Key Dependencies

```json
{
  "dependencies": {
    "@aptos-labs/ts-sdk": "^5.2.1",
    "@aptos-labs/wallet-adapter-react": "^8.3.1",
    "@supabase/supabase-js": "^2.99.1",
    "@telegram-apps/bridge": "^2.11.0",
    "react": "19.2.3",
    "next": "16.1.6",
    "lucide-react": "^0.577.0",
    "tailwindcss": "^4"
  }
}
```

### Build Commands

```bash
npm run dev      # Start dev server (localhost:3000)
npm run build    # Production build
npm run start    # Run production server
npm run lint     # ESLint check
```

## Configuration Files

| File | Purpose |
|------|---------|
| `.env.example` | Required env vars (network, addresses, keys) |
| `contract/Move.toml` | Contract dependencies + addresses |
| `web/next.config.js` | Next.js config (aliases, output) |
| `web/tsconfig.json` | TypeScript config |
| `tailwind.config.js` | Tailwind CSS settings |
| `.eslintrc.json` | Linting rules |

## Key Dependencies Summary

| Layer | Dependencies | Version |
|-------|--------------|---------|
| **Contract** | AptosFramework | 6f83bc6d |
| **Backend** | Supabase, Deno | 2.99.1, 1.x |
| **Frontend** | React, Next.js, TailwindCSS | 19, 16, 4 |

## File Organization Standards

**Naming Convention:**
- **Kebab-case** for files: `call-card-sealed.tsx`, `unlock-button.tsx`
- **PascalCase** for React components: `function CallCardSealed()`
- **camelCase** for utilities: `encryptCallData()`, `sha256Hash()`

**Component Structure:**
- One component per file (unless it's a small utility)
- Export as named export: `export function ComponentName()`
- Keep files under 200 lines for maintainability
- Inline styles use Tailwind classes

**Module Boundaries:**
- `/components` — UI components (no API calls)
- `/lib` — Business logic, API clients, utilities
- `/app` — Pages and routing (Next.js App Router)
- `/_shared` (Supabase) — Shared utilities across edge functions

## Build & Deployment Artifacts

**Contract:**
- Compiled to `/contract/build/` (Move bytecode)
- Deployment address stored in `.env`

**Supabase:**
- Edge functions deployed via `supabase functions deploy`
- Migrations applied via `supabase db push`

**Frontend:**
- Built to `.next/` (Next.js standard)
- Static export for Vercel deployment
- Environment variables injected at build time

## Testing Strategy

- Unit tests for crypto utilities (`_shared/encryption.ts`)
- Integration tests for edge functions
- E2E tests for frontend flows (Playwright, future)
- Contract tests via Aptos CLI (future)

## Documentation Links

- `project-overview-pdr.md` — Product definition
- `system-architecture.md` — 3-layer design deep dive
- `code-standards.md` — Naming, patterns, best practices
- `deployment-guide.md` — Setup and deployment
