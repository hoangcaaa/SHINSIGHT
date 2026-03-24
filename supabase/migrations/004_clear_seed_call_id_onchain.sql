-- Clear fake call_id_onchain values from seed data.
-- Seed data was inserted with call_id_onchain values that conflict with real on-chain IDs.
UPDATE calls SET call_id_onchain = NULL WHERE id <= 15;
