-- Seed data: 3 test KOLs with sample stats
INSERT INTO kol_stats (kol_address, total_calls, true_calls, false_calls, expired_calls, current_streak)
VALUES
  ('0xaa11bb22cc33dd44ee55ff6677889900aabbccdd', 12, 8, 3, 1, 3),
  ('0x1122334455667788aabbccddeeff00112233aabb', 7, 5, 2, 0, -1),
  ('0xdeadbeef00112233445566778899aabbccddeeff', 3, 1, 1, 1, 0)
ON CONFLICT (kol_address) DO NOTHING;
