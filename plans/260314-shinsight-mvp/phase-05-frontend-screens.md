# Phase 5 — Frontend Screens

## Overview

- **Priority:** P2
- **Duration:** 5 days (Week 5)
- **Status:** Pending
- **Goal:** Revealed archive screen, Oracles leaderboard, sealed card animations, polish

## Context Links

- [Plan Overview](plan.md) | [Phase 4](phase-04-frontend-core.md)
- [PRD Section 12](../../PRD_SHINSIGHT.md) — UI direction

## Key Insights

- Revealed screen = post-reveal archive. All data public. Verdict stripe dominates card
- Oracles screen = KOL leaderboard. Accuracy %, total calls, streak. No tier badges in MVP
- Card flip animation: sealed → revealed transition when status changes (CSS 3D transform)
- Diagonal hatching texture is the sealed card's signature visual — fades on reveal
- All data already available from Phase 4 hooks — this phase is primarily UI

## Requirements

### Functional
- Revealed screen: filterable archive of settled calls with full data + verdict
- Oracles screen: ranked KOL list with accuracy stats from Supabase
- Card reveal animation: smooth transition from sealed → open state
- Verdict stripe: green (TRUE), red (FALSE), gray (EXPIRED) — top of revealed card
- Settlement breakdown visible on revealed cards

### Non-Functional
- Animations performant (CSS transforms, not JS-driven layout shifts)
- Screens load <2s with skeleton placeholders
- Mobile-responsive grid

## Architecture

### Route Structure (additions)

```
web/src/app/
├── revealed/
│   └── page.tsx              # Revealed archive
└── oracles/
    └── page.tsx              # KOL leaderboard
```

### Component Tree (additions)

```
web/src/components/
├── calls/
│   ├── call-card-revealed.tsx    # Post-reveal card with verdict
│   ├── verdict-stripe.tsx        # Color stripe: TRUE/FALSE/EXPIRED
│   ├── settlement-breakdown.tsx  # KOL payout, buyer refund, protocol fee
│   └── call-card-flip.tsx        # Animated flip wrapper (sealed ↔ revealed)
├── oracles/
│   ├── oracle-table.tsx          # Ranked KOL list
│   ├── oracle-row.tsx            # Single KOL row with stats
│   ├── accuracy-ring.tsx         # Circular progress indicator
│   └── streak-badge.tsx          # Win/loss streak display
├── filters/
│   ├── asset-filter.tsx          # Filter by asset
│   ├── verdict-filter.tsx        # Filter by TRUE/FALSE/EXPIRED
│   └── sort-select.tsx           # Sort by date, accuracy, escrow
└── shared/
    ├── skeleton-card.tsx         # Loading placeholder
    └── empty-state.tsx           # "No calls yet" placeholder
```

### Data Layer (additions)

```
web/src/lib/hooks/
├── use-revealed-calls.ts     # Fetch settled calls with filters
└── use-kol-stats.ts          # Fetch kol_stats ranked by accuracy
```

## Related Code Files (to create)

- `web/src/app/revealed/page.tsx`
- `web/src/app/oracles/page.tsx`
- `web/src/components/calls/call-card-revealed.tsx`
- `web/src/components/calls/verdict-stripe.tsx`
- `web/src/components/calls/settlement-breakdown.tsx`
- `web/src/components/calls/call-card-flip.tsx`
- `web/src/components/oracles/oracle-table.tsx`
- `web/src/components/oracles/oracle-row.tsx`
- `web/src/components/oracles/accuracy-ring.tsx`
- `web/src/components/oracles/streak-badge.tsx`
- `web/src/components/filters/asset-filter.tsx`
- `web/src/components/filters/verdict-filter.tsx`
- `web/src/components/shared/skeleton-card.tsx`
- `web/src/lib/hooks/use-revealed-calls.ts`
- `web/src/lib/hooks/use-kol-stats.ts`

## Implementation Steps

### Day 1: Revealed Card + Verdict

1. **verdict-stripe.tsx**: full-width bar at card top
   ```
   TRUE  → bg-[#1D9E75], text "TRUE — Call Verified"
   FALSE → bg-[#E24B4A], text "FALSE — Call Missed"
   EXPIRED → bg-[#888780], text "EXPIRED — No Verdict"
   ```

2. **settlement-breakdown.tsx**: compact data display
   ```
   Total Escrow:  107.0 APT
   Protocol Fee:   10.7 APT (10%)
   KOL Payout:     96.3 APT (100% distributable)  ← TRUE example
   Buyer Refund:    0.0 APT
   ```

3. **call-card-revealed.tsx**: full-data card
   - Verdict stripe at top
   - Asset + direction + target price (now visible)
   - Actual price at settlement (from settlement_log)
   - Settlement breakdown
   - KOL address (truncated) + commit block
   - Reveal timestamp (formatted)

### Day 2: Revealed Screen + Filters

4. **use-revealed-calls.ts**: query `public_calls` WHERE `status != 'active'`
   - Support filters: asset, verdict, sort (newest first default)
   - Pagination: load 20, infinite scroll or "Load More"

5. **Filters row**: asset pills (ALL / BTC / ETH / SOL / BNB / APT) + verdict pills (ALL / TRUE / FALSE / EXPIRED)

6. **revealed/page.tsx**: filter bar + card grid of revealed cards
   - Join with `settlement_log` for oracle price + payout data
   - Skeleton loading state

### Day 3: Oracles Leaderboard

7. **use-kol-stats.ts**: query `kol_stats` ordered by accuracy desc
   ```typescript
   // accuracy = true_calls / total_calls * 100
   // Handle 0 total_calls edge case
   ```

8. **accuracy-ring.tsx**: SVG circular progress
   - Stroke color interpolates: red (<50%) → amber (50-75%) → green (>75%)
   - Center text: "72%" in Courier New
   - Size: 48px diameter

9. **streak-badge.tsx**: show current streak
   - Positive: green "W3" (3 wins)
   - Negative: red "L2" (2 losses)
   - Zero: gray dash

10. **oracle-row.tsx**: table row
    ```
    [AccuracyRing] [Address] [Total Calls] [W/L/E] [Streak] [Total Earned]
    ```

11. **oracle-table.tsx**: responsive table with sticky header
    - Desktop: full table
    - Mobile: card-based layout (stack columns)

12. **oracles/page.tsx**: header "Oracles" + table + empty state

### Day 4: Sealed Card Animations

13. **Diagonal hatching CSS** for sealed cards:
    ```css
    .sealed-overlay {
      background: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 4px,
        rgba(239,159,39,0.08) 4px,
        rgba(239,159,39,0.08) 5px
      );
    }
    ```

14. **Golden glow hover** on sealed cards:
    ```css
    .card-sealed:hover {
      box-shadow: 0 0 24px rgba(239,159,39,0.3);
      border-color: var(--accent);
      transition: all 0.3s ease;
    }
    ```

15. **call-card-flip.tsx**: 3D flip animation wrapper
    ```css
    .card-flip {
      perspective: 1000px;
    }
    .card-inner {
      transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
      transform-style: preserve-3d;
    }
    .card-inner.revealed {
      transform: rotateY(180deg);
    }
    ```
    - Front face: sealed card (hatching)
    - Back face: revealed card (verdict stripe)
    - Trigger: when call status changes from active → settled (via Realtime)

16. **Countdown expiry animation**: when timer hits 0:
    - Text changes to "REVEALING..."
    - Amber pulse animation on border
    - Auto-flip after 2s delay (gives time for settlement)

### Day 5: Polish + Skeleton States

17. **skeleton-card.tsx**: shimmer loading placeholder matching card dimensions

18. **empty-state.tsx**: "No calls yet" with subtle illustration or icon
    - Live Feed: "No sealed calls right now. Be the first to seal one."
    - Revealed: "No settled calls yet."
    - Oracles: "No KOLs have submitted calls yet."

19. **Responsive polish**:
    - Test at 1440px, 1024px, 768px, 375px
    - Card grid: 3 cols → 2 cols → 1 col
    - Oracle table: table → stacked cards on mobile
    - Header: collapse nav to hamburger on mobile

20. **Loading states**: add skeleton to all pages during data fetch

21. **Error states**: toast notifications for failed transactions, network errors

## Todo List

- [ ] Build verdict-stripe component
- [ ] Build settlement-breakdown component
- [ ] Build call-card-revealed component
- [ ] Build Revealed page with filters
- [ ] Build accuracy-ring SVG component
- [ ] Build streak-badge component
- [ ] Build oracle-table + oracle-row
- [ ] Build Oracles leaderboard page
- [ ] Implement diagonal hatching CSS for sealed cards
- [ ] Implement golden glow hover effect
- [ ] Build card flip animation (sealed → revealed)
- [ ] Add countdown expiry animation
- [ ] Create skeleton loading placeholders
- [ ] Create empty state components
- [ ] Responsive testing + fixes

## Success Criteria

- Revealed page shows settled calls with correct verdict colors + settlement data
- Oracles page ranks KOLs by accuracy with ring visualization
- Sealed cards have hatching texture + golden glow on hover
- Card flip animation triggers smoothly on settlement
- All screens render correctly at desktop + mobile widths
- Loading + empty states present throughout

## Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| CSS 3D transforms janky on low-end | LOW | Fallback to opacity fade if needed |
| Settlement data not joined properly | MEDIUM | Test with seed data covering all verdicts |
| SVG accuracy ring rendering issues | LOW | Simple implementation, well-documented pattern |

## Security Considerations

- Revealed cards only show target_price when `is_revealed = true` (enforced by view)
- No sensitive data on Revealed/Oracles screens — all public post-reveal

## Next Steps

- Proceed to [Phase 6 — Integration & Testing](phase-06-integration-testing.md)
