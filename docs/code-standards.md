# SHINSIGHT — Code Standards & Conventions

## File Naming

**JavaScript/TypeScript:**
- **Components:** `kebab-case.tsx` with descriptive names
  - Examples: `call-card-sealed.tsx`, `unlock-button.tsx`, `countdown-timer.tsx`
- **Utilities & Helpers:** `kebab-case.ts`
  - Examples: `api-client.ts`, `encryption.ts`, `crypto-utils.ts`
- **Type Definitions:** `types.ts` or `-types.ts` suffix
  - Example: `call-types.ts`

**Move/Smart Contracts:**
- **Modules:** `snake_case.move`
  - Examples: `call_registry.move`, `escrow.move`, `oracle_settlement.move`
- **Constants:** `SCREAMING_SNAKE_CASE`
  - Example: `PROTOCOL_FEE_BPS`, `E_CALL_NOT_ACTIVE`

**SQL/Database:**
- **Tables:** `snake_case` lowercase
  - Examples: `calls`, `buyers`, `settlement_log`
- **Columns:** `snake_case` lowercase
  - Examples: `call_id`, `kol_address`, `reveal_timestamp`

## Component Structure (React)

**File Template:**
```typescript
// calls/call-card-sealed.tsx
'use client';  // Mark as client component in Next.js

import { FC, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { AssetBadge } from './asset-badge';

// Type definitions
interface CallCardSealedProps {
  callId: string;
  asset: 'BTC' | 'ETH' | 'SOL' | 'BNB' | 'APT';
  direction: 'UP' | 'DOWN';
  unlockPrice: number;
  revealCountdown: string;
  onUnlock: () => void;
}

// Main component
export const CallCardSealed: FC<CallCardSealedProps> = ({
  callId,
  asset,
  direction,
  unlockPrice,
  revealCountdown,
  onUnlock,
}) => {
  return (
    <div className={cn('rounded-lg border border-gray-200 p-4')}>
      <AssetBadge asset={asset} />
      <p className="text-lg font-semibold">{direction}</p>
      <p className="text-sm text-gray-600">{revealCountdown}</p>
      <button onClick={onUnlock}>
        Unlock {unlockPrice} APT
      </button>
    </div>
  );
};
```

**Best Practices:**
- One component per file
- Export as named export
- Use `FC<Props>` type annotation
- Keep files under 200 lines
- Separate container (logic) from presentational (UI) components
- Use Tailwind + `cn()` for styling (no inline CSS)

## Naming Conventions

**Variables:**
- **camelCase** for all JS variables and functions
  - ✓ `const callData = ...`
  - ✗ `const call_data = ...`

**React State & Hooks:**
- ✓ `const [isLoading, setIsLoading] = useState(false)`
- ✓ `const [callList, setCallList] = useState([])`
- ✗ `const [loading, set_loading] = ...`

**Function Names (Utilities):**
- Use verbs for actions: `encryptCallData()`, `fetchCallById()`, `submitCall()`
- Use adjectives for predicates: `isRevealed()`, `isAuthorized()`, `hasAccess()`
- Use nouns for factories: `createEscrowPool()`, `buildTxnPayload()`

**Constants:**
- **TypeScript:** `camelCase` constants
  - `const maxCallDuration = 30 * 24 * 60 * 60;`
- **Move:** `SCREAMING_SNAKE_CASE` constants
  - `const PROTOCOL_FEE_BPS: u64 = 1000;`

**Type Names:**
- **PascalCase** for all types, interfaces, enums
  - ✓ `interface CallSubmissionPayload`
  - ✓ `type CallStatus = 'sealed' | 'revealed' | 'settled'`
  - ✓ `enum VerdictType { TRUE, FALSE }`

## Code Organization (React App)

**Directory Structure:**

```
src/
├── app/                   # Page routes (Next.js App Router)
├── components/
│   ├── calls/            # Call-specific components
│   ├── filters/          # Filter UI components
│   ├── providers/        # Context providers, state management
│   └── shared/           # Reusable UI components
├── lib/
│   ├── api-client.ts     # Supabase + edge functions
│   ├── wallet.ts         # Aptos wallet integration
│   ├── crypto.ts         # Client-side crypto operations
│   ├── types.ts          # Global TypeScript definitions
│   └── constants.ts      # App-wide constants
└── stubs/                # Mock implementations for testing
```

**Separation of Concerns:**
- **Components:** Only UI logic (JSX, event handlers, styling)
- **Lib:** Business logic, API calls, utilities
- **App:** Routing, layout, page-level composition

## Move Smart Contract Standards

**Module Structure:**
```move
module shinsight::call_registry {
  // 1. Imports (use statements)
  use std::signer;
  use aptos_framework::event;

  // 2. Constants
  const PROTOCOL_FEE_BPS: u64 = 1000;
  const E_CALL_NOT_ACTIVE: u64 = 101;

  // 3. Structs
  struct Call has key { ... }
  struct CallCreatedEvent has drop, store { ... }

  // 4. Public functions
  public entry fun create_call(...) { ... }
  public fun get_call(...): Call { ... }

  // 5. Internal functions
  fun verify_signature(...) { ... }
  fun distribute_fees(...) { ... }
}
```

**Naming in Move:**
- **Functions:** `snake_case` (entry point convention)
  - ✓ `public entry fun create_call()`
  - ✓ `public entry fun settle_call()`
- **Structs:** `PascalCase`
  - ✓ `struct Call`
  - ✓ `struct EscrowPool`
- **Constants:** `SCREAMING_SNAKE_CASE`
  - ✓ `const PROTOCOL_FEE_BPS: u64 = 1000;`
- **Error Codes:** `E_DESCRIPTIVE_NAME`
  - ✓ `const E_CALL_NOT_ACTIVE: u64 = 101;`

**Best Practices:**
- One module per file (semantic grouping)
- Include function visibility (`public entry`, `public`, `friend`, private)
- Document invariants and safety checks with comments
- Use `Option<T>` for nullable fields; avoid `bool` flags for state

## Backend/Edge Functions Standards

**TypeScript in Deno:**
```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // 1. Method check
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    // 2. Input validation
    const { field1, field2 } = await req.json();
    if (!field1 || !field2) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // 3. Business logic
    const result = await processRequest(field1, field2);

    // 4. Response
    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    // 5. Error handling
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

**Patterns:**
- Always validate input with clear error messages
- Return JSON with consistent structure: `{ data?: T, error?: string }`
- Use RLS policies; don't implement auth in function code
- Separate business logic into utility functions (see `_shared/`)

## Database Standards

**SQL Conventions:**

```sql
-- Table names: lowercase, plural
CREATE TABLE calls (
  call_id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  kol_address TEXT NOT NULL,
  content_hash BYTEA NOT NULL,
  reveal_timestamp BIGINT NOT NULL,
  unlock_price BIGINT NOT NULL,
  is_revealed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Column names: snake_case, descriptive
-- Constraints: PK, FK, NOT NULL, DEFAULT explicit
-- Indexes on: foreign keys, query columns (kol_address, reveal_timestamp)

CREATE INDEX idx_calls_kol_address ON calls(kol_address);
CREATE INDEX idx_calls_reveal_timestamp ON calls(reveal_timestamp);
```

**RLS Policy Example:**
```sql
-- Only call creator can read encrypted data
CREATE POLICY call_creator_can_read_encrypted
  ON keys FOR SELECT
  USING (auth.uid()::text = (
    SELECT kol_address FROM calls WHERE calls.call_id = keys.call_id
  ));

-- Buyers can read their decryption key before reveal
CREATE POLICY buyer_can_read_key_before_reveal
  ON keys FOR SELECT
  USING (
    auth.uid()::text IN (
      SELECT buyer_address FROM buyers WHERE buyers.call_id = keys.call_id
    )
    AND reveal_timestamp > NOW()
  );
```

## Error Handling

**TypeScript/React:**
```typescript
// Standardized error handling
interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

async function submitCall(payload: CallPayload): Promise<{ data?: any; error?: ApiError }> {
  try {
    const response = await fetch('/api/submit-call', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const { error } = await response.json();
      return { error };
    }
    const data = await response.json();
    return { data };
  } catch (err) {
    return { error: { code: 'UNKNOWN', message: err.message } };
  }
}
```

**Move:**
```move
// Explicit error codes with constants
const E_INSUFFICIENT_BALANCE: u64 = 201;
const E_CALL_ALREADY_SETTLED: u64 = 202;

fun deposit(pool_ref: &mut EscrowPool, amount: u64) {
  assert!(amount > 0, E_INSUFFICIENT_BALANCE);
  assert!(!pool_ref.is_settled, E_CALL_ALREADY_SETTLED);
  // ...
}
```

## Testing Guidelines

**Unit Tests:**
- Test utilities in isolation (crypto, hashing, parsing)
- Use descriptive test names: `test_encrypt_decrypt_roundtrip()`
- Mock external dependencies (Aptos, Supabase)

**Integration Tests:**
- Test edge function behavior with real DB (transactional rollback)
- Verify RLS policies block unauthorized access
- Test contract settlement logic with oracle data

**E2E Tests (Future):**
- Test full user flow: wallet connection → submit → unlock → settlement
- Use testnet Aptos + staging Supabase
- Run nightly on CI/CD pipeline

## Comments & Documentation

**Self-Documenting Code:**
- Prefer clear names over comments
  - ✓ `const isCallRevealed = callData.revealTimestamp < Date.now();`
  - ✗ `const x = c.t < d.now(); // check if revealed`

**When to Comment:**
- Complex business logic (settlement distribution formula)
- Non-obvious algorithms or security decisions
- Edge cases and assumptions
- Integration points between layers

**Example:**
```typescript
// Settlement distribution (v2 fractional escrow model):
// If TRUE: KOL gets 70% of distributable; buyers share 30%
// If FALSE: KOL gets 30% of distributable; buyers share 70%
// Protocol keeps 10% fee from total escrow pool
function calculateSettlement(verdict: boolean, totalEscrow: u64): { kolAmount: u64, buyerAmount: u64, fee: u64 } {
  // ...
}
```

## Related Documents

- `codebase-summary.md` — Module structure
- `system-architecture.md` — Design patterns
- `deployment-guide.md` — CI/CD and linting rules
