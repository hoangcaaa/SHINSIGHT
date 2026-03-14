-- SHINSIGHT MVP Schema
-- calls, buyers, kol_stats, settlement_log

-- calls: core call metadata (mirrors on-chain + encrypted content)
CREATE TABLE calls (
  id BIGSERIAL PRIMARY KEY,
  call_id_onchain BIGINT UNIQUE,
  kol_address TEXT NOT NULL,
  asset SMALLINT NOT NULL CHECK (asset BETWEEN 0 AND 4),
  direction BOOLEAN NOT NULL,
  target_price BIGINT NOT NULL,
  reveal_timestamp TIMESTAMPTZ NOT NULL,
  unlock_price BIGINT NOT NULL,
  content_hash TEXT NOT NULL,
  encrypted_blob TEXT NOT NULL,
  decryption_key TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active','settled_true','settled_false','expired')),
  is_revealed BOOLEAN DEFAULT FALSE,
  settlement_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- buyers: tracks who unlocked which call
CREATE TABLE buyers (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT REFERENCES calls(id),
  buyer_address TEXT NOT NULL,
  deposit_tx_hash TEXT NOT NULL,
  key_delivered BOOLEAN DEFAULT FALSE,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(call_id, buyer_address)
);

-- kol_stats: accuracy tracking
CREATE TABLE kol_stats (
  kol_address TEXT PRIMARY KEY,
  total_calls INT DEFAULT 0,
  true_calls INT DEFAULT 0,
  false_calls INT DEFAULT 0,
  expired_calls INT DEFAULT 0,
  total_escrow_earned BIGINT DEFAULT 0,
  current_streak INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- settlement_log: immutable audit trail
CREATE TABLE settlement_log (
  id BIGSERIAL PRIMARY KEY,
  call_id BIGINT REFERENCES calls(id),
  verdict TEXT NOT NULL,
  oracle_price BIGINT,
  target_price BIGINT,
  total_escrow BIGINT,
  kol_payout BIGINT,
  buyer_refund_per BIGINT,
  protocol_fee BIGINT,
  tx_hash TEXT,
  settled_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_reveal ON calls(reveal_timestamp) WHERE status = 'active';
CREATE INDEX idx_calls_kol ON calls(kol_address);
CREATE INDEX idx_buyers_call ON buyers(call_id);
CREATE INDEX idx_buyers_address ON buyers(buyer_address);

-- RLS
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE kol_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_log ENABLE ROW LEVEL SECURITY;

-- Public read for calls (anon)
CREATE POLICY "anon_read_calls" ON calls FOR SELECT TO anon USING (true);
-- Public read for kol_stats
CREATE POLICY "anon_read_kol_stats" ON kol_stats FOR SELECT TO anon USING (true);
-- Public read for settlement_log
CREATE POLICY "anon_read_settlement_log" ON settlement_log FOR SELECT TO anon USING (true);
-- Buyers can read their own records
CREATE POLICY "anon_read_buyers" ON buyers FOR SELECT TO anon USING (true);

-- Service role full access (for edge functions)
CREATE POLICY "service_all_calls" ON calls FOR ALL TO service_role USING (true);
CREATE POLICY "service_all_buyers" ON buyers FOR ALL TO service_role USING (true);
CREATE POLICY "service_all_kol_stats" ON kol_stats FOR ALL TO service_role USING (true);
CREATE POLICY "service_all_settlement_log" ON settlement_log FOR ALL TO service_role USING (true);

-- Public view: hides sensitive columns
CREATE VIEW public_calls AS
  SELECT id, call_id_onchain, kol_address, asset, direction,
         reveal_timestamp, unlock_price, content_hash, status,
         is_revealed, created_at, settlement_tx_hash,
         CASE WHEN is_revealed THEN target_price ELSE NULL END as target_price
  FROM calls;
