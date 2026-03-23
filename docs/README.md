# SHINSIGHT Documentation Index

Welcome to the SHINSIGHT project documentation. This directory contains comprehensive guides for understanding, developing, and deploying the cryptographic alpha marketplace.

## Quick Start

**New to SHINSIGHT?** Start here:

1. Read [`project-overview-pdr.md`](./project-overview-pdr.md) (5 min) — Understand the product
2. Read [`system-architecture.md`](./system-architecture.md) (10 min) — Learn the 3-layer design
3. Read [`code-standards.md`](./code-standards.md) (8 min) — Follow naming conventions before coding
4. Read [`deployment-guide.md`](./deployment-guide.md) (10 min) — Deploy to testnet

## Documentation Files

### 1. **project-overview-pdr.md** (84 lines)
High-level product definition and requirements.
- **Audience:** Product managers, stakeholders, new team members
- **Contains:**
  - Product tagline and value proposition
  - Target users and use cases
  - MVP feature list and success metrics
  - Non-functional requirements (security, performance, scalability)
  - Scope constraints (Phase 1: assets, call duration, testnet only)
- **Read when:** Onboarding, planning new features, stakeholder updates

### 2. **system-architecture.md** (247 lines)
3-layer technical architecture and data flow design.
- **Audience:** Architects, senior engineers, integration engineers
- **Contains:**
  - Layer 1: Next.js frontend stack and components
  - Layer 2: Supabase backend, edge functions, encryption
  - Layer 3: Move smart contracts (call_registry, escrow, oracle_settlement)
  - Full lifecycle data flow (commitment → unlock → reveal → settlement)
  - External integrations (Pyth oracle, Aptos RPC)
  - Security model and attack prevention
  - Performance targets and monitoring strategy
- **Read when:** Understanding system design, integration points, debugging across layers

### 3. **codebase-summary.md** (229 lines)
Directory structure and key modules overview.
- **Audience:** Developers, code reviewers, QA engineers
- **Contains:**
  - Repository layout (contract/, supabase/, web/, docs/)
  - Smart contract modules (call_registry, escrow, oracle_settlement)
  - Database schema (calls, buyers, keys, kol_profile, settlement_log)
  - Frontend components (call cards, filters, providers)
  - Supabase edge functions and encryption utilities
  - Dependencies for each layer
  - Build and deployment artifacts
- **Read when:** First-time contributor setup, code review, architecture questions

### 4. **code-standards.md** (354 lines)
Naming conventions, file organization, and best practices.
- **Audience:** All developers
- **Contains:**
  - File naming (kebab-case, snake_case conventions)
  - React component structure and TypeScript patterns
  - Move contract naming and module organization
  - Edge function patterns (validation, error handling, RLS)
  - Database naming and constraints
  - Error handling strategies
  - When and how to comment code
  - Testing guidelines
- **Read when:** Starting work on any file, code review, refactoring

### 5. **deployment-guide.md** (385 lines)
Step-by-step deployment procedures for all layers.
- **Audience:** DevOps engineers, release managers, new developers
- **Contains:**
  - Environment setup and prerequisites
  - Smart contract build and testnet deployment
  - Supabase initialization, migrations, RLS setup
  - Frontend build and Vercel deployment
  - Oracle cron job scheduling
  - Testing and verification steps
  - Monitoring and rollback procedures
  - CI/CD pipeline example
  - Production checklist
- **Read when:** First deploy, deployment troubleshooting, setting up CI/CD

### 6. **project-roadmap.md** (257 lines)
Project phases, timeline, and future direction.
- **Audience:** Project managers, stakeholders, planning discussions
- **Contains:**
  - Phase 1 MVP status (complete ✓)
  - Phase 2 Mainnet launch (Q2 2026)
  - Phase 3 Feature expansion (Q3 2026)
  - Phase 4 Ecosystem integration (Q4 2026)
  - Risk assessment and mitigations
  - Resource allocation per phase
  - KPIs and metrics tracking
  - Technical debt backlog
- **Read when:** Sprint planning, monthly check-ins, long-term strategy

## Navigation by Role

### For **Frontend Developers**
1. `project-overview-pdr.md` — Feature requirements
2. `system-architecture.md` → Layer 1 section
3. `code-standards.md` — React patterns
4. `codebase-summary.md` → `/web` structure
5. `deployment-guide.md` → Frontend section

### For **Smart Contract Developers**
1. `system-architecture.md` → Layer 3 section
2. `code-standards.md` — Move naming conventions
3. `codebase-summary.md` → `/contract` structure
4. `deployment-guide.md` → Contract deployment section

### For **Backend/DevOps Engineers**
1. `system-architecture.md` → Layer 2 section
2. `codebase-summary.md` → `/supabase` structure
3. `code-standards.md` — Edge function patterns
4. `deployment-guide.md` — Full guide

### For **Project Managers**
1. `project-overview-pdr.md` — Product definition
2. `project-roadmap.md` — Phases and timeline
3. `system-architecture.md` → Security model section

### For **New Team Members**
1. `project-overview-pdr.md` (5 min)
2. `system-architecture.md` (10 min)
3. `codebase-summary.md` (8 min)
4. Pick role-specific docs above

## Key Concepts

**Two-Layer Trust Model**
- Layer 2 (Supabase): Holds encrypted call data and decryption keys. Reveals keys at `revealTimestamp`.
- Layer 3 (Aptos): Registers hash of plaintext call on-chain. Executes settlement when oracle submits verdict.
- Neither layer can be gamed without breaking the other.

**Call Lifecycle**
1. **Commitment** — KOL submits structured call (asset, direction, target price, reveal time, unlock price)
2. **Encryption** — Call encrypted with AES-256-GCM; hash registered on-chain
3. **Unlock** — Buyers pay micro-fee to get decryption key
4. **Reveal** — At reveal time, keys published publicly; cards flip to show target price
5. **Settlement** — Oracle fetches Pyth price; verdicts distributed to buyers/KOL via escrow

**Reputation Model**
- KOL track record built from immutable on-chain settlement records
- Accurate calls (verdict=TRUE) increase reputation; false calls decrease
- Non-transferable: tied to wallet address

## Quick Reference

| What? | Where? |
|-------|--------|
| How do I deploy the contract? | `deployment-guide.md` section 2 |
| What's the database schema? | `codebase-summary.md` → "Database Schema" |
| How should I name files? | `code-standards.md` → "File Naming" |
| What's the settlement formula? | `system-architecture.md` → "Layer 3" |
| How do I run the frontend? | `deployment-guide.md` section 4 |
| What are the supported assets? | `project-overview-pdr.md` → "Constraints & Scope" |
| What's Phase 2 roadmap? | `project-roadmap.md` → "Phase 2" |
| How does encryption work? | `system-architecture.md` → "Encryption" |

## External Resources

- **Aptos Documentation:** https://aptos.dev
- **Supabase Documentation:** https://supabase.com/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **Pyth Oracle:** https://pyth.network
- **Move Language:** https://github.com/move-language/move

## Document Maintenance

**When to update:**
- Major features added or changed
- Deployment procedures modified
- Code structure refactored
- New phase starts

**How to update:**
1. Edit relevant `.md` file
2. Verify line count stays reasonable (< 400 lines per doc)
3. Update this README.md if adding new sections
4. Commit with message: `docs: update [document-name] with [change]`

**Last Updated:** March 23, 2026
**Status:** MVP Complete ✓
**Next Review:** June 23, 2026 (post-mainnet launch)
