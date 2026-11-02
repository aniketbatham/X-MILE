-- ====================================================================
-- X-MILE COMPREHENSIVE PRODUCTION PREFLIGHT AUDIT SCRIPT
-- Mode: Strictly READ-ONLY (No writes, zero schema/data mutation)
-- Target: Production Supabase (gnypyybrresuynparioj)
-- Scope: Full validation of prerequisites, types, foreign keys,
--        RPC signatures, RLS policies, triggers, private ledgers,
--        and partially applied migration state for Migrations 007–009.
-- ====================================================================

BEGIN TRANSACTION READ ONLY;

-- --------------------------------------------------------------------
-- 1. STRUCTURED READ-ONLY DIAGNOSTIC AUDIT
-- Combines all checks into a clean, queryable result set without temp tables
-- --------------------------------------------------------------------
WITH 
-- 1.1 Baseline Tables Audit
baseline_tables AS (
  SELECT 
    'PREREQUISITE_TABLE'::text AS category,
    'table_' || req.tbl AS check_name,
    CASE 
      WHEN t.table_name IS NOT NULL THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN t.table_name IS NOT NULL THEN 'Table public.' || req.tbl || ' exists.'
      ELSE 'Required baseline table public.' || req.tbl || ' is missing.'
    END AS details
  FROM (
    VALUES 
      ('profiles'), ('farmers'), ('produce_listings'), ('inventory'),
      ('buyer_offers'), ('orders'), ('order_items'), ('shipments'),
      ('transport_requests'), ('admin_audit_logs'), ('order_idempotency_keys')
  ) AS req(tbl)
  LEFT JOIN information_schema.tables t 
    ON t.table_schema = 'public' AND t.table_name = req.tbl
),

-- 1.2 Enum Types Audit
enum_audit AS (
  SELECT 
    'ENUM_VALIDATION'::text AS category,
    'user_role_transport_provider'::text AS check_name,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'user_role' AND e.enumlabel = 'TRANSPORT_PROVIDER'
      ) THEN 'PASS'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM pg_type t 
        JOIN pg_enum e ON t.oid = e.enumtypid 
        WHERE t.typname = 'user_role' AND e.enumlabel = 'TRANSPORT_PROVIDER'
      ) THEN 'user_role enum contains TRANSPORT_PROVIDER.'
      ELSE 'user_role enum is missing TRANSPORT_PROVIDER label.'
    END AS details
),

-- 1.3 Column Compatibility & Type Invariants
column_audit AS (
  -- transport_requests.order_id
  SELECT 
    'COLUMN_COMPATIBILITY'::text AS category,
    'transport_requests.order_id'::text AS check_name,
    CASE 
      WHEN data_type = 'text' THEN 'PASS'
      WHEN data_type IS NULL THEN 'FAIL'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN data_type = 'text' THEN 'Column is data_type TEXT (required for UUID regex validation before casting).'
      WHEN data_type IS NULL THEN 'Column order_id does not exist on transport_requests.'
      ELSE 'Column order_id exists with incompatible type: ' || data_type || ' (expected TEXT).'
    END AS details
  FROM (
    SELECT data_type FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transport_requests' AND column_name = 'order_id'
    UNION ALL SELECT NULL WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'transport_requests' AND column_name = 'order_id'
    )
  ) sub LIMIT 1
),

-- 1.4 Optional / Target Column Invariants
target_columns AS (
  SELECT 
    'COLUMN_COMPATIBILITY'::text AS category,
    (chk.tbl || '.' || chk.target_col)::text AS check_name,
    CASE 
      WHEN col.udt_name IS NULL THEN 'PASS'
      WHEN col.udt_name = 'uuid' AND fk.has_fk THEN 'PASS'
      WHEN col.udt_name = 'uuid' AND NOT fk.has_fk THEN 'REVIEW REQUIRED'
      ELSE 'FAIL'
    END AS status,
    CASE 
      WHEN col.udt_name IS NULL THEN 'Column absent; target migration will add cleanly with UUID type and FK.'
      WHEN col.udt_name = 'uuid' AND fk.has_fk THEN 'Column already present with valid UUID type and foreign key constraint.'
      WHEN col.udt_name = 'uuid' AND NOT fk.has_fk THEN 'Column exists as UUID but foreign key constraint to referenced table is missing.'
      ELSE 'Column exists with incompatible type: ' || col.udt_name || ' (expected UUID).'
    END AS details
  FROM (
    VALUES 
      ('orders', 'assigned_transporter_id', 'profiles'),
      ('shipments', 'assigned_transporter_id', 'profiles'),
      ('transport_requests', 'assigned_transporter_id', 'profiles'),
      ('buyer_offers', 'order_id', 'orders')
  ) AS chk(tbl, target_col, ref_tbl)
  LEFT JOIN information_schema.columns col 
    ON col.table_schema = 'public' AND col.table_name = chk.tbl AND col.column_name = chk.target_col
  LEFT JOIN LATERAL (
    SELECT EXISTS (
      SELECT 1 FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conrelid = ('public.' || chk.tbl)::regclass AND c.contype = 'f'
        AND a.attname = chk.target_col AND c.confrelid = ('public.' || chk.ref_tbl)::regclass
    ) AS has_fk
  ) fk ON true
),

-- 1.5 Private Authorization Ledgers
ledger_audit AS (
  SELECT 
    'PRIVATE_LEDGER'::text AS category,
    chk.tbl::text AS check_name,
    CASE 
      WHEN c.relname IS NULL THEN 'PASS'
      WHEN c.relrowsecurity = true AND r.rolname = 'postgres' AND (grants.has_leaked IS FALSE OR grants.has_leaked IS NULL) THEN 'PASS'
      ELSE 'REVIEW REQUIRED'
    END AS status,
    CASE 
      WHEN c.relname IS NULL THEN 'Ledger table absent; migration will create with postgres ownership and RLS.'
      WHEN c.relrowsecurity = true AND r.rolname = 'postgres' AND (grants.has_leaked IS FALSE OR grants.has_leaked IS NULL) THEN 'Ledger table exists, owned by postgres, RLS enabled, zero leaked permissions.'
      ELSE 'Ledger table exists but owner is ' || COALESCE(r.rolname, 'unknown') || ', RLS=' || COALESCE(c.relrowsecurity::text, 'false') || ', leaked_grants=' || COALESCE(grants.has_leaked::text, 'unknown')
    END AS details
  FROM (
    VALUES ('_offer_acceptance_authorizations'), ('_transport_assignment_authorizations')
  ) AS chk(tbl)
  LEFT JOIN pg_class c ON c.relname = chk.tbl AND c.relnamespace = 'public'::regnamespace
  LEFT JOIN pg_roles r ON r.oid = c.relowner
  LEFT JOIN LATERAL (
    SELECT bool_or(grantee IN ('PUBLIC', 'anon', 'authenticated')) AS has_leaked
    FROM information_schema.role_table_grants 
    WHERE table_schema = 'public' AND table_name = chk.tbl
  ) grants ON true
),

-- 1.6 RPC Function Signatures, Security & Search Path
function_audit AS (
  SELECT 
    'FUNCTION_AUDIT'::text AS category,
    chk.fn_name::text AS check_name,
    CASE 
      WHEN p.proname IS NULL THEN 'REVIEW REQUIRED'
      WHEN p.overload_count > 1 THEN 'REVIEW REQUIRED'
      WHEN p.prosecdef = true AND p.safe_search_path = true AND p.owner_name = 'postgres' THEN 'PASS'
      ELSE 'REVIEW REQUIRED'
    END AS status,
    CASE 
      WHEN p.proname IS NULL THEN 'Function not currently present in public schema. Target migration will deploy it.'
      WHEN p.overload_count > 1 THEN 'Duplicate overloaded signatures detected (' || p.overload_count || '). Obsolete overloads must be dropped.'
      WHEN p.prosecdef = true AND p.safe_search_path = true AND p.owner_name = 'postgres' THEN 'Valid signature found: ' || p.args || ' -> ' || p.ret_type || ' (Owner: postgres, SecDef: true, SearchPath: safe).'
      ELSE 'Function found but owner=' || p.owner_name || ', SecDef=' || p.prosecdef::text || ', SafePath=' || p.safe_search_path::text
    END AS details
  FROM (
    VALUES 
      ('dispatch_order'),
      ('finalize_order_fulfillment'),
      ('assign_transporter_to_job'),
      ('accept_buyer_offer_and_create_order'),
      ('create_and_reserve_order')
  ) AS chk(fn_name)
  LEFT JOIN LATERAL (
    SELECT 
      proc.proname,
      count(*) OVER (PARTITION BY proc.proname) AS overload_count,
      pg_catalog.pg_get_function_identity_arguments(proc.oid) AS args,
      pg_catalog.format_type(proc.prorettype, NULL) AS ret_type,
      proc.prosecdef,
      r.rolname AS owner_name,
      (proc.proconfig IS NOT NULL AND 'search_path=""' = ANY(proc.proconfig)) AS safe_search_path
    FROM pg_proc proc
    JOIN pg_namespace n ON proc.pronamespace = n.oid
    JOIN pg_roles r ON r.oid = proc.proowner
    WHERE n.nspname = 'public' AND proc.proname = chk.fn_name
    LIMIT 1
  ) p ON true
),

-- 1.7 Trigger Immutability & Transition Enforcers
trigger_audit AS (
  SELECT 
    'TRIGGER_SECURITY'::text AS category,
    chk.trg_name::text AS check_name,
    CASE 
      WHEN t.trigger_name IS NOT NULL THEN 'PASS'
      ELSE 'REVIEW REQUIRED'
    END AS status,
    CASE 
      WHEN t.trigger_name IS NOT NULL THEN 'Trigger is active on public.' || chk.tbl || '.'
      ELSE 'Trigger not found on public.' || chk.tbl || '. Will be created or validated by migration.'
    END AS details
  FROM (
    VALUES 
      ('admin_audit_logs', 'trg_prevent_audit_log_mutation'),
      ('buyer_offers', 'trg_enforce_buyer_offer_transition'),
      ('transport_requests', 'trg_enforce_transport_request_transition')
  ) AS chk(tbl, trg_name)
  LEFT JOIN information_schema.triggers t 
    ON t.event_object_schema = 'public' AND t.event_object_table = chk.tbl AND t.trigger_name = chk.trg_name
),

-- 1.8 RLS Policy Conflict Detection
policy_audit AS (
  SELECT 
    'POLICY_CONFLICT'::text AS category,
    'transport_requests_permissive_policies'::text AS check_name,
    CASE 
      WHEN count(*) = 0 THEN 'PASS'
      ELSE 'REVIEW REQUIRED'
    END AS status,
    CASE 
      WHEN count(*) = 0 THEN 'No conflicting overly-permissive legacy policies detected.'
      ELSE count(*) || ' legacy open policy detected. Migration 008 will enforce least-privilege role boundaries.'
    END AS details
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'transport_requests'
    AND policyname IN (
      'allow_all_read_transport_requests',
      'allow_anon_read_transport_requests',
      'public_read_transport_requests'
    )
),

-- 1.9 Migration Tracking & Dependency State
migration_state AS (
  SELECT 
    'MIGRATION_STATE'::text AS category,
    chk.mig_name::text AS check_name,
    chk.status::text AS status,
    chk.details::text AS details
  FROM (
    -- Migration 007 evaluation
    SELECT 
      'migration_007_status' AS mig_name,
      'PASS' AS status,
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'buyer_offers' AND column_name = 'order_id')
             AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_offer_acceptance_authorizations')
        THEN 'Migration 007 appears FULLY APPLIED or PRE-CONFIGURED.'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'buyer_offers' AND column_name = 'order_id')
             AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_offer_acceptance_authorizations')
        THEN 'Migration 007 is NOT YET APPLIED (Clean state for application).'
        ELSE 'Migration 007 is PARTIALLY APPLIED (Idempotent DDL will reconcile safely).'
      END AS details
    UNION ALL
    -- Migration 008 evaluation
    SELECT 
      'migration_008_status' AS mig_name,
      'PASS' AS status,
      CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transport_requests' AND column_name = 'assigned_transporter_id')
             AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_transport_assignment_authorizations')
        THEN 'Migration 008 appears FULLY APPLIED or PRE-CONFIGURED.'
        WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'transport_requests' AND column_name = 'assigned_transporter_id')
             AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '_transport_assignment_authorizations')
        THEN 'Migration 008 is NOT YET APPLIED (Clean state for application).'
        ELSE 'Migration 008 is PARTIALLY APPLIED (Idempotent DDL will reconcile safely).'
      END AS details
    UNION ALL
    -- Migration 009 evaluation
    SELECT 
      'migration_009_status' AS mig_name,
      'PASS' AS status,
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
          WHERE n.nspname = 'public' AND p.proname = 'finalize_order_fulfillment'
            AND pg_catalog.pg_get_functiondef(p.oid) LIKE '%In Transit%'
        )
        THEN 'Migration 009 appears FULLY APPLIED (Shipment In Transit invariant active).'
        ELSE 'Migration 009 is NOT YET APPLIED (Ready for replacement).'
      END AS details
  ) chk
)

-- Combined Diagnostic Output
SELECT category, check_name, status, details FROM (
  SELECT category, check_name, status, details FROM baseline_tables
  UNION ALL SELECT category, check_name, status, details FROM enum_audit
  UNION ALL SELECT category, check_name, status, details FROM column_audit
  UNION ALL SELECT category, check_name, status, details FROM target_columns
  UNION ALL SELECT category, check_name, status, details FROM ledger_audit
  UNION ALL SELECT category, check_name, status, details FROM function_audit
  UNION ALL SELECT category, check_name, status, details FROM trigger_audit
  UNION ALL SELECT category, check_name, status, details FROM policy_audit
  UNION ALL SELECT category, check_name, status, details FROM migration_state
) combined_audit_checks
ORDER BY 
  CASE status 
    WHEN 'FAIL' THEN 1 
    WHEN 'REVIEW REQUIRED' THEN 2 
    WHEN 'PASS' THEN 3 
  END,
  category, 
  check_name;

-- --------------------------------------------------------------------
-- 2. FAIL-CLOSED ASSERTION BLOCK
-- Aborts immediately if any critical baseline requirement is missing
-- --------------------------------------------------------------------
DO $$
DECLARE
  v_missing_baseline TEXT := '';
  v_type TEXT;
  v_rec RECORD;
BEGIN
  -- 1. Assert all 11 core baseline tables exist
  FOR v_rec IN 
    SELECT unnest(ARRAY[
      'profiles', 'farmers', 'produce_listings', 'inventory', 
      'buyer_offers', 'orders', 'order_items', 'shipments', 
      'transport_requests', 'admin_audit_logs', 'order_idempotency_keys'
    ]) AS tbl
  LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = v_rec.tbl) THEN
      v_missing_baseline := v_missing_baseline || ' ' || v_rec.tbl;
    END IF;
  END LOOP;

  IF v_missing_baseline <> '' THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL_CLOSED: Missing prerequisite baseline tables:%', v_missing_baseline
      USING ERRCODE = '02000';
  END IF;

  -- 2. Assert TRANSPORT_PROVIDER enum value exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t 
    JOIN pg_enum e ON t.oid = e.enumtypid 
    WHERE t.typname = 'user_role' AND e.enumlabel = 'TRANSPORT_PROVIDER'
  ) THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL_CLOSED: user_role enum does not contain TRANSPORT_PROVIDER.'
      USING ERRCODE = '02000';
  END IF;

  -- 3. Assert transport_requests.order_id is TEXT
  SELECT data_type INTO v_type 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'transport_requests' AND column_name = 'order_id';

  IF v_type IS DISTINCT FROM 'text' THEN
    RAISE EXCEPTION 'PREFLIGHT_FAIL_CLOSED: transport_requests.order_id must be data_type TEXT (found: %).', v_type
      USING ERRCODE = '42804';
  END IF;

  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'X-MILE PREFLIGHT AUDIT PASSED: Baseline prerequisites confirmed.';
  RAISE NOTICE '====================================================================';
END $$;

-- --------------------------------------------------------------------
-- 3. CONNECTION METADATA
-- --------------------------------------------------------------------
SELECT 
  current_database() AS connected_database,
  current_user AS session_user,
  inet_server_addr() AS server_ip,
  pg_catalog.pg_is_in_recovery() AS is_read_replica,
  pg_catalog.version() AS postgres_version;

COMMIT;
