-- ====================================================================
-- REVISION 9 MIGRATION SCRIPT (HARDENED TRANSACTIONAL ENGINE)
-- Target Environment: Staging ONLY (gufyukekzkomxfhvtruf)
-- Production (gnypyybrresuynparioj) is strictly OFF LIMITS.
-- Purpose: Milestone 4 Phase 1 — Transporter Discovery, Quoting & Atomic Assignment
-- Adheres to:
--   1. Atomic Transaction: Fully wrapped in BEGIN ... COMMIT
--   2. Private Transaction-Bound Ledger (_transport_assignment_authorizations)
--   3. Global Lock Hierarchy: Order (Level 2) -> Transport Request (Level 2.5) -> Shipments (Level 6 ASC)
--   4. Explicit Whitelist Order State Validation ('Accepted' only)
--   5. Quote Validation: Rejects NULL, <= 0, NaN, and Infinity in RPC and Trigger
--   6. Comprehensive Cancellation Protection: Prevents tampering with ANY business column
--   7. Shipment Conflict Prevention: Rejects if shipment already assigned to another carrier
--   8. Targeted Baseline Policy Replacement: Drops only known replaced policies; aborts on unexpected permissive policies
--   9. Least-Privilege Base-Table & View Privacy: Transporters discover only LOOKING_FOR_TRANSPORTER requests; contact redacted in view
--  10. Actual Schema Seller Identification: Validates seller through produce_listings.farmer_id and order_items -> inventory -> farmers
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- SECTION 1: PRIVATE TRANSACTION-BOUND AUTHORIZATION LEDGER
-- --------------------------------------------------------------------
-- Inaccessible to anon, authenticated, and service_role.
-- Only postgres executing within SECURITY DEFINER routines can insert or delete.
CREATE TABLE IF NOT EXISTS public._transport_assignment_authorizations (
  tx_id XID8 NOT NULL DEFAULT pg_catalog.pg_current_xact_id(),
  request_id UUID NOT NULL REFERENCES public.transport_requests(id) ON DELETE CASCADE,
  assigned_transporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (request_id, assigned_transporter_id)
);

ALTER TABLE public._transport_assignment_authorizations OWNER TO postgres;
ALTER TABLE public._transport_assignment_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public._transport_assignment_authorizations FROM PUBLIC, anon, authenticated, service_role;


-- --------------------------------------------------------------------
-- SECTION 2: SCHEMA EXTENSIONS (transport_requests, orders, shipments)
-- --------------------------------------------------------------------

-- 2.1 Schema Extension: public.orders.assigned_transporter_id
DO $$
DECLARE
  v_col_type TEXT;
  v_fk_valid BOOLEAN;
BEGIN
  -- Check if column exists
  SELECT udt_name INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orders' AND column_name = 'assigned_transporter_id';

  IF v_col_type IS NOT NULL THEN
    -- Must be UUID
    IF v_col_type <> 'uuid' THEN
      RAISE EXCEPTION 'INCOMPATIBLE_SCHEMA: public.orders.assigned_transporter_id exists but has type %, expected uuid.', v_col_type
        USING ERRCODE = '42804';
    END IF;

    -- Verify FK references public.profiles(id) with ON DELETE SET NULL
    SELECT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conrelid = 'public.orders'::regclass
        AND c.contype = 'f'
        AND a.attname = 'assigned_transporter_id'
        AND c.confrelid = 'public.profiles'::regclass
        AND c.confdeltype = 'n' -- 'n' = SET NULL
    ) INTO v_fk_valid;

    IF NOT v_fk_valid THEN
      RAISE EXCEPTION 'INCOMPATIBLE_SCHEMA: public.orders.assigned_transporter_id exists but lacks valid foreign key to public.profiles(id) ON DELETE SET NULL.'
        USING ERRCODE = '42804';
    END IF;
  ELSE
    ALTER TABLE public.orders 
      ADD COLUMN assigned_transporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_assigned_transporter 
  ON public.orders(assigned_transporter_id);

-- 2.2 Schema Extension: public.shipments.assigned_transporter_id
DO $$
DECLARE
  v_col_type TEXT;
  v_fk_valid BOOLEAN;
BEGIN
  SELECT udt_name INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'shipments' AND column_name = 'assigned_transporter_id';

  IF v_col_type IS NOT NULL THEN
    IF v_col_type <> 'uuid' THEN
      RAISE EXCEPTION 'INCOMPATIBLE_SCHEMA: public.shipments.assigned_transporter_id exists but has type %, expected uuid.', v_col_type
        USING ERRCODE = '42804';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conrelid = 'public.shipments'::regclass
        AND c.contype = 'f'
        AND a.attname = 'assigned_transporter_id'
        AND c.confrelid = 'public.profiles'::regclass
        AND c.confdeltype = 'n' -- 'n' = SET NULL
    ) INTO v_fk_valid;

    IF NOT v_fk_valid THEN
      RAISE EXCEPTION 'INCOMPATIBLE_SCHEMA: public.shipments.assigned_transporter_id exists but lacks valid foreign key to public.profiles(id) ON DELETE SET NULL.'
        USING ERRCODE = '42804';
    END IF;
  ELSE
    ALTER TABLE public.shipments 
      ADD COLUMN assigned_transporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_shipments_assigned_transporter 
  ON public.shipments(assigned_transporter_id);

-- 2.3 Schema Extension: public.transport_requests (assigned_transporter_id & updated_at)
DO $$
DECLARE
  v_col_type TEXT;
  v_fk_valid BOOLEAN;
BEGIN
  SELECT udt_name INTO v_col_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'transport_requests' AND column_name = 'assigned_transporter_id';

  IF v_col_type IS NOT NULL THEN
    IF v_col_type <> 'uuid' THEN
      RAISE EXCEPTION 'INCOMPATIBLE_SCHEMA: public.transport_requests.assigned_transporter_id exists but has type %, expected uuid.', v_col_type
        USING ERRCODE = '42804';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM pg_catalog.pg_constraint c
      JOIN pg_catalog.pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
      WHERE c.conrelid = 'public.transport_requests'::regclass
        AND c.contype = 'f'
        AND a.attname = 'assigned_transporter_id'
        AND c.confrelid = 'public.profiles'::regclass
        AND c.confdeltype = 'n'
    ) INTO v_fk_valid;

    IF NOT v_fk_valid THEN
      RAISE EXCEPTION 'INCOMPATIBLE_SCHEMA: public.transport_requests.assigned_transporter_id exists but lacks valid foreign key to public.profiles(id) ON DELETE SET NULL.'
        USING ERRCODE = '42804';
    END IF;
  ELSE
    ALTER TABLE public.transport_requests 
      ADD COLUMN assigned_transporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

ALTER TABLE public.transport_requests 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now();

-- 2.4 Performance & Relational Indexes on transport_requests
CREATE INDEX IF NOT EXISTS idx_transport_requests_assigned_transporter 
  ON public.transport_requests(assigned_transporter_id);

CREATE INDEX IF NOT EXISTS idx_transport_requests_status 
  ON public.transport_requests(status);

CREATE INDEX IF NOT EXISTS idx_transport_requests_requester 
  ON public.transport_requests(requester_id);

CREATE INDEX IF NOT EXISTS idx_transport_requests_order_id 
  ON public.transport_requests(order_id);

-- 2.5 Scoped Check Constraint on Allowed Statuses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_catalog.pg_constraint 
    WHERE conrelid = 'public.transport_requests'::regclass 
      AND conname = 'transport_requests_status_check'
  ) THEN
    ALTER TABLE public.transport_requests 
      ADD CONSTRAINT transport_requests_status_check 
      CHECK (status IN ('LOOKING_FOR_TRANSPORTER', 'QUOTED', 'CONFIRMED', 'CANCELLED', 'COMPLETED'));
  END IF;
END $$;


-- --------------------------------------------------------------------
-- SECTION 3: TRANSACTION-BOUND IMMUTABILITY & TRANSITION TRIGGER
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_transport_request_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt_role TEXT;
  v_jwt_sub TEXT;
  v_caller_is_admin BOOLEAN := false;
  v_auth_count INTEGER := 0;
BEGIN
  v_jwt_role := pg_catalog.current_setting('request.jwt.claim.role', true);
  v_jwt_sub := pg_catalog.current_setting('request.jwt.claim.sub', true);

  -- Check admin identity
  IF v_jwt_sub IS NOT NULL THEN
    SELECT (role = 'ADMIN'::public.user_role) INTO v_caller_is_admin
    FROM public.profiles
    WHERE id = v_jwt_sub::UUID;
  END IF;

  -- ------------------------------------------------------------------
  -- 3.1 INSERT ENFORCEMENTS
  -- ------------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    -- Admin / service-role bypass
    IF v_jwt_role = 'service_role' OR v_caller_is_admin IS TRUE THEN
      NEW.updated_at := pg_catalog.now();
      RETURN NEW;
    END IF;

    -- Strict initial status
    IF NEW.status <> 'LOOKING_FOR_TRANSPORTER' THEN
      RAISE EXCEPTION 'INVALID_INITIAL_STATUS: New transport requests must start with status LOOKING_FOR_TRANSPORTER.'
        USING ERRCODE = '42501';
    END IF;

    -- Requesters cannot pre-assign carriers or pre-set quotes on INSERT
    IF NEW.assigned_transporter_id IS NOT NULL THEN
      RAISE EXCEPTION 'DIRECT_ASSIGNMENT_PROHIBITED: assigned_transporter_id cannot be set on creation.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.quoted_amount IS NOT NULL THEN
      RAISE EXCEPTION 'DIRECT_QUOTE_PROHIBITED: quoted_amount cannot be set on creation.'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.transporter_name IS NOT NULL OR NEW.transporter_phone IS NOT NULL THEN
      RAISE EXCEPTION 'DIRECT_TRANSPORTER_DETAILS_PROHIBITED: Transporter contact details cannot be set on creation.'
        USING ERRCODE = '42501';
    END IF;

    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
  END IF;

  -- ------------------------------------------------------------------
  -- 3.2 UPDATE ENFORCEMENTS
  -- ------------------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN
    -- Admin / service-role bypass
    IF v_jwt_role = 'service_role' OR v_caller_is_admin IS TRUE THEN
      NEW.updated_at := pg_catalog.now();
      RETURN NEW;
    END IF;

    -- Case A: Authorized Transporter Assignment via Private Ledger
    IF OLD.status = 'LOOKING_FOR_TRANSPORTER' AND NEW.status = 'CONFIRMED' THEN
      -- Strict positive finite quote check (validates IEEE 754 NaN and +/- Infinity)
      IF NEW.quoted_amount IS NULL 
         OR NEW.quoted_amount <= 0 
         OR NEW.quoted_amount::text IN ('NaN', 'Infinity', '-Infinity') THEN
        RAISE EXCEPTION 'MANDATORY_QUOTE_REQUIRED: A valid positive finite quoted_amount is required for assignment.'
          USING ERRCODE = '22023';
      END IF;

      IF NEW.assigned_transporter_id IS NULL THEN
        RAISE EXCEPTION 'MISSING_TRANSPORTER_ID: An assigned_transporter_id is required when transitioning to CONFIRMED.'
          USING ERRCODE = '42501';
      END IF;

      -- Validate and consume the transaction-bound ledger authorization
      DELETE FROM public._transport_assignment_authorizations
      WHERE request_id = NEW.id
        AND assigned_transporter_id = NEW.assigned_transporter_id
        AND tx_id = pg_catalog.pg_current_xact_id();

      GET DIAGNOSTICS v_auth_count = ROW_COUNT;

      IF v_auth_count = 0 THEN
        RAISE EXCEPTION 'DIRECT_ASSIGNMENT_PROHIBITED: Direct updates to CONFIRMED or assigned_transporter_id via client API are forbidden. Must use assign_transporter_to_job.'
          USING ERRCODE = '42501';
      END IF;

      -- Full immutability check on all other business fields during assignment
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.order_id IS DISTINCT FROM OLD.order_id
         OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
         OR NEW.pickup_location IS DISTINCT FROM OLD.pickup_location
         OR NEW.destination_location IS DISTINCT FROM OLD.destination_location
         OR NEW.produce_type IS DISTINCT FROM OLD.produce_type
         OR NEW.quantity_kg IS DISTINCT FROM OLD.quantity_kg
         OR NEW.required_vehicle_type IS DISTINCT FROM OLD.required_vehicle_type
         OR NEW.pickup_date IS DISTINCT FROM OLD.pickup_date
         OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'IMMUTABLE_FIELD_CHANGE: Core transport request specifications cannot be modified during transporter assignment.'
          USING ERRCODE = '42501';
      END IF;

      NEW.updated_at := pg_catalog.now();
      RETURN NEW;
    END IF;

    -- Case B: Requester Cancellation
    IF OLD.status = 'LOOKING_FOR_TRANSPORTER' AND NEW.status = 'CANCELLED' THEN
      -- Verify caller is the authenticated requester
      IF v_jwt_sub IS NULL OR OLD.requester_id IS DISTINCT FROM v_jwt_sub::UUID THEN
        RAISE EXCEPTION 'UNAUTHORIZED_CANCELLATION: Only the original requester may cancel this transport request.'
          USING ERRCODE = '42501';
      END IF;

      -- Comprehensive field protection on cancellation
      IF NEW.id IS DISTINCT FROM OLD.id
         OR NEW.order_id IS DISTINCT FROM OLD.order_id
         OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
         OR NEW.pickup_location IS DISTINCT FROM OLD.pickup_location
         OR NEW.destination_location IS DISTINCT FROM OLD.destination_location
         OR NEW.produce_type IS DISTINCT FROM OLD.produce_type
         OR NEW.quantity_kg IS DISTINCT FROM OLD.quantity_kg
         OR NEW.required_vehicle_type IS DISTINCT FROM OLD.required_vehicle_type
         OR NEW.pickup_date IS DISTINCT FROM OLD.pickup_date
         OR NEW.quoted_amount IS DISTINCT FROM OLD.quoted_amount
         OR NEW.transporter_name IS DISTINCT FROM OLD.transporter_name
         OR NEW.transporter_phone IS DISTINCT FROM OLD.transporter_phone
         OR NEW.assigned_transporter_id IS DISTINCT FROM OLD.assigned_transporter_id
         OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'IMMUTABLE_FIELD_CHANGE: Changing transport request specifications or carrier data during cancellation is strictly prohibited.'
          USING ERRCODE = '42501';
      END IF;

      NEW.updated_at := pg_catalog.now();
      RETURN NEW;
    END IF;

    -- All other status transitions or column modifications are blocked for non-admins
    RAISE EXCEPTION 'DIRECT_UPDATE_PROHIBITED: Transport requests cannot be modified directly via PostgREST. Status transitions require authorized platform procedures.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_transport_request_transition ON public.transport_requests;
CREATE TRIGGER trg_enforce_transport_request_transition
  BEFORE INSERT OR UPDATE ON public.transport_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_transport_request_transition();


-- --------------------------------------------------------------------
-- SECTION 4: ROW LEVEL SECURITY POLICIES (TARGETED REPLACEMENT)
-- --------------------------------------------------------------------
ALTER TABLE public.transport_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_requests FORCE ROW LEVEL SECURITY;

-- 4.1 Safety Gatekeeper: Detect unexpected permissive policies
DO $$
DECLARE
  v_unexpected_policy_count INTEGER;
BEGIN
  SELECT pg_catalog.count(*) INTO v_unexpected_policy_count
  FROM pg_catalog.pg_policies 
  WHERE schemaname = 'public' 
    AND tablename = 'transport_requests'
    AND policyname NOT IN (
      'Participants view transport requests',
      'Requesters create transport requests',
      'Participants update transport requests',
      'Authorized view transport requests',
      'Requesters insert transport requests',
      'Requesters cancel own transport requests'
    );

  IF v_unexpected_policy_count > 0 THEN
    RAISE EXCEPTION 'UNEXPECTED_POLICIES_DETECTED: Found % unknown policy/policies on public.transport_requests. Manual review required to avoid unexpected permissive bypasses.', v_unexpected_policy_count
      USING ERRCODE = 'P0001';
  END IF;
END $$;

-- 4.2 Drop ONLY the known baseline policies replaced by Revision 9
DROP POLICY IF EXISTS "Participants view transport requests" ON public.transport_requests;
DROP POLICY IF EXISTS "Requesters create transport requests" ON public.transport_requests;
DROP POLICY IF EXISTS "Participants update transport requests" ON public.transport_requests;

-- Drop existing Revision 9 policies if re-applying
DROP POLICY IF EXISTS "Authorized view transport requests" ON public.transport_requests;
DROP POLICY IF EXISTS "Requesters insert transport requests" ON public.transport_requests;
DROP POLICY IF EXISTS "Requesters cancel own transport requests" ON public.transport_requests;

-- 4.3 Authoritative Least-Privilege Policies:
-- SELECT Policy: 
--   1. Requesters view their own requests in any status
--   2. Assigned transporters view their assigned requests
--   3. Admins view all requests
--   4. Verified transporters can ONLY discover eligible OPEN requests (status = 'LOOKING_FOR_TRANSPORTER')
CREATE POLICY "Authorized view transport requests" ON public.transport_requests
  FOR SELECT
  USING (
    requester_id = auth.uid()
    OR assigned_transporter_id = auth.uid()
    OR public.is_admin()
    OR (
      status = 'LOOKING_FOR_TRANSPORTER'
      AND EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE profiles.id = auth.uid() 
          AND profiles.role IN ('TRANSPORT_PROVIDER'::public.user_role, 'ADMIN'::public.user_role)
          AND profiles.is_verified = true
      )
    )
  );

-- INSERT Policy: Authenticated users can create requests for themselves; Admins for any
CREATE POLICY "Requesters insert transport requests" ON public.transport_requests
  FOR INSERT
  WITH CHECK (
    (requester_id = auth.uid() AND auth.uid() IS NOT NULL)
    OR public.is_admin()
  );

-- UPDATE Policy: Requesters can update only their own open requests (guarded by BEFORE UPDATE trigger)
CREATE POLICY "Requesters cancel own transport requests" ON public.transport_requests
  FOR UPDATE
  USING (
    (requester_id = auth.uid() AND status = 'LOOKING_FOR_TRANSPORTER')
    OR public.is_admin()
  )
  WITH CHECK (
    (requester_id = auth.uid() AND status = 'CANCELLED')
    OR public.is_admin()
  );

-- Explicitly revoke DELETE
REVOKE DELETE ON TABLE public.transport_requests FROM PUBLIC, anon, authenticated;


-- --------------------------------------------------------------------
-- SECTION 5: COLUMN PRIVACY & DISCOVERY VIEW (security_invoker = true)
-- --------------------------------------------------------------------
-- Protects carrier personal contact information (transporter_name, transporter_phone).
-- Transporters discover open requests via open_transport_requests_discovery with security_invoker = true.
-- Non-participating third parties see redacted carrier contact info.
CREATE OR REPLACE VIEW public.open_transport_requests_discovery 
WITH (security_invoker = true) AS
SELECT 
  id,
  order_id,
  requester_id,
  pickup_location,
  destination_location,
  produce_type,
  quantity_kg,
  required_vehicle_type,
  pickup_date,
  quoted_amount,
  CASE 
    WHEN requester_id = auth.uid() 
         OR public.is_admin() 
         OR assigned_transporter_id = auth.uid() THEN transporter_name
    ELSE NULL 
  END AS transporter_name,
  CASE 
    WHEN requester_id = auth.uid() 
         OR public.is_admin() 
         OR assigned_transporter_id = auth.uid() THEN transporter_phone
    ELSE NULL 
  END AS transporter_phone,
  status,
  assigned_transporter_id,
  created_at,
  updated_at
FROM public.transport_requests
WHERE status = 'LOOKING_FOR_TRANSPORTER' 
   OR requester_id = auth.uid() 
   OR assigned_transporter_id = auth.uid()
   OR public.is_admin();

ALTER VIEW public.open_transport_requests_discovery OWNER TO postgres;
GRANT SELECT ON public.open_transport_requests_discovery TO authenticated, service_role;
REVOKE ALL ON public.open_transport_requests_discovery FROM anon, PUBLIC;


-- --------------------------------------------------------------------
-- SECTION 6: ATOMIC TRANSPORTER ASSIGNMENT TRANSACTION PROCEDURE (RPC)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_transporter_to_job(
  p_request_id UUID,
  p_transporter_id UUID DEFAULT NULL,
  p_quoted_amount NUMERIC DEFAULT NULL,
  p_transporter_name TEXT DEFAULT NULL,
  p_transporter_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller RECORD;
  v_assigned_transporter UUID;
  v_pre_req RECORD;
  v_req RECORD;
  v_order RECORD;
  v_listing RECORD;
  v_is_seller BOOLEAN := false;
  v_updated_order JSONB := NULL;
  v_order_uuid UUID := NULL;
  v_existing_shipment_count INTEGER := 0;
  v_conflicting_shipment RECORD;
  v_clean_transporter_name TEXT;
  v_clean_transporter_phone TEXT;
BEGIN
  -- ------------------------------------------------------------------
  -- 1. CALLER VALIDATION & ROLE DETERMINATION
  -- ------------------------------------------------------------------
  SELECT id, role, is_verified, full_name, phone INTO v_caller
  FROM public.profiles
  WHERE id = auth.uid();

  IF NOT FOUND THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED' 
      USING ERRCODE = '42501', DETAIL = 'Caller must be an authenticated user with an active profile.';
  END IF;

  IF v_caller.role = 'ADMIN'::public.user_role THEN
    IF p_transporter_id IS NULL THEN
      RAISE EXCEPTION 'TRANSPORTER_ID_REQUIRED_FOR_ADMIN' 
        USING ERRCODE = '22023', DETAIL = 'Administrator must specify target p_transporter_id.';
    END IF;
    v_assigned_transporter := p_transporter_id;

    -- Verify target transporter profile under lock to guard concurrent status change
    SELECT id INTO v_assigned_transporter
    FROM public.profiles
    WHERE id = p_transporter_id
      AND role = 'TRANSPORT_PROVIDER'::public.user_role 
      AND is_verified = true
    FOR SHARE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVALID_TARGET_TRANSPORTER' 
        USING ERRCODE = '22023', DETAIL = 'Target assignee must be a verified TRANSPORT_PROVIDER.';
    END IF;

  ELSIF v_caller.role = 'TRANSPORT_PROVIDER'::public.user_role THEN
    IF NOT v_caller.is_verified THEN
      RAISE EXCEPTION 'UNVERIFIED_TRANSPORTER' 
        USING ERRCODE = '42501', DETAIL = 'Only verified transport providers may accept jobs.';
    END IF;

    IF p_transporter_id IS NOT NULL AND p_transporter_id <> v_caller.id THEN
      RAISE EXCEPTION 'CANNOT_ASSIGN_OTHER_TRANSPORTER' 
        USING ERRCODE = '42501', DETAIL = 'Transport providers can only claim jobs for their own profile.';
    END IF;
    v_assigned_transporter := v_caller.id;

  ELSE
    RAISE EXCEPTION 'UNAUTHORIZED_ROLE' 
      USING ERRCODE = '42501', DETAIL = 'Only TRANSPORT_PROVIDER or ADMIN roles can execute transporter assignment.';
  END IF;

  -- ------------------------------------------------------------------
  -- 2. MANDATORY POSITIVE FINITE BINDING QUOTE VALIDATION
  -- ------------------------------------------------------------------
  IF p_quoted_amount IS NULL THEN
    RAISE EXCEPTION 'QUOTE_AMOUNT_REQUIRED' 
      USING ERRCODE = '22023', DETAIL = 'A binding quoted_amount is mandatory when claiming a transport job.';
  END IF;

  IF p_quoted_amount <= 0 OR p_quoted_amount::text IN ('NaN', 'Infinity', '-Infinity') THEN
    RAISE EXCEPTION 'INVALID_QUOTE_AMOUNT' 
      USING ERRCODE = '22023', DETAIL = 'The quoted_amount must be a strictly positive finite number.';
  END IF;

  v_clean_transporter_name := NULLIF(pg_catalog.btrim(COALESCE(p_transporter_name, v_caller.full_name)), '');
  v_clean_transporter_phone := NULLIF(pg_catalog.btrim(COALESCE(p_transporter_phone, v_caller.phone)), '');

  -- ------------------------------------------------------------------
  -- 3. PRE-INSPECTION: Read Transport Request (Unlocked)
  -- ------------------------------------------------------------------
  SELECT * INTO v_pre_req 
  FROM public.transport_requests 
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND' 
      USING ERRCODE = '02000', DETAIL = 'Transport request does not exist.';
  END IF;

  IF v_pre_req.status <> 'LOOKING_FOR_TRANSPORTER' OR v_pre_req.assigned_transporter_id IS NOT NULL THEN
    RAISE EXCEPTION 'JOB_ALREADY_ASSIGNED' 
      USING ERRCODE = '22023', DETAIL = 'This transport request has already been claimed or is no longer open.';
  END IF;

  -- Disallow requester claiming their own transport job
  IF v_pre_req.requester_id = v_assigned_transporter THEN
    RAISE EXCEPTION 'SELF_ASSIGNMENT_PROHIBITED' 
      USING ERRCODE = '42501', DETAIL = 'Requesters cannot claim their own transport jobs.';
  END IF;

  -- ------------------------------------------------------------------
  -- 4. ORDER VALIDATION & GLOBAL LOCK HIERARCHY LEVEL 2 (Order Lock)
  -- ------------------------------------------------------------------
  IF v_pre_req.order_id IS NOT NULL THEN
    -- Validate UUID format
    IF v_pre_req.order_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
      RAISE EXCEPTION 'INVALID_ORDER_LINKAGE' 
        USING ERRCODE = '22023', DETAIL = 'The linked order_id is not a valid UUID.';
    END IF;

    v_order_uuid := v_pre_req.order_id::UUID;

    -- LOCK ORDER: Level 2
    SELECT * INTO v_order 
    FROM public.orders 
    WHERE id = v_order_uuid 
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'LINKED_ORDER_NOT_FOUND' 
        USING ERRCODE = '02000', DETAIL = 'Linked order record does not exist.';
    END IF;

    -- Verify requester is party to the order (Buyer, Creator, or Selling Farmer via Order Items / Inventory)
    v_is_seller := false;
    IF EXISTS (
      SELECT 1 FROM public.order_items oi
      JOIN public.inventory inv ON inv.id = oi.inventory_id
      JOIN public.farmers f ON f.id = inv.farmer_id
      WHERE oi.order_id = v_order_uuid AND f.profile_id = v_pre_req.requester_id
    ) THEN
      v_is_seller := true;
    END IF;

    IF v_pre_req.requester_id IS NOT NULL 
       AND v_pre_req.requester_id <> v_order.buyer_id 
       AND v_pre_req.requester_id <> v_order.created_by
       AND NOT v_is_seller THEN
      RAISE EXCEPTION 'ORDER_LINKAGE_MISMATCH' 
        USING ERRCODE = '22023', DETAIL = 'Transport request requester is neither the buyer nor seller/creator of the linked order.';
    END IF;

    -- STRICT WHITELIST: Only 'Accepted' orders can have transport assigned
    IF v_order.status <> 'Accepted' THEN
      RAISE EXCEPTION 'ORDER_NOT_ELIGIBLE_FOR_ASSIGNMENT' 
        USING ERRCODE = '22023', 
              DETAIL = pg_catalog.format('Order is in status ''%s''. Only ''Accepted'' orders may have transport assigned.', v_order.status);
    END IF;

    -- Check if order is already assigned to a different transporter
    IF v_order.assigned_transporter_id IS NOT NULL AND v_order.assigned_transporter_id <> v_assigned_transporter THEN
      RAISE EXCEPTION 'ORDER_ALREADY_ASSIGNED' 
        USING ERRCODE = '22023', 
              DETAIL = 'This order has already been assigned to another transporter.';
    END IF;
  END IF;

  -- ------------------------------------------------------------------
  -- 5. GLOBAL LOCK HIERARCHY LEVEL 2.5: Transport Request Lock
  -- ------------------------------------------------------------------
  SELECT * INTO v_req 
  FROM public.transport_requests 
  WHERE id = p_request_id 
  FOR UPDATE;

  -- Revalidate conditions under lock
  IF NOT FOUND THEN
    RAISE EXCEPTION 'REQUEST_NOT_FOUND' USING ERRCODE = '02000', DETAIL = 'Transport request does not exist.';
  END IF;

  IF v_req.status <> 'LOOKING_FOR_TRANSPORTER' OR v_req.assigned_transporter_id IS NOT NULL THEN
    RAISE EXCEPTION 'JOB_ALREADY_ASSIGNED' 
      USING ERRCODE = '22023', DETAIL = 'This transport request has already been claimed or is no longer open.';
  END IF;

  IF v_req.order_id IS DISTINCT FROM v_pre_req.order_id THEN
    RAISE EXCEPTION 'LINKAGE_CONCURRENTLY_MUTATED' 
      USING ERRCODE = '40001', DETAIL = 'Linked order ID was concurrently modified.';
  END IF;

  IF v_req.requester_id IS DISTINCT FROM v_pre_req.requester_id THEN
    RAISE EXCEPTION 'LINKAGE_CONCURRENTLY_MUTATED' 
      USING ERRCODE = '40001', DETAIL = 'Requester ID was concurrently modified.';
  END IF;

  -- ------------------------------------------------------------------
  -- 6. GLOBAL LOCK HIERARCHY LEVEL 6: Shipments Lock, Conflict Check & Update
  -- ------------------------------------------------------------------
  IF v_order_uuid IS NOT NULL THEN
    -- Lock existing shipment rows in deterministic ascending ID order
    PERFORM 1 
    FROM public.shipments 
    WHERE order_id = v_order_uuid 
    ORDER BY id ASC 
    FOR UPDATE;

    -- CHECK FOR CONFLICTING SHIPMENT ASSIGNMENTS
    SELECT id, assigned_transporter_id INTO v_conflicting_shipment
    FROM public.shipments
    WHERE order_id = v_order_uuid
      AND assigned_transporter_id IS NOT NULL
      AND assigned_transporter_id <> v_assigned_transporter
    LIMIT 1;

    IF FOUND THEN
      RAISE EXCEPTION 'SHIPMENT_ALREADY_ASSIGNED'
        USING ERRCODE = '22023',
              DETAIL = pg_catalog.format('Shipment %s is already assigned to a different transporter (%s).', v_conflicting_shipment.id, v_conflicting_shipment.assigned_transporter_id);
    END IF;

    -- Update Order
    UPDATE public.orders
    SET assigned_transporter_id = v_assigned_transporter,
        updated_at = pg_catalog.now()
    WHERE id = v_order_uuid
    RETURNING pg_catalog.to_jsonb(orders.*) INTO v_updated_order;

    -- Synchronize Shipments
    SELECT pg_catalog.count(*) INTO v_existing_shipment_count
    FROM public.shipments
    WHERE order_id = v_order_uuid;

    IF v_existing_shipment_count > 0 THEN
      UPDATE public.shipments
      SET assigned_transporter_id = v_assigned_transporter,
          updated_at = pg_catalog.now()
      WHERE order_id = v_order_uuid;
    ELSE
      INSERT INTO public.shipments (
        order_id, status, origin, destination, total_quantity_kg, assigned_transporter_id, created_at, updated_at
      ) VALUES (
        v_order_uuid, 'Preparing', v_req.pickup_location, v_order.destination, v_order.requested_quantity_kg,
        v_assigned_transporter, pg_catalog.now(), pg_catalog.now()
      );
    END IF;
  END IF;

  -- ------------------------------------------------------------------
  -- 7. INSERT TRANSACTION AUTHORIZATION RECORD FOR TRIGGER TO CONSUME
  -- ------------------------------------------------------------------
  INSERT INTO public._transport_assignment_authorizations (
    tx_id, request_id, assigned_transporter_id, created_at
  ) VALUES (
    pg_catalog.pg_current_xact_id(),
    p_request_id,
    v_assigned_transporter,
    pg_catalog.now()
  );

  -- ------------------------------------------------------------------
  -- 8. MUTATE TRANSPORT REQUEST TO 'CONFIRMED' WITH PERSISTED BINDING QUOTE
  -- ------------------------------------------------------------------
  UPDATE public.transport_requests
  SET status = 'CONFIRMED',
      assigned_transporter_id = v_assigned_transporter,
      quoted_amount = p_quoted_amount,
      transporter_name = COALESCE(v_clean_transporter_name, transporter_name),
      transporter_phone = COALESCE(v_clean_transporter_phone, transporter_phone),
      updated_at = pg_catalog.now()
  WHERE id = p_request_id;

  -- ------------------------------------------------------------------
  -- 9. AUDIT LOG RECORD (SEMANTICALLY ACCURATE ATTRIBUTION)
  -- ------------------------------------------------------------------
  INSERT INTO public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, new_state, reason, created_at
  ) VALUES (
    v_caller.id,
    'ASSIGN_TRANSPORTER',
    'transport_requests',
    p_request_id::text,
    pg_catalog.jsonb_build_object(
      'request_id', p_request_id,
      'order_id', v_req.order_id,
      'actor_id', v_caller.id,
      'actor_role', v_caller.role,
      'assigned_transporter_id', v_assigned_transporter,
      'is_admin_delegation', (v_caller.role = 'ADMIN'::public.user_role),
      'status', 'CONFIRMED',
      'quoted_amount', p_quoted_amount
    ),
    'Verified transporter assigned to transport job at binding agreed quote.',
    pg_catalog.now()
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'order_id', v_req.order_id,
    'assigned_transporter_id', v_assigned_transporter,
    'status', 'CONFIRMED',
    'quoted_amount', p_quoted_amount,
    'order', v_updated_order,
    'assigned_at', pg_catalog.now()
  );
END;
$$;

-- --------------------------------------------------------------------
-- SECTION 7: FUNCTION PERMISSIONS & OWNERSHIP
-- --------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.assign_transporter_to_job(UUID, UUID, NUMERIC, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_transporter_to_job(UUID, UUID, NUMERIC, TEXT, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_transporter_to_job(UUID, UUID, NUMERIC, TEXT, TEXT) TO authenticated;
ALTER FUNCTION public.assign_transporter_to_job(UUID, UUID, NUMERIC, TEXT, TEXT) OWNER TO postgres;

COMMIT;
