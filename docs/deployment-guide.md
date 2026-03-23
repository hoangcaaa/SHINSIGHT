# SHINSIGHT — Deployment Guide

## Prerequisites

| Component | Requirement |
|-----------|------------|
| Node.js | v18+ |
| Rust + Aptos CLI | Latest stable |
| Supabase CLI | v1.160+ |
| Git | Latest |

## 1. Environment Setup

### 1.1 Clone & Install Dependencies

```bash
cd /Users/baobao/WORKSPACE/01_ACTION/SHINSIGHT

# Install frontend dependencies
cd web
npm install

# Install contract dependencies (via Move.toml)
cd ../contract
aptos move build
```

### 1.2 Configure Environment Variables

**Root `.env`:**
```bash
cp .env.example .env

# Edit .env:
# APTOS_PRIVATE_KEY=0x...       # Testnet account private key
# SUPABASE_URL=https://...      # Supabase project URL
# SUPABASE_ANON_KEY=...         # Supabase public key
# PYTH_FEED_ADDRESS=0x...       # Pyth oracle address on Aptos testnet
```

**Frontend `.env.local` (web/):**
```bash
NEXT_PUBLIC_APTOS_NETWORK=testnet
NEXT_PUBLIC_SUPABASE_URL=https://[project].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[anon-key]
```

## 2. Smart Contract Deployment

### 2.1 Build Contract

```bash
cd /Users/baobao/WORKSPACE/01_ACTION/SHINSIGHT/contract

# Compile Move modules
aptos move build

# Expected output:
# Building dependency AptosFramework with dependency graph 0
# ...
# Compiling and generating bytecode for package shinsight
# BUILD SUCCESS
```

### 2.2 Deploy to Testnet

```bash
aptos move publish \
  --profile default \
  --assume-yes

# Output includes:
# Transaction: 0x...
# Package ID: 0x...
```

**Store the Package ID:**
```bash
# Add to .env:
APTOS_PACKAGE_ID=0x[published-package-id]
```

### 2.3 Initialize Oracle Account

```bash
# Fund oracle account with testnet APT (faucet):
aptos account fund-with-faucet \
  --account [oracle-address] \
  --amount 100000000

# Call oracle_settlement::authorize_oracle:
aptos move run \
  --function-id 0x[PACKAGE_ID]::oracle_settlement::authorize_oracle \
  --args address:[oracle-address] \
  --assume-yes
```

## 3. Supabase Backend Deployment

### 3.1 Initialize Supabase Project

```bash
cd /Users/baobao/WORKSPACE/01_ACTION/SHINSIGHT/supabase

# Create or link to existing project:
supabase link --project-ref [project-ref]

# Or create new:
supabase projects create --name shinsight
```

### 3.2 Apply Database Migrations

```bash
# Deploy migrations and seed data:
supabase db push

# Verify tables created:
supabase db list
# Output: calls, buyers, keys, kol_profile, settlement_log
```

### 3.3 Deploy Edge Functions

```bash
# Deploy all edge functions:
supabase functions deploy

# Or deploy individual functions:
supabase functions deploy submit-call
supabase functions deploy unlock-key
supabase functions deploy settle-call
supabase functions deploy link-call-onchain

# Verify deployment:
supabase functions list
```

### 3.4 Set Edge Function Secrets

```bash
supabase secrets set APTOS_PACKAGE_ID="0x[published-package-id]"
supabase secrets set APTOS_ORACLE_ADDRESS="0x[oracle-address]"
supabase secrets set ENCRYPTION_KEY="[base64-encoded-256-bit-key]"
```

### 3.5 Enable RLS & Policies

All RLS policies are defined in `seed.sql`. Verify they're active:

```bash
# Connect to DB and check:
supabase db pull  # Sync remote schema locally
```

## 4. Frontend Deployment

### 4.1 Build Production

```bash
cd /Users/baobao/WORKSPACE/01_ACTION/SHINSIGHT/web

# Build:
npm run build

# Expected output:
# ✓ Compiled successfully
# Creating an optimized production build...
```

### 4.2 Deploy to Vercel

```bash
# Install Vercel CLI:
npm i -g vercel

# Deploy (from web/ directory):
vercel deploy --prod

# Environment variables are auto-synced from .env.local
```

**Or deploy manually:**

```bash
# Create .next artifact and deploy to any Node.js host:
npm run build
npm run start  # Test locally
# Copy .next/ and public/ to your hosting
```

## 5. Oracle Cron Job Setup

### 5.1 Deploy Settlement Cron

**Supabase Scheduled Jobs:**

```bash
# Create a database function that settle-call edge function calls:
supabase functions deploy settle-call --region us-east-1
```

**Schedule via external cron (example: Vercel Cron, AWS EventBridge):**

```bash
# Trigger settle-call every 5 minutes:
0 */5 * * * curl -X POST https://[project].supabase.co/functions/v1/settle-call \
  -H "Authorization: Bearer [SUPABASE_SERVICE_ROLE_KEY]" \
  -d '{}'
```

### 5.2 Verify Oracle Feed Integration

```bash
# Test settlement locally:
npm run dev  # From web/

# In another terminal, call settle-call:
curl -X POST http://localhost:54321/functions/v1/settle-call \
  -H "Authorization: Bearer [SUPABASE_KEY]" \
  -d '{"call_id": 1}'
```

## 6. Testing Deployments

### 6.1 Contract Testing

```bash
cd contract

# Run contract unit tests:
aptos move test

# Test specific function:
aptos move test call_registry::tests::test_create_call
```

### 6.2 Edge Function Testing

```bash
# Start local Supabase (includes edge functions):
supabase start

# Test edge function locally:
curl -X POST http://localhost:54321/functions/v1/submit-call \
  -H "Content-Type: application/json" \
  -d '{"asset":"ETH","direction":"UP","target_price":2500,...}'
```

### 6.3 Frontend Testing

```bash
cd web

# Run linter:
npm run lint

# Manual smoke test:
npm run dev
# Visit http://localhost:3000
# Test wallet connection, submit call form
```

## 7. Monitoring & Health Checks

### 7.1 Contract Events

```bash
# Monitor for settlement events:
aptos event get-events \
  --event-key 0x[PACKAGE_ID]::call_registry::SettledEvent
```

### 7.2 Edge Function Logs

```bash
# View logs in real-time:
supabase functions list-logs submit-call

# Or via Supabase dashboard: Functions → Logs tab
```

### 7.3 Database Replication Health

```bash
# Check DB status:
supabase db pull --dry-run

# Monitor RLS policies:
SELECT * FROM pg_policies WHERE tablename = 'calls';
```

## 8. Rollback Plan

### Contract Rollback

If contract deployment fails:
```bash
# Redeploy with fixed code:
aptos move publish --profile default --assume-yes

# New package ID issued; update .env and redeploy edge functions
```

### Supabase Rollback

```bash
# Revert migrations:
supabase db reset  # WARNING: deletes all data on testnet

# Or restore from backup via Supabase dashboard
```

### Frontend Rollback

```bash
# Revert to previous commit:
git revert [commit-hash]
npm run build
vercel deploy --prod
```

## 9. Production Checklist

- [ ] Contract deployed to Aptos testnet
- [ ] Oracle account authorized and funded
- [ ] All Supabase edge functions deployed and tested
- [ ] Database migrations applied; RLS policies active
- [ ] Frontend built and deployed to Vercel
- [ ] Environment variables set in all layers
- [ ] Cron job scheduled and tested for settlement
- [ ] Monitoring alerts configured (email, Telegram)
- [ ] Backup strategy documented (Supabase auto-backups)
- [ ] Load testing completed (1,000+ concurrent users)

## 10. CI/CD Pipeline (GitHub Actions)

**Example workflow (`.github/workflows/deploy.yml`):**

```yaml
name: Deploy SHINSIGHT

on:
  push:
    branches: [main]

jobs:
  test-contract:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: aptos-labs/setup-aptos-cli@v0
      - run: cd contract && aptos move test

  deploy-contract:
    needs: test-contract
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - run: aptos move publish --profile default --assume-yes

  deploy-frontend:
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - uses: vercel/action@master
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

## Quick Reference

| Task | Command |
|------|---------|
| Build contract | `cd contract && aptos move build` |
| Deploy contract | `aptos move publish --assume-yes` |
| Start Supabase local | `supabase start` |
| Deploy edge functions | `supabase functions deploy` |
| Build frontend | `npm run build` (from web/) |
| Start dev frontend | `npm run dev` (from web/) |
| View contract events | `aptos event get-events --event-key 0x...` |
| View edge logs | `supabase functions list-logs [function-name]` |
