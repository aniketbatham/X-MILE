-- ====================================================================
-- PATCH 002: ROLLBACK SCRIPT FOR PRE-RECONCILIATION
-- X-MILE Platform — Production Architecture
-- Target: Restores exact original RLS policies (including permissive attribute)
--         Reverts legacy inventory status flags
--         Drops added columns and 17 constraints without deleting records
-- ====================================================================

BEGIN;

-- 1. Drop Migration 002 canonical policies if present
DROP POLICY IF EXISTS "Public can view farmers" ON public.farmers;
DROP POLICY IF EXISTS "Farmers manage own farmer record" ON public.farmers;
DROP POLICY IF EXISTS "Public can view available inventory" ON public.inventory;
DROP POLICY IF EXISTS "Farmers manage own inventory" ON public.inventory;
DROP POLICY IF EXISTS "Buyers and Admins view relevant orders" ON public.orders;
DROP POLICY IF EXISTS "Authorized callers update orders" ON public.orders;
DROP POLICY IF EXISTS "Participants view order items" ON public.order_items;
DROP POLICY IF EXISTS "Participants view shipments" ON public.shipments;
DROP POLICY IF EXISTS "Transporters and Admins update shipments" ON public.shipments;

-- 2. Restore exact original legacy policies from backup table
DO $$
DECLARE
  rec RECORD;
  v_sql TEXT;
  v_role_str TEXT;
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_pre_002_rls_policy_backup') THEN
    FOR rec IN (
      SELECT * FROM public._pre_002_rls_policy_backup ORDER BY id ASC
    ) LOOP
      -- Ensure current policy with that name is dropped before restoring
      EXECUTE pg_catalog.format('DROP POLICY IF EXISTS %I ON %I.%I;', rec.policyname, rec.schemaname, rec.tablename);

      -- Format roles list
      SELECT string_agg(quote_ident(r), ', ') INTO v_role_str FROM unnest(rec.roles) AS r;
      IF v_role_str IS NULL OR v_role_str = '' THEN
        v_role_str := 'public';
      END IF;

      -- Construct CREATE POLICY statement with exact AS PERMISSIVE / AS RESTRICTIVE
      v_sql := pg_catalog.format('CREATE POLICY %I ON %I.%I AS %s FOR %s TO %s',
        rec.policyname,
        rec.schemaname,
        rec.tablename,
        rec.permissive,
        rec.cmd,
        v_role_str
      );

      IF rec.qual IS NOT NULL THEN
        v_sql := v_sql || ' USING (' || rec.qual || ')';
      END IF;

      IF rec.with_check IS NOT NULL THEN
        v_sql := v_sql || ' WITH CHECK (' || rec.with_check || ')';
      END IF;

      RAISE NOTICE 'Restoring policy: %', v_sql;
      EXECUTE v_sql;
    END LOOP;
  END IF;
END $$;

-- 3. Drop the 17 CHECK constraints safely
ALTER TABLE public.inventory
  DROP CONSTRAINT IF EXISTS chk_inventory_quantity_positive,
  DROP CONSTRAINT IF EXISTS chk_inventory_quality_grade,
  DROP CONSTRAINT IF EXISTS chk_inventory_reserved_non_negative,
  DROP CONSTRAINT IF EXISTS chk_inventory_status,
  DROP CONSTRAINT IF EXISTS chk_inventory_quality_score,
  DROP CONSTRAINT IF EXISTS chk_inventory_quality_confidence,
  DROP CONSTRAINT IF EXISTS chk_inventory_reserved_le_quantity,
  DROP CONSTRAINT IF EXISTS chk_inventory_availability_sync;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS chk_orders_requested_qty_positive,
  DROP CONSTRAINT IF EXISTS chk_orders_required_grade,
  DROP CONSTRAINT IF EXISTS chk_orders_fulfilled_non_negative,
  DROP CONSTRAINT IF EXISTS chk_orders_fulfillment_percentage,
  DROP CONSTRAINT IF EXISTS chk_orders_status;

ALTER TABLE public.order_items
  DROP CONSTRAINT IF EXISTS chk_order_items_quantity_positive;

ALTER TABLE public.shipments
  DROP CONSTRAINT IF EXISTS chk_shipments_status,
  DROP CONSTRAINT IF EXISTS chk_shipments_total_qty_non_negative,
  DROP CONSTRAINT IF EXISTS chk_shipments_progress_percentage;

-- 4. Revert inventory prototype status flags
UPDATE public.inventory
SET status = 'RESERVED', available = true
WHERE id IN (
  '1e4569fe-a660-49a7-a229-17356eafdd65',
  '4abbb0e5-7f91-4ebb-9ee5-3dcc0be4c0a6',
  '5e40dabf-5359-4729-88a4-d69ed499db68'
);

-- 5. Drop added columns
ALTER TABLE public.farmers DROP COLUMN IF EXISTS profile_id, DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.inventory DROP COLUMN IF EXISTS updated_at;
ALTER TABLE public.orders DROP COLUMN IF EXISTS buyer_id, DROP COLUMN IF EXISTS created_by, DROP COLUMN IF EXISTS updated_at;

-- 6. Safe cleanup of backup ledger upon completed rollback restoration
DROP TABLE IF EXISTS public._pre_002_rls_policy_backup;

COMMIT;
