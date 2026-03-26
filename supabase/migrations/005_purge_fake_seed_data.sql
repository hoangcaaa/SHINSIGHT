-- Purge all fake seed data that has no on-chain backing.
-- Only keep rows that are linked to real on-chain calls.

-- Delete settlement logs for fake calls
DELETE FROM settlement_log WHERE call_id IN (SELECT id FROM calls WHERE call_id_onchain IS NULL);

-- Delete buyer records for fake calls
DELETE FROM buyers WHERE call_id IN (SELECT id FROM calls WHERE call_id_onchain IS NULL);

-- Delete the fake calls themselves
DELETE FROM calls WHERE call_id_onchain IS NULL;

-- Reset KOL stats to zero (will be rebuilt from real settlements)
UPDATE kol_stats SET
  total_calls = 0, true_calls = 0, false_calls = 0, expired_calls = 0,
  total_escrow_earned = 0, current_streak = 0, updated_at = NOW();
