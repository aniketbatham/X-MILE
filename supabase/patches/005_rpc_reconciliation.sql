-- ====================================================================
-- PATCH 005: RPC SIGNATURE RECONCILIATION FOR INVENTORY RESERVATION
-- X-MILE Platform — Production Architecture
-- Target: Legacy Production Baseline
-- Scope: Forward-compatible wrapper for reserve_inventory_for_order(UUID, JSONB)
--        calling canonical reserve_inventory_for_order(JSONB, UUID)
-- ====================================================================

BEGIN;

-- 1. Create forward-compatible wrapper for the legacy (UUID, JSONB) signature
CREATE OR REPLACE FUNCTION public.reserve_inventory_for_order(
  p_order_id UUID, 
  p_items JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Forward call to canonical implementation deployed in Migration 005
  PERFORM public.reserve_inventory_for_order(p_items, p_order_id);
END;
$$;

-- 2. Enforce postgres ownership and empty search path
ALTER FUNCTION public.reserve_inventory_for_order(UUID, JSONB) OWNER TO postgres;

-- 3. Strict security: Revoke from PUBLIC and grant solely to service_role
REVOKE ALL ON FUNCTION public.reserve_inventory_for_order(UUID, JSONB) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_inventory_for_order(UUID, JSONB) TO service_role;

COMMIT;
