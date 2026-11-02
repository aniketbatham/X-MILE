-- ====================================================================
-- MIGRATION 004: ORDER SECURITY & IDEMPOTENCY
-- X-MILE Platform — Production Architecture
-- Database-Enforced Atomic Idempotency Infrastructure
-- ====================================================================

-- 1. ORDER IDEMPOTENCY KEYS TABLE
CREATE TABLE IF NOT EXISTS public.order_idempotency_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  response_payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_buyer_idempotency_key UNIQUE (buyer_id, idempotency_key),
  CONSTRAINT chk_idempotency_key_valid CHECK (length(trim(idempotency_key)) > 0 AND length(idempotency_key) <= 255 AND idempotency_key ~ '^[a-zA-Z0-9_\-\.:]{1,255}$'),
  CONSTRAINT chk_request_hash_sha256 CHECK (length(request_hash) = 64 AND request_hash ~ '^[a-fA-F0-9]{64}$')
);

-- 2. COVERING INDEXES FOR FAST-PATH LOOKUPS
CREATE INDEX IF NOT EXISTS idx_order_idempotency_lookup 
  ON public.order_idempotency_keys(buyer_id, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_order_idempotency_created 
  ON public.order_idempotency_keys(created_at DESC);

-- 3. ROW LEVEL SECURITY
ALTER TABLE public.order_idempotency_keys ENABLE ROW LEVEL SECURITY;

-- Buyers can inspect their own idempotency history; Admins can inspect all
DROP POLICY IF EXISTS "Buyers view own idempotency records" ON public.order_idempotency_keys;
CREATE POLICY "Buyers view own idempotency records"
  ON public.order_idempotency_keys FOR SELECT
  USING (buyer_id = auth.uid() OR public.is_admin());

-- Mutations are strictly restricted to service_role within database functions
DROP POLICY IF EXISTS "Service role manages idempotency records" ON public.order_idempotency_keys;
CREATE POLICY "Service role manages idempotency records"
  ON public.order_idempotency_keys FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
