-- ====================================================================
-- PATCH 002: PRE-RECONCILIATION FOR TRANSACTIONAL MARKETPLACE
-- X-MILE Platform — Production Architecture
-- Target: Legacy Production Baseline (Pre-002)
-- Scope: 1. Fail-closed guard against re-execution if canonical policies exist
--        2. Strictly one-time snapshot of pre-existing RLS policies
--        3. Non-destructive column additions for farmers, inventory, orders
--        4. Purge legacy policies to prevent permissive OR leaks
--        5. Option A Canonical Synchronization Backfill for 3 legacy inventory rows
--        6. Attach 17 table-scoped CHECK constraints with full validation
-- ====================================================================

BEGIN;

-- 1. GUARD: Refuse execution if Migration 002 canonical policies already exist
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('farmers', 'inventory', 'orders', 'order_items', 'shipments')
      AND policyname IN (
        'Public can view farmers',
        'Farmers manage own farmer record',
        'Public can view available inventory',
        'Farmers manage own inventory',
        'Buyers and Admins view relevant orders',
        'Authorized callers update orders',
        'Participants view order items',
        'Participants view shipments',
        'Transporters and Admins update shipments'
      )
  ) THEN
    RAISE EXCEPTION 'PATCH_002_GUARD_FAILED: Migration 002 canonical policies are already active. Re-running Patch 002 is forbidden.'
      USING ERRCODE = '55000';
  END IF;
END $$;

-- 2. Create policy backup ledger if not exists
CREATE TABLE IF NOT EXISTS public._pre_002_rls_policy_backup (
  id SERIAL PRIMARY KEY,
  schemaname TEXT NOT NULL,
  tablename TEXT NOT NULL,
  policyname TEXT NOT NULL,
  permissive TEXT NOT NULL DEFAULT 'PERMISSIVE',
  roles TEXT[] NOT NULL,
  cmd TEXT NOT NULL,
  qual TEXT,
  with_check TEXT,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Restrict backup table access strictly to postgres and service_role
REVOKE ALL ON public._pre_002_rls_policy_backup FROM PUBLIC, anon, authenticated;
GRANT ALL ON public._pre_002_rls_policy_backup TO postgres;

-- 3. Strictly one-time snapshot: Only insert if ledger has not already recorded a snapshot
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public._pre_002_rls_policy_backup) THEN
    INSERT INTO public._pre_002_rls_policy_backup (schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check)
    SELECT 
      p.schemaname, 
      p.tablename, 
      p.policyname, 
      p.permissive,
      p.roles, 
      p.cmd, 
      p.qual, 
      p.with_check
    FROM pg_policies p
    WHERE p.schemaname = 'public' 
      AND p.tablename IN ('farmers', 'inventory', 'orders', 'order_items', 'shipments');
    RAISE NOTICE 'Patch 002: Successfully captured initial policy snapshot into _pre_002_rls_policy_backup.';
  ELSE
    RAISE NOTICE 'Patch 002: Existing policy snapshot detected in _pre_002_rls_policy_backup. Skipping capture to prevent overwrite.';
  END IF;
END $$;

-- 4. Add missing columns with safe defaults
ALTER TABLE public.farmers
  ADD COLUMN IF NOT EXISTS profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 5. Dynamically purge all existing RLS policies on the 5 legacy tables
-- Prevents permissive OR bypasses and duplicate policy name collisions
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename IN ('farmers', 'inventory', 'orders', 'order_items', 'shipments')
  ) LOOP
    EXECUTE pg_catalog.format('DROP POLICY IF EXISTS %I ON %I.%I;', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- 6. Canonical Synchronization Backfill (Option A)
-- Harmonizes 3 legacy prototype rows to canonical availability semantics
-- Preserves quantities, reservations, orders and ownership untouched
UPDATE public.inventory
SET status = 'AVAILABLE', available = true
WHERE id IN ('1e4569fe-a660-49a7-a229-17356eafdd65', '4abbb0e5-7f91-4ebb-9ee5-3dcc0be4c0a6')
  AND quantity_kg > reserved_quantity_kg;

UPDATE public.inventory
SET status = 'RESERVED', available = false
WHERE id = '5e40dabf-5359-4729-88a4-d69ed499db68'
  AND quantity_kg = reserved_quantity_kg;

-- 7. Add all 17 missing CHECK constraints (scoped to conrelid)
DO $$
BEGIN
  -- Inventory constraints (table-scoped)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND conname = 'chk_inventory_quantity_positive') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_quantity_positive CHECK (quantity_kg > 0) NOT VALID;
    ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_quantity_positive;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND conname = 'chk_inventory_quality_grade') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_quality_grade CHECK (quality_grade IN ('A', 'B', 'C')) NOT VALID;
    ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_quality_grade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND conname = 'chk_inventory_reserved_non_negative') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_reserved_non_negative CHECK (reserved_quantity_kg >= 0) NOT VALID;
    ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_reserved_non_negative;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND conname = 'chk_inventory_status') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_status CHECK (status IN ('AVAILABLE', 'RESERVED', 'SOLD')) NOT VALID;
    ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND conname = 'chk_inventory_quality_score') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_quality_score CHECK (quality_score BETWEEN 0 AND 100) NOT VALID;
    ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_quality_score;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND conname = 'chk_inventory_quality_confidence') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_quality_confidence CHECK (quality_confidence BETWEEN 0 AND 100) NOT VALID;
    ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_quality_confidence;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND conname = 'chk_inventory_reserved_le_quantity') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_reserved_le_quantity CHECK (reserved_quantity_kg <= quantity_kg) NOT VALID;
    ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_reserved_le_quantity;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.inventory'::regclass AND conname = 'chk_inventory_availability_sync') THEN
    ALTER TABLE public.inventory ADD CONSTRAINT chk_inventory_availability_sync CHECK (
      (status = 'AVAILABLE' AND available = true) OR
      (status IN ('RESERVED', 'SOLD') AND available = false)
    ) NOT VALID;
    ALTER TABLE public.inventory VALIDATE CONSTRAINT chk_inventory_availability_sync;
  END IF;

  -- Orders constraints (table-scoped)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.orders'::regclass AND conname = 'chk_orders_requested_qty_positive') THEN
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_requested_qty_positive CHECK (requested_quantity_kg > 0) NOT VALID;
    ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_requested_qty_positive;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.orders'::regclass AND conname = 'chk_orders_required_grade') THEN
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_required_grade CHECK (required_grade IN ('A', 'B', 'C')) NOT VALID;
    ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_required_grade;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.orders'::regclass AND conname = 'chk_orders_fulfilled_non_negative') THEN
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_fulfilled_non_negative CHECK (fulfilled_quantity_kg >= 0) NOT VALID;
    ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_fulfilled_non_negative;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.orders'::regclass AND conname = 'chk_orders_fulfillment_percentage') THEN
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_fulfillment_percentage CHECK (fulfillment_percentage BETWEEN 0 AND 100) NOT VALID;
    ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_fulfillment_percentage;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.orders'::regclass AND conname = 'chk_orders_status') THEN
    ALTER TABLE public.orders ADD CONSTRAINT chk_orders_status CHECK (status IN ('Accepted', 'Dispatched', 'Delivered', 'Disputed', 'Cancelled')) NOT VALID;
    ALTER TABLE public.orders VALIDATE CONSTRAINT chk_orders_status;
  END IF;

  -- Order Items constraints (table-scoped)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.order_items'::regclass AND conname = 'chk_order_items_quantity_positive') THEN
    ALTER TABLE public.order_items ADD CONSTRAINT chk_order_items_quantity_positive CHECK (quantity_kg > 0) NOT VALID;
    ALTER TABLE public.order_items VALIDATE CONSTRAINT chk_order_items_quantity_positive;
  END IF;

  -- Shipments constraints (table-scoped)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.shipments'::regclass AND conname = 'chk_shipments_status') THEN
    ALTER TABLE public.shipments ADD CONSTRAINT chk_shipments_status CHECK (status IN ('Preparing', 'Dispatched', 'In Transit', 'Delivered', 'Delayed', 'Failed')) NOT VALID;
    ALTER TABLE public.shipments VALIDATE CONSTRAINT chk_shipments_status;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.shipments'::regclass AND conname = 'chk_shipments_total_qty_non_negative') THEN
    ALTER TABLE public.shipments ADD CONSTRAINT chk_shipments_total_qty_non_negative CHECK (total_quantity_kg >= 0) NOT VALID;
    ALTER TABLE public.shipments VALIDATE CONSTRAINT chk_shipments_total_qty_non_negative;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.shipments'::regclass AND conname = 'chk_shipments_progress_percentage') THEN
    ALTER TABLE public.shipments ADD CONSTRAINT chk_shipments_progress_percentage CHECK (progress_percentage BETWEEN 0 AND 100) NOT VALID;
    ALTER TABLE public.shipments VALIDATE CONSTRAINT chk_shipments_progress_percentage;
  END IF;
END $$;

COMMIT;
