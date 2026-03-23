-- Atomic KOL stats update function to prevent race conditions
CREATE OR REPLACE FUNCTION update_kol_stats_atomic(
  p_kol_address TEXT,
  p_true_inc INT,
  p_false_inc INT,
  p_expired_inc INT,
  p_escrow_earned BIGINT,
  p_verdict TEXT
) RETURNS void AS $$
BEGIN
  UPDATE kol_stats SET
    total_calls = total_calls + 1,
    true_calls = true_calls + p_true_inc,
    false_calls = false_calls + p_false_inc,
    expired_calls = expired_calls + p_expired_inc,
    total_escrow_earned = total_escrow_earned + p_escrow_earned,
    current_streak = CASE
      WHEN p_verdict = 'settled_true' THEN
        CASE WHEN current_streak >= 0 THEN current_streak + 1 ELSE 1 END
      WHEN p_verdict = 'settled_false' THEN
        CASE WHEN current_streak <= 0 THEN current_streak - 1 ELSE -1 END
      ELSE 0
    END,
    updated_at = NOW()
  WHERE kol_address = p_kol_address;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
