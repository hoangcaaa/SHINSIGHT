# Phase 4 — Frontend Core

## Overview

- **Priority:** P1
- **Duration:** 5 days (Week 4)
- **Status:** Pending
- **Goal:** Wallet integration, Live Feed screen, Seal Call modal — core buyer+KOL flows

## Context Links

- [Plan Overview](plan.md) | [Phase 3](phase-03-supabase-backend.md)
- [PRD Sections 10-12](../../PRD_SHINSIGHT.md) — buyer experience + UI direction
- [Brainstorm](../reports/brainstorm-260314-2326-shinsight-mvp-architecture.md)

## Key Insights

- Wallet-first auth: no email/password, identity = wallet address
- Live Feed is the landing page — sealed cards grid, countdown timers, unlock buttons
- Seal Call is KOL-only: 3-step modal (form → preview → commit)
- Two data sources: Supabase (call metadata, encrypted content) + Aptos (escrow state, buyer count)
- Real-time: Supabase Realtime subscriptions for new calls + status changes
- Client-side decryption: buyer receives AES key from Edge Function, decrypts blob in browser

## Requirements

### Functional
- Connect wallet (Petra/Martian) — show address in header
- Live Feed: grid of sealed call cards with live countdowns
- Card shows: asset, direction teaser, countdown, buyer count, escrow total, unlock price
- Unlock button: triggers on-chain deposit → fetches decryption key → reveals target price
- Seal Call modal: structured form → preview → on-chain commit
- Responsive layout (desktop-first, mobile-passable)

### Non-Functional
- Dark theme (#0C0B09 background) throughout
- Playfair Display for headings, Courier New for data
- Amber accent (#EF9F27) for interactive elements
- Page load <3s, card interactions <500ms perceived

## Architecture

### Route Structure

```
web/src/app/
├── layout.tsx           # Root: WalletProvider, dark theme, nav header
├── page.tsx             # Live Feed (home)
├── revealed/
│   └── page.tsx         # Phase 5
├── oracles/
│   └── page.tsx         # Phase 5
└── globals.css          # Theme variables
```

### Component Tree

```
web/src/components/
├── layout/
│   ├── site-header.tsx        # Logo, nav, wallet connect button
│   └── nav-links.tsx          # Live Feed | Revealed | Oracles
├── wallet/
│   ├── wallet-provider.tsx    # AptosWalletAdapterProvider wrapper
│   └── connect-button.tsx     # Connect/disconnect + address display
├── calls/
│   ├── call-card-sealed.tsx   # Sealed black box card
│   ├── call-card-grid.tsx     # Responsive grid of cards
│   ├── countdown-timer.tsx    # Live countdown to reveal
│   ├── unlock-button.tsx      # Pay + decrypt flow
│   └── asset-badge.tsx        # BTC/ETH/SOL/BNB/APT icon+label
├── seal-call/
│   ├── seal-call-modal.tsx    # Dialog wrapper (3 steps)
│   ├── seal-call-form.tsx     # Step 1: structured input
│   ├── seal-call-preview.tsx  # Step 2: preview sealed card
│   └── seal-call-commit.tsx   # Step 3: submit to chain
└── ui/                        # shadcn/ui primitives (auto-generated)
```

### Data Layer

```
web/src/lib/
├── supabase-client.ts         # Supabase browser client
├── aptos-client.ts            # Aptos SDK client (devnet)
├── hooks/
│   ├── use-calls.ts           # Fetch + subscribe to calls
│   ├── use-call-escrow.ts     # Read on-chain escrow state
│   └── use-wallet-actions.ts  # Deposit, commit call helpers
├── utils/
│   ├── decrypt-call.ts        # AES-256-GCM client-side decryption
│   ├── format-price.ts        # Price display formatting
│   └── asset-config.ts        # Asset metadata (name, icon, pyth ID)
└── types.ts                   # Call, Buyer, KolStats interfaces
```

## Related Code Files (to create)

All under `web/src/`:
- `app/layout.tsx` — root layout with providers
- `app/page.tsx` — Live Feed page
- `app/globals.css` — theme CSS variables
- `components/layout/site-header.tsx`
- `components/wallet/wallet-provider.tsx`
- `components/wallet/connect-button.tsx`
- `components/calls/call-card-sealed.tsx`
- `components/calls/call-card-grid.tsx`
- `components/calls/countdown-timer.tsx`
- `components/calls/unlock-button.tsx`
- `components/seal-call/seal-call-modal.tsx`
- `components/seal-call/seal-call-form.tsx`
- `components/seal-call/seal-call-preview.tsx`
- `components/seal-call/seal-call-commit.tsx`
- `lib/supabase-client.ts`
- `lib/aptos-client.ts`
- `lib/hooks/use-calls.ts`
- `lib/hooks/use-call-escrow.ts`
- `lib/hooks/use-wallet-actions.ts`
- `lib/utils/decrypt-call.ts`
- `lib/types.ts`

## Implementation Steps

### Day 1: Layout + Wallet

1. **Configure fonts**: add Playfair Display (Google Fonts) + Courier New to `layout.tsx`
2. **Theme CSS variables** in `globals.css`:
   ```css
   :root {
     --background: #0C0B09;
     --foreground: #F5F0E8;
     --accent: #EF9F27;
     --verdict-true: #1D9E75;
     --verdict-false: #E24B4A;
     --verdict-expired: #888780;
     --card-bg: #1A1916;
     --card-border: #2A2825;
   }
   ```
3. **WalletProvider**: wrap app in `AptosWalletAdapterProvider` with Petra + Martian plugins
4. **ConnectButton**: shadcn Button → opens wallet selector → shows truncated address when connected
5. **SiteHeader**: logo left, nav center (Live Feed / Revealed / Oracles), wallet right
6. **Root layout**: dark bg, header, main content area

### Day 2: Data Layer + Types

7. **Types** (`lib/types.ts`):
   ```typescript
   interface Call {
     id: number; callIdOnchain: number; kolAddress: string;
     asset: number; direction: boolean; targetPrice: number | null;
     revealTimestamp: string; unlockPrice: number;
     contentHash: string; status: string; isRevealed: boolean;
     createdAt: string;
   }
   interface EscrowState {
     buyerCount: number; totalDeposited: number; isSettled: boolean;
   }
   ```
8. **Supabase client**: initialize with `NEXT_PUBLIC_SUPABASE_URL` + anon key
9. **Aptos client**: initialize with devnet URL
10. **use-calls hook**: fetch from `public_calls` view + Supabase Realtime subscription
11. **use-call-escrow hook**: read on-chain EscrowPool resource for buyer count + total
12. **Asset config**: name, symbol, icon component for each supported asset

### Day 3: Sealed Card Component

13. **call-card-sealed.tsx** — the core UI element:
    - Header: asset badge + direction arrow (UP green / DOWN red)
    - Body: diagonal hatching overlay (CSS pattern), "SEALED" label where target would be
    - Stats row: buyer count, escrow total (formatted APT), unlock price
    - Footer: countdown timer, commit block number
    - Hover: golden glow border (`box-shadow: 0 0 20px var(--accent)`)
    - Unlock button appears on hover (bottom of card)

14. **countdown-timer.tsx**: `useEffect` with `setInterval(1000)` — displays `Xd Xh Xm Xs`
    - When expired: shows "REVEALING..." in amber pulse animation

15. **call-card-grid.tsx**: responsive CSS grid
    ```
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr))
    ```

### Day 4: Unlock Flow

16. **unlock-button.tsx** — multi-step button state:
    - Default: "Unlock — 0.X APT" (amber outline)
    - Click → wallet popup (deposit tx)
    - Pending: spinner + "Confirming..."
    - Success: call Edge Function `unlock-key` with tx_hash
    - Receive key → call `decrypt-call.ts` → show target price in card
    - Error: show toast with retry

17. **decrypt-call.ts**: browser-side AES-256-GCM decryption
    ```typescript
    export async function decryptCall(
      encryptedBlob: string, key: string, iv: string
    ): Promise<{ targetPrice: number; }>
    ```

18. **use-wallet-actions hook**:
    - `depositForCall(callId)`: build + sign + submit deposit tx
    - Returns tx hash for verification

### Day 5: Seal Call Modal

19. **seal-call-form.tsx** (Step 1):
    - Asset: select dropdown (BTC/ETH/SOL/BNB/APT)
    - Direction: toggle button (UP / DOWN)
    - Target Price: number input (USD)
    - Reveal Timestamp: datetime picker (min +1hr, max +30d)
    - Unlock Price: number input (APT, min 0.1)
    - Validate all fields before enabling "Preview" button

20. **seal-call-preview.tsx** (Step 2):
    - Render a sealed card preview showing what buyers will see
    - Target price shown to KOL but marked "[SEALED — only you can see this]"
    - Confirm button → proceed to commit

21. **seal-call-commit.tsx** (Step 3):
    - Call `submit-call` Edge Function → get content_hash
    - Build `create_call()` tx with content_hash + params
    - Wallet signs + submits to Aptos
    - Show confirmation: call ID, block number, "Your call is live"
    - Close modal, new card appears in Live Feed (via Realtime)

## Todo List

- [ ] Configure dark theme + fonts
- [ ] Implement WalletProvider + ConnectButton
- [ ] Build SiteHeader with navigation
- [ ] Create types + Supabase/Aptos clients
- [ ] Implement use-calls hook with Realtime
- [ ] Implement use-call-escrow hook
- [ ] Build sealed call card component
- [ ] Build countdown timer
- [ ] Build card grid layout
- [ ] Implement unlock flow (deposit → verify → decrypt)
- [ ] Build client-side decryption utility
- [ ] Build Seal Call modal (3 steps)
- [ ] Wire Seal Call to Edge Function + contract
- [ ] Test full flow: seal → display → unlock

## Success Criteria

- Wallet connects and shows address
- Live Feed displays sealed cards from Supabase with live countdowns
- Buyer can unlock a card: deposit tx → key delivery → target price visible
- KOL can seal a call: form → preview → on-chain commit → card appears
- Dark Bloomberg aesthetic with amber accents renders correctly

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Wallet adapter version conflicts | MEDIUM | Pin @aptos-labs/wallet-adapter-react to stable |
| Supabase Realtime connection drops | LOW | Reconnect on visibility change |
| Client-side crypto API availability | LOW | WebCrypto API available in all modern browsers |
| Countdown timer drift | LOW | Sync against server time on mount |

## Security Considerations

- Decryption key only fetched after verified on-chain payment
- Keys never persisted in localStorage — memory only
- Wallet private key never leaves wallet extension
- Content hash verified client-side after decryption (optional integrity check)

## Next Steps

- Proceed to [Phase 5 — Frontend Screens](phase-05-frontend-screens.md)
