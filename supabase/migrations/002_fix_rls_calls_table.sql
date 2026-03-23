-- Fix RLS: prevent anon from reading sensitive columns (decryption_key, encrypted_blob, encryption_iv)
-- from the base calls table. Only allow reads via the public_calls view which excludes these columns.

-- Drop the overly permissive anon policy on base table
DROP POLICY IF EXISTS "anon_read_calls" ON calls;

-- Revoke direct SELECT on base table from anon
REVOKE SELECT ON calls FROM anon;

-- Grant SELECT on the public_calls view (which excludes sensitive columns)
GRANT SELECT ON public_calls TO anon;
