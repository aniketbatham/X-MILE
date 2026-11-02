-- ====================================================================
-- X-MILE MILESTONE 3 — REVISION 8: TRANSACTIONAL INTEGRITY MIGRATION
-- Target: Staging project gufyukekzkomxfhvtruf ONLY
-- Production project gnypyybrresuynparioj is STRICTLY OFF LIMITS
-- Fully Atomic: Wrapped entirely in BEGIN ... COMMIT transaction
-- Zero Overloads: Drops obsolete signatures before recreation
-- ====================================================================

BEGIN;

-- --------------------------------------------------------------------
-- SECTION 1: SCHEMA COMPATIBILITY & NON-DESTRUCTIVE ADDITIONS
-- --------------------------------------------------------------------

-- 1.1 Traceability and relationship columns on public.orders
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.produce_listings(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_id UUID REFERENCES public.buyer_offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_transporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT,
  ADD COLUMN IF NOT EXISTS request_hash TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_listing_id ON public.orders(listing_id);
CREATE INDEX IF NOT EXISTS idx_orders_offer_id ON public.orders(offer_id);
CREATE INDEX IF NOT EXISTS idx_orders_transporter ON public.orders(assigned_transporter_id);

-- 1.2 Transporter assignment on public.shipments
ALTER TABLE public.shipments 
  ADD COLUMN IF NOT EXISTS assigned_transporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shipments_transporter ON public.shipments(assigned_transporter_id);

-- 1.3 Traceability columns on public.buyer_offers
ALTER TABLE public.buyer_offers 
  ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_buyer_offers_order_id ON public.buyer_offers(order_id);

-- 1.4 Timestamps on public.produce_listings
ALTER TABLE public.produce_listings 
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- 1.5 Explicit listing link on public.inventory
ALTER TABLE public.inventory 
  ADD COLUMN IF NOT EXISTS listing_id UUID REFERENCES public.produce_listings(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_inventory_listing_id ON public.inventory(listing_id);

-- 1.6 Multi-actor, Multi-operation Idempotency infrastructure
ALTER TABLE public.order_idempotency_keys 
  ADD COLUMN IF NOT EXISTS actor_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS operation TEXT NOT NULL DEFAULT 'CREATE_ORDER',
  ADD COLUMN IF NOT EXISTS target_id UUID;

-- Backfill actor_id from buyer_id for existing idempotency records if present
UPDATE public.order_idempotency_keys 
SET actor_id = buyer_id 
WHERE actor_id IS NULL;

-- Allow buyer_id to be nullable so non-buyer transactions record actor_id cleanly
ALTER TABLE public.order_idempotency_keys 
  ALTER COLUMN buyer_id DROP NOT NULL;

-- Bound uniqueness constraint to (actor_id, operation, idempotency_key)
CREATE UNIQUE INDEX IF NOT EXISTS uq_idempotency_actor_op_key 
  ON public.order_idempotency_keys(actor_id, operation, idempotency_key);

CREATE INDEX IF NOT EXISTS idx_idempotency_target_lookup 
  ON public.order_idempotency_keys(target_id, operation);

-- 1.7 Private authorization ledger for offer acceptance
-- Inaccessible to anon, authenticated, AND service_role.
-- Only the table owner (postgres) executing within SECURITY DEFINER routines
-- can insert or delete authorization records.
CREATE TABLE IF NOT EXISTS public._offer_acceptance_authorizations (
  tx_id XID8 NOT NULL DEFAULT pg_catalog.pg_current_xact_id(),
  offer_id UUID NOT NULL REFERENCES public.buyer_offers(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT pg_catalog.now(),
  PRIMARY KEY (offer_id, order_id)
);

ALTER TABLE public._offer_acceptance_authorizations OWNER TO postgres;
ALTER TABLE public._offer_acceptance_authorizations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public._offer_acceptance_authorizations FROM PUBLIC, anon, authenticated, service_role;

-- 1.8 Harden RLS policies on public.buyer_offers (eliminate OR-based bypasses)
DROP POLICY IF EXISTS "Sellers can update offers for own listings" ON public.buyer_offers;
CREATE POLICY "Sellers can update offers for own listings" ON public.buyer_offers
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.produce_listings pl 
      WHERE pl.id = buyer_offers.listing_id 
        AND (pl.farmer_id = auth.uid() OR public.is_admin())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.produce_listings pl 
      WHERE pl.id = buyer_offers.listing_id 
        AND (pl.farmer_id = auth.uid() OR public.is_admin())
    )
    AND status = 'REJECTED'
  );

-- Replace over-permissive "Buyers manage offers" FOR ALL to prevent OR-based bypass
DROP POLICY IF EXISTS "Buyers manage offers" ON public.buyer_offers;
DROP POLICY IF EXISTS "Buyers insert offers" ON public.buyer_offers;
DROP POLICY IF EXISTS "Buyers update own offers" ON public.buyer_offers;
DROP POLICY IF EXISTS "Buyers delete own offers" ON public.buyer_offers;

CREATE POLICY "Buyers insert offers" ON public.buyer_offers
  FOR INSERT
  WITH CHECK (
    (buyer_id = auth.uid() OR public.is_admin())
    AND status = 'PENDING'
  );

CREATE POLICY "Buyers update own offers" ON public.buyer_offers
  FOR UPDATE
  USING (buyer_id = auth.uid() OR public.is_admin())
  WITH CHECK (
    (buyer_id = auth.uid() OR public.is_admin())
    AND status = 'CANCELLED'
  );

CREATE POLICY "Buyers delete own offers" ON public.buyer_offers
  FOR DELETE
  USING (
    (buyer_id = auth.uid() OR public.is_admin())
    AND status = 'PENDING'
  );

-- 1.9 Prevent RLS infinite recursion between orders and order_items
CREATE OR REPLACE FUNCTION public.farmer_participates_in_order(p_order_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.inventory inv ON inv.id = oi.inventory_id
    JOIN public.farmers f ON f.id = inv.farmer_id
    WHERE oi.order_id = p_order_id AND f.profile_id = p_user_id
  );
$$;

ALTER FUNCTION public.farmer_participates_in_order(UUID, UUID) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.farmer_participates_in_order(UUID, UUID) TO authenticated, service_role;

DROP POLICY IF EXISTS "Buyers and Admins view relevant orders" ON public.orders;
CREATE POLICY "Buyers and Admins view relevant orders"
  ON public.orders FOR SELECT
  USING (
    buyer_id = auth.uid()
    OR created_by = auth.uid()
    OR public.is_admin()
    OR public.farmer_participates_in_order(id, auth.uid())
  );

-- 1.10 Database-level BEFORE INSERT OR UPDATE trigger on public.buyer_offers
CREATE OR REPLACE FUNCTION public.enforce_buyer_offer_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_auth_count INTEGER;
BEGIN
  -- ------------------------------------------------------------------
  -- INSERT: New offers must always start as PENDING
  -- ------------------------------------------------------------------
  IF TG_OP = 'INSERT' THEN
    IF NEW.status IS DISTINCT FROM 'PENDING' THEN
      RAISE EXCEPTION 'INVALID_INITIAL_STATUS: New buyer offers must have status PENDING, received %', NEW.status
        USING ERRCODE = '22023';
    END IF;

    NEW.order_id := NULL;
    NEW.accepted_at := NULL;
    NEW.created_at := pg_catalog.now();
    NEW.updated_at := pg_catalog.now();

    RETURN NEW;
  END IF;

  -- ------------------------------------------------------------------
  -- UPDATE: Validate status transitions and referential integrity
  -- ------------------------------------------------------------------
  IF TG_OP = 'UPDATE' THEN
    -- 1. Check transition to 'ACCEPTED'
    IF NEW.status = 'ACCEPTED' AND (OLD.status IS DISTINCT FROM 'ACCEPTED') THEN
      -- Invariant A: Only PENDING offers can transition to ACCEPTED
      IF OLD.status <> 'PENDING' THEN
        RAISE EXCEPTION 'INVALID_OFFER_TRANSITION: Cannot accept offer % currently in % status', OLD.id, OLD.status
          USING ERRCODE = '22023';
      END IF;

      -- Invariant B: Must consume a private authorization record tied to this EXACT transaction
      DELETE FROM public._offer_acceptance_authorizations
      WHERE offer_id = NEW.id 
        AND order_id = NEW.order_id 
        AND tx_id = pg_catalog.pg_current_xact_id();

      GET DIAGNOSTICS v_auth_count = ROW_COUNT;
      IF v_auth_count != 1 THEN
        RAISE EXCEPTION 'DIRECT_ACCEPT_PROHIBITED: Buyer offers cannot be directly transitioned to ACCEPTED via table UPDATE. You must invoke accept_buyer_offer_and_create_order.'
          USING ERRCODE = '42501';
      END IF;

      -- Invariant C: order_id and accepted_at must be populated
      IF NEW.order_id IS NULL OR NEW.accepted_at IS NULL THEN
        RAISE EXCEPTION 'INVALID_ACCEPT_PAYLOAD: order_id and accepted_at must be populated when accepting offer %', OLD.id
          USING ERRCODE = '42501';
      END IF;

      -- Invariant D: Order must exist and link back to this offer
      IF NOT EXISTS (
        SELECT 1 FROM public.orders o
        WHERE o.id = NEW.order_id 
          AND o.offer_id = NEW.id
          AND o.status = 'Accepted'
      ) THEN
        RAISE EXCEPTION 'INVALID_ORDER_LINKAGE: Order % does not exist or does not reference offer %.', NEW.order_id, NEW.id
          USING ERRCODE = '23503';
      END IF;

      -- Invariant E: An order cannot be linked to more than one offer
      IF EXISTS (
        SELECT 1 FROM public.buyer_offers bo
        WHERE bo.order_id = NEW.order_id AND bo.id <> NEW.id
      ) THEN
        RAISE EXCEPTION 'DUPLICATE_ORDER_LINKAGE: Order % is already linked to another offer.', NEW.order_id
          USING ERRCODE = '23505';
      END IF;
    END IF;

    -- 2. Check transition to 'REJECTED' or 'CANCELLED' (Seller rejection or Buyer cancellation)
    IF (NEW.status IN ('REJECTED', 'CANCELLED')) AND (OLD.status IS DISTINCT FROM NEW.status) THEN
      -- Invariant A: Only PENDING offers can be rejected or cancelled
      IF OLD.status <> 'PENDING' THEN
        RAISE EXCEPTION 'INVALID_OFFER_TRANSITION: Cannot transition offer % with status % to %', OLD.id, OLD.status, NEW.status
          USING ERRCODE = '22023';
      END IF;

      -- Invariant B: Protected terms and ownership fields cannot be tampered with
      IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
         OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
         OR NEW.offered_quantity_kg IS DISTINCT FROM OLD.offered_quantity_kg
         OR NEW.offered_price_per_kg IS DISTINCT FROM OLD.offered_price_per_kg
         OR NEW.destination_city IS DISTINCT FROM OLD.destination_city
         OR NEW.payment_terms IS DISTINCT FROM OLD.payment_terms
         OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'PROTECTED_FIELD_TAMPERING: Cannot modify terms (buyer_id, listing_id, quantity, price, destination, terms) when updating offer %', OLD.id
          USING ERRCODE = '42501';
      END IF;

      -- Invariant C: Non-accepted offers must not have order_id or accepted_at
      IF NEW.order_id IS NOT NULL OR NEW.accepted_at IS NOT NULL THEN
        RAISE EXCEPTION 'INVALID_STATUS_PAYLOAD: order_id and accepted_at must remain NULL for % offer %', NEW.status, OLD.id
          USING ERRCODE = '42501';
      END IF;
    END IF;

    -- 3. Prevent modifying protected terms while offer remains PENDING
    IF OLD.status = 'PENDING' AND NEW.status = 'PENDING' THEN
      IF NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
         OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
         OR NEW.offered_quantity_kg IS DISTINCT FROM OLD.offered_quantity_kg
         OR NEW.offered_price_per_kg IS DISTINCT FROM OLD.offered_price_per_kg
         OR NEW.destination_city IS DISTINCT FROM OLD.destination_city
         OR NEW.payment_terms IS DISTINCT FROM OLD.payment_terms
         OR NEW.order_id IS NOT NULL
         OR NEW.accepted_at IS NOT NULL THEN
        RAISE EXCEPTION 'PROTECTED_FIELD_TAMPERING: Cannot modify terms or inject order_id/accepted_at on pending offer %', OLD.id
          USING ERRCODE = '42501';
      END IF;
    END IF;

    -- 4. Check immutability of already ACCEPTED offers
    IF OLD.status = 'ACCEPTED' THEN
      IF NEW.status IS DISTINCT FROM OLD.status
         OR NEW.order_id IS DISTINCT FROM OLD.order_id
         OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
         OR NEW.listing_id IS DISTINCT FROM OLD.listing_id
         OR NEW.buyer_id IS DISTINCT FROM OLD.buyer_id
         OR NEW.offered_quantity_kg IS DISTINCT FROM OLD.offered_quantity_kg
         OR NEW.offered_price_per_kg IS DISTINCT FROM OLD.offered_price_per_kg
         OR NEW.destination_city IS DISTINCT FROM OLD.destination_city
         OR NEW.payment_terms IS DISTINCT FROM OLD.payment_terms
         OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
        RAISE EXCEPTION 'IMMUTABLE_ACCEPTED_OFFER: Accepted offer % is immutable; status, order linkage, accepted_at, and all transaction terms cannot be modified.', OLD.id
          USING ERRCODE = '22023';
      END IF;
    END IF;

    -- 5. Check immutability of other terminal states
    IF OLD.status IN ('REJECTED', 'CANCELLED') THEN
      IF NEW.status IS DISTINCT FROM OLD.status THEN
        RAISE EXCEPTION 'IMMUTABLE_TERMINAL_OFFER: Offer % has terminal status % and cannot be transitioned to %.', OLD.id, OLD.status, NEW.status
          USING ERRCODE = '22023';
      END IF;
    END IF;

    NEW.updated_at := pg_catalog.now();
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION public.enforce_buyer_offer_transition() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_enforce_buyer_offer_transition ON public.buyer_offers;
CREATE TRIGGER trg_enforce_buyer_offer_transition
  BEFORE INSERT OR UPDATE ON public.buyer_offers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_buyer_offer_transition();


-- --------------------------------------------------------------------
-- SECTION 2: CLEANUP OF OBSOLETE FUNCTION OVERLOADS
-- --------------------------------------------------------------------
-- Drop Revision 7 11-parameter overload to ensure only one clean 10-parameter signature exists
DROP FUNCTION IF EXISTS public.create_and_reserve_order(
  UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT, UUID
);

-- Drop previous helper definitions before recreating with hardened signatures
DROP FUNCTION IF EXISTS public._validate_and_resolve_caller(UUID, public.user_role);
DROP FUNCTION IF EXISTS public.compute_canonical_hash(TEXT);
DROP FUNCTION IF EXISTS public.accept_buyer_offer_and_create_order(UUID, UUID, JSONB, TEXT, TEXT);

-- Drop legacy reserve_inventory_for_order before recreating with VOID return type (prevents 42P13)
DROP FUNCTION IF EXISTS public.reserve_inventory_for_order(JSONB, UUID);
DROP FUNCTION IF EXISTS public.reserve_inventory_for_order(UUID, JSONB);
DROP FUNCTION IF EXISTS public.reserve_inventory_for_order(UUID, UUID[]);


-- --------------------------------------------------------------------
-- SECTION 3: CANONICAL CRYPTOGRAPHIC SHA-256 HASH GENERATOR
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.compute_canonical_hash(p_payload TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_hash TEXT;
BEGIN
  IF p_payload IS NULL THEN
    RETURN NULL;
  END IF;

  -- 1. Native pg_catalog.sha256 (PostgreSQL 14+)
  BEGIN
    v_hash := pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_payload, 'UTF8')), 'hex');
    RETURN v_hash;
  EXCEPTION WHEN undefined_function THEN
    -- 2. pgcrypto digest in extensions schema
    BEGIN
      EXECUTE 'SELECT pg_catalog.encode(extensions.digest($1, ''sha256''), ''hex'')' INTO v_hash USING p_payload;
      RETURN v_hash;
    EXCEPTION WHEN undefined_function OR invalid_schema_name THEN
      -- 3. pgcrypto digest in public schema
      BEGIN
        EXECUTE 'SELECT pg_catalog.encode(public.digest($1, ''sha256''), ''hex'')' INTO v_hash USING p_payload;
        RETURN v_hash;
      EXCEPTION WHEN undefined_function THEN
        RAISE EXCEPTION 'NO_SHA256_FUNCTION_AVAILABLE: Neither pg_catalog.sha256 nor pgcrypto.digest is available in database.'
          USING ERRCODE = '0A000';
      END;
    END;
  END;
END;
$$;


-- --------------------------------------------------------------------
-- SECTION 4: NARROW ACTOR RESOLUTION HELPER
-- --------------------------------------------------------------------
-- Authoritative Caller Verification:
-- Extracts authenticated identity from PostgREST JWT context or privileged session.
-- Never trusts client-supplied actor UUID without JWT verification.
-- Rejects anonymous callers unconditionally.
-- Returns ONLY the minimal required fields (zero private profile leakage).
CREATE OR REPLACE FUNCTION public._validate_and_resolve_caller(
  p_actor_id UUID,
  p_expected_role public.user_role
)
RETURNS TABLE (
  actor_id UUID,
  role public.user_role,
  is_verified BOOLEAN,
  full_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_jwt_role TEXT;
  v_jwt_sub TEXT;
  v_session_user TEXT;
  v_auth_uid UUID;
  v_effective_id UUID;
  v_profile RECORD;
BEGIN
  v_jwt_role := COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), '');
  v_jwt_sub := NULLIF(current_setting('request.jwt.claim.sub', true), '');
  v_session_user := session_user;

  -- 1. Unconditionally reject anonymous callers
  IF v_jwt_role = 'anon' THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Anonymous callers are strictly prohibited.'
      USING ERRCODE = '42501';
  END IF;

  -- Authenticated role requires a valid non-empty JWT subject claim
  IF v_jwt_role = 'authenticated' AND v_jwt_sub IS NULL THEN
    RAISE EXCEPTION 'UNAUTHENTICATED_ACCESS: Missing authenticated JWT subject claim.'
      USING ERRCODE = '42501';
  END IF;

  -- Safely parse auth.uid()
  IF v_jwt_sub IS NOT NULL THEN
    BEGIN
      v_auth_uid := v_jwt_sub::uuid;
    EXCEPTION WHEN OTHERS THEN
      RAISE EXCEPTION 'MALFORMED_JWT_SUBJECT: Invalid UUID in auth subject claim.'
        USING ERRCODE = '22023';
    END;
  END IF;

  -- 2. Determine invocation pathway
  IF v_auth_uid IS NOT NULL THEN
    -- Path A: PostgREST JWT authenticated caller
    IF p_actor_id IS NOT NULL AND p_actor_id <> v_auth_uid THEN
      -- Impersonation check: Only verified ADMIN can supply a different actor ID
      SELECT p.role, p.is_verified INTO v_profile FROM public.profiles p WHERE p.id = v_auth_uid;
      IF NOT FOUND OR v_profile.role <> 'ADMIN'::public.user_role OR v_profile.is_verified IS NOT TRUE THEN
        RAISE EXCEPTION 'FORBIDDEN: Caller (%) cannot impersonate actor (%).', v_auth_uid, p_actor_id
          USING ERRCODE = '42501';
      END IF;
      -- Authenticated admin retains caller identity
      v_effective_id := v_auth_uid;
    ELSE
      v_effective_id := v_auth_uid;
    END IF;

  ELSIF v_jwt_role = 'service_role' OR v_session_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    -- Path B: Privileged backend server call (Next.js server-side route via service_role client)
    -- or direct database operator session (psql / pg test client)
    IF p_actor_id IS NULL THEN
      RAISE EXCEPTION 'ACTOR_ID_REQUIRED: Privileged execution must supply a valid actor profile ID.'
        USING ERRCODE = '22023';
    END IF;
    v_effective_id := p_actor_id;

  ELSE
    -- Path C: Unknown, unauthenticated or unauthorized database session
    RAISE EXCEPTION 'UNAUTHORIZED: Database session has no authenticated identity or service privilege.'
      USING ERRCODE = '42501';
  END IF;

  -- 3. Load authoritative profile
  SELECT p.id, p.role, p.is_verified, p.full_name
  INTO v_profile
  FROM public.profiles p
  WHERE p.id = v_effective_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CALLER_PROFILE_NOT_FOUND: Profile % does not exist.', v_effective_id
      USING ERRCODE = '28000';
  END IF;

  -- 4. Mandatory account verification check
  IF v_profile.is_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'CALLER_NOT_VERIFIED: Profile % is not verified.', v_effective_id
      USING ERRCODE = '42501';
  END IF;

  -- 5. Role validation
  IF p_expected_role IS NOT NULL THEN
    IF v_profile.role <> 'ADMIN'::public.user_role AND v_profile.role <> p_expected_role THEN
      RAISE EXCEPTION 'UNAUTHORIZED_ROLE: Caller role % cannot perform operations requiring %.', v_profile.role, p_expected_role
        USING ERRCODE = '42501';
    END IF;
  END IF;

  RETURN QUERY SELECT v_profile.id, v_profile.role, v_profile.is_verified, v_profile.full_name;
END;
$$;


-- --------------------------------------------------------------------
-- SECTION 5: BUYER CHECKOUT RPC (create_and_reserve_order)
-- --------------------------------------------------------------------
-- Replaces Migration 005 function with exact 10-parameter signature.
-- Enforces Global Lock Hierarchy: Level 0 (Advisory) -> Level 3 (Listing) -> Level 4 (Inventory ASC).
-- Strictly initializes fulfilled_quantity_kg = 0 and fulfillment_percentage = 0.
CREATE OR REPLACE FUNCTION public.create_and_reserve_order(
  p_actor_id UUID,
  p_buyer_id UUID,
  p_buyer_name TEXT,
  p_produce TEXT,
  p_requested_quantity NUMERIC,
  p_required_grade TEXT,
  p_destination TEXT,
  p_items JSONB,
  p_idempotency_key TEXT,
  p_request_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller RECORD;
  v_effective_buyer RECORD;
  v_listing public.produce_listings%ROWTYPE;
  v_target_listing_id UUID;
  v_existing_record RECORD;
  v_canonical_hash TEXT;
  v_canonical_string TEXT;
  v_sorted_items JSONB;
  v_total_allocated NUMERIC := 0;
  v_distinct_items_count INTEGER;
  v_total_items_count INTEGER;
  v_item RECORD;
  v_inv_row RECORD;
  v_order_id UUID;
  v_response_payload JSONB;
  v_rows_updated INTEGER;
BEGIN
  -- 1. Parameter validations
  IF p_buyer_id IS NULL THEN
    RAISE EXCEPTION 'BUYER_ID_REQUIRED' 
      USING ERRCODE = '22023', DETAIL = 'Buyer ID is mandatory.';
  END IF;

  IF p_idempotency_key IS NULL 
     OR pg_catalog.length(pg_catalog.btrim(p_idempotency_key)) = 0 
     OR pg_catalog.length(p_idempotency_key) > 255 
     OR p_idempotency_key !~ '^[a-zA-Z0-9_\-\.:]{1,255}$' THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_INVALID' 
      USING ERRCODE = '22023', DETAIL = 'A valid idempotency key (1-255 characters) is mandatory.';
  END IF;

  IF p_requested_quantity IS NULL OR p_requested_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_REQUESTED_QUANTITY' 
      USING ERRCODE = '22023', DETAIL = 'Requested quantity must be greater than zero.';
  END IF;

  IF p_required_grade IS NULL OR p_required_grade NOT IN ('A', 'B', 'C') THEN
    RAISE EXCEPTION 'INVALID_REQUIRED_GRADE' 
      USING ERRCODE = '22023', DETAIL = 'Required grade must be A, B, or C.';
  END IF;

  IF p_destination IS NULL OR pg_catalog.btrim(p_destination) = '' THEN
    RAISE EXCEPTION 'DESTINATION_REQUIRED' 
      USING ERRCODE = '22023', DETAIL = 'Destination delivery location is required.';
  END IF;

  IF p_items IS NULL OR pg_catalog.jsonb_typeof(p_items) != 'array' OR pg_catalog.jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_ITEMS_PAYLOAD' 
      USING ERRCODE = '22023', DETAIL = 'Selected inventory items allocation array is required.';
  END IF;

  v_total_items_count := pg_catalog.jsonb_array_length(p_items);
  IF v_total_items_count > 50 THEN
    RAISE EXCEPTION 'MAX_LOTS_EXCEEDED' 
      USING ERRCODE = '22023', DETAIL = 'Maximum 50 inventory lots can be reserved in a single order.';
  END IF;

  -- 2. Validate authenticated caller (Authoritative identity)
  SELECT * INTO v_caller FROM public._validate_and_resolve_caller(p_actor_id, 'BUYER'::public.user_role);

  -- 3. Resolve and validate target buyer profile independently
  IF p_buyer_id = v_caller.actor_id THEN
    v_effective_buyer := v_caller;
  ELSE
    -- Delegated procurement: only authenticated ADMIN can place orders on behalf of other buyers
    IF v_caller.role <> 'ADMIN'::public.user_role THEN
      RAISE EXCEPTION 'ADMIN_DELEGATION_REQUIRED' 
        USING ERRCODE = '42501', DETAIL = 'Only administrators can create orders on behalf of other buyers.';
    END IF;
    SELECT p.id AS actor_id, p.role, p.is_verified, p.full_name
    INTO v_effective_buyer 
    FROM public.profiles p 
    WHERE p.id = p_buyer_id;

    IF NOT FOUND OR v_effective_buyer.role <> 'BUYER'::public.user_role THEN
      RAISE EXCEPTION 'TARGET_BUYER_NOT_FOUND' 
        USING ERRCODE = '28000', DETAIL = 'Target buyer profile not found or role is not BUYER.';
    END IF;
    IF v_effective_buyer.is_verified IS NOT TRUE THEN
      RAISE EXCEPTION 'BUYER_NOT_VERIFIED' 
        USING ERRCODE = '42501', DETAIL = 'Target buyer account must be verified before placing orders.';
    END IF;
  END IF;

  -- 4. Normalize and sort allocations deterministically
  SELECT pg_catalog.count(DISTINCT (COALESCE(elem->>'inventory_id', elem->>'inventoryId'))::uuid)
  INTO v_distinct_items_count
  FROM pg_catalog.jsonb_array_elements(p_items) elem;

  IF v_distinct_items_count != v_total_items_count THEN
    RAISE EXCEPTION 'DUPLICATE_INVENTORY_ITEM' 
      USING ERRCODE = '22023', DETAIL = 'Duplicate inventory lot IDs are not permitted.';
  END IF;

  SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'inventory_id', (COALESCE(elem->>'inventory_id', elem->>'inventoryId'))::uuid,
      'quantity_kg', (COALESCE(elem->>'quantity_kg', elem->>'quantity', elem->>'allocatedQuantity'))::numeric,
      'listing_id', (elem->>'listing_id')::uuid
    ) ORDER BY (COALESCE(elem->>'inventory_id', elem->>'inventoryId'))::uuid ASC
  )
  INTO v_sorted_items
  FROM pg_catalog.jsonb_array_elements(p_items) elem;

  -- Validate each allocation quantity is finite and strictly positive
  FOR v_item IN
    SELECT (elem->>'quantity_kg')::numeric AS req_qty
    FROM pg_catalog.jsonb_array_elements(v_sorted_items) elem
  LOOP
    IF v_item.req_qty IS NULL OR v_item.req_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_ALLOCATED_QUANTITY' 
        USING ERRCODE = '22023', DETAIL = 'Each allocated inventory lot quantity must be strictly greater than zero.';
    END IF;
  END LOOP;

  SELECT COALESCE(pg_catalog.sum((elem->>'quantity_kg')::numeric), 0)
  INTO v_total_allocated
  FROM pg_catalog.jsonb_array_elements(v_sorted_items) elem;

  IF v_total_allocated != p_requested_quantity THEN
    RAISE EXCEPTION 'ALLOCATION_QUANTITY_MISMATCH' 
      USING ERRCODE = '22023', DETAIL = pg_catalog.format('Total allocated quantity (%s kg) does not match requested quantity (%s kg).', v_total_allocated, p_requested_quantity);
  END IF;

  -- 5. Resolve target listing ID from inventory lots
  -- Check if listing_id is provided in the first item or read from inventory table
  v_target_listing_id := (v_sorted_items->0->>'listing_id')::uuid;

  IF v_target_listing_id IS NULL THEN
    SELECT listing_id INTO v_target_listing_id
    FROM public.inventory
    WHERE id = (v_sorted_items->0->>'inventory_id')::uuid;
  END IF;

  IF v_target_listing_id IS NULL THEN
    RAISE EXCEPTION 'UNLINKED_INVENTORY_REJECTED'
      USING ERRCODE = '42501', DETAIL = 'Inventory lots must be linked to a valid produce listing.';
  END IF;

  -- 6. Canonical Hash calculation inside PostgreSQL
  v_canonical_string := pg_catalog.jsonb_build_object(
    'actor_id', v_caller.actor_id,
    'buyer_id', v_effective_buyer.actor_id,
    'destination', pg_catalog.btrim(p_destination),
    'items', v_sorted_items,
    'listing_id', v_target_listing_id,
    'operation', 'CREATE_ORDER',
    'produce', pg_catalog.lower(pg_catalog.btrim(p_produce)),
    'requested_quantity_kg', p_requested_quantity,
    'required_grade', pg_catalog.upper(pg_catalog.btrim(p_required_grade))
  )::text;

  v_canonical_hash := public.compute_canonical_hash(v_canonical_string);

  -- 7. Lock Hierarchy Level 0: Advisory lock scoped to caller and key
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('order_idempotency:' || v_caller.actor_id::text || ':' || p_idempotency_key)
  );

  -- 8. REPEAT IDEMPOTENCY LOOKUP AFTER LOCK ACQUISITION
  SELECT * INTO v_existing_record
  FROM public.order_idempotency_keys
  WHERE actor_id = v_caller.actor_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_record.operation <> 'CREATE_ORDER' THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED_FOR_DIFFERENT_OPERATION'
        USING ERRCODE = '23505', DETAIL = pg_catalog.format('Idempotency key %s was already used for operation %s.', p_idempotency_key, v_existing_record.operation);
    END IF;

    IF v_existing_record.target_id IS DISTINCT FROM v_target_listing_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED_FOR_DIFFERENT_TARGET'
        USING ERRCODE = '23505', DETAIL = pg_catalog.format('Idempotency key %s was used for target listing %s.', p_idempotency_key, v_existing_record.target_id);
    END IF;

    IF v_existing_record.request_hash <> v_canonical_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'
        USING ERRCODE = '23505', DETAIL = 'Idempotency key reused with a different request payload.';
    END IF;

    RETURN v_existing_record.response_payload;
  END IF;

  -- 9. Lock Hierarchy Level 3: Lock Produce Listing FOR UPDATE
  SELECT * INTO v_listing 
  FROM public.produce_listings 
  WHERE id = v_target_listing_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND' 
      USING ERRCODE = '02000', DETAIL = pg_catalog.format('Produce listing %s does not exist.', v_target_listing_id);
  END IF;

  IF v_listing.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'INVALID_LISTING_STATUS' 
      USING ERRCODE = '22023', DETAIL = pg_catalog.format('Produce listing %s is not active (status: %s).', v_target_listing_id, v_listing.status);
  END IF;

  IF pg_catalog.lower(pg_catalog.btrim(v_listing.crop_name)) <> pg_catalog.lower(pg_catalog.btrim(p_produce)) THEN
    RAISE EXCEPTION 'LISTING_PRODUCE_MISMATCH' 
      USING ERRCODE = '22023', DETAIL = pg_catalog.format('Listing crop (%s) does not match order produce (%s).', v_listing.crop_name, p_produce);
  END IF;

  IF v_listing.quantity_kg < p_requested_quantity THEN
    RAISE EXCEPTION 'INSUFFICIENT_LISTING_HEADROOM' 
      USING ERRCODE = '40001', DETAIL = pg_catalog.format('Listing %s headroom (%s kg) is less than requested (%s kg).', v_target_listing_id, v_listing.quantity_kg, p_requested_quantity);
  END IF;

  -- 10. Lock Hierarchy Level 4: Lock Inventory Lots in strictly deterministic ID ASC order
  FOR v_item IN
    SELECT 
      (elem->>'inventory_id')::uuid AS inv_id,
      (elem->>'quantity_kg')::numeric AS req_qty
    FROM pg_catalog.jsonb_array_elements(v_sorted_items) elem
    ORDER BY (elem->>'inventory_id')::uuid ASC
  LOOP
    SELECT inv.*, f.profile_id AS farm_profile_id
    INTO v_inv_row
    FROM public.inventory inv
    JOIN public.farmers f ON f.id = inv.farmer_id
    WHERE inv.id = v_item.inv_id
    FOR UPDATE OF inv;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_NOT_AVAILABLE' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Inventory lot %s is unavailable, reserved, or non-existent.', v_item.inv_id);
    END IF;

    IF v_inv_row.status <> 'AVAILABLE' OR v_inv_row.available IS NOT TRUE THEN
      RAISE EXCEPTION 'INVENTORY_NOT_AVAILABLE' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Inventory lot %s is not available (status: %s).', v_item.inv_id, v_inv_row.status);
    END IF;

    -- Strict Listing & Farmer Ownership verification
    IF v_inv_row.listing_id IS NULL THEN
      RAISE EXCEPTION 'UNLINKED_INVENTORY_REJECTED' 
        USING ERRCODE = '42501', DETAIL = pg_catalog.format('Inventory lot %s is not linked to any produce listing.', v_item.inv_id);
    END IF;

    IF v_inv_row.listing_id <> v_target_listing_id THEN
      RAISE EXCEPTION 'INVENTORY_FROM_ANOTHER_LISTING' 
        USING ERRCODE = '42501', DETAIL = pg_catalog.format('Inventory lot %s is linked to listing %s, not selected listing %s.', v_item.inv_id, v_inv_row.listing_id, v_target_listing_id);
    END IF;

    IF v_inv_row.farm_profile_id <> v_listing.farmer_id THEN
      RAISE EXCEPTION 'INVENTORY_FROM_ANOTHER_FARMER' 
        USING ERRCODE = '42501', DETAIL = pg_catalog.format('Inventory lot %s belongs to farmer profile %s, not listing owner %s.', v_item.inv_id, v_inv_row.farm_profile_id, v_listing.farmer_id);
    END IF;

    -- Produce compatibility check
    IF pg_catalog.lower(pg_catalog.btrim(v_inv_row.produce)) <> pg_catalog.lower(pg_catalog.btrim(p_produce)) THEN
      RAISE EXCEPTION 'PRODUCE_MISMATCH' 
        USING ERRCODE = '22023', DETAIL = pg_catalog.format('Lot %s produce (%s) does not match order (%s).', v_item.inv_id, v_inv_row.produce, p_produce);
    END IF;

    -- Quality Grade compatibility check
    IF p_required_grade = 'A' AND v_inv_row.quality_grade <> 'A' THEN
      RAISE EXCEPTION 'INVALID_GRADE' 
        USING ERRCODE = '22023', DETAIL = pg_catalog.format('Lot %s grade %s cannot satisfy Grade A requirement.', v_item.inv_id, v_inv_row.quality_grade);
    ELSIF p_required_grade = 'B' AND v_inv_row.quality_grade NOT IN ('A', 'B') THEN
      RAISE EXCEPTION 'INVALID_GRADE' 
        USING ERRCODE = '22023', DETAIL = pg_catalog.format('Lot %s grade %s cannot satisfy Grade B requirement.', v_item.inv_id, v_inv_row.quality_grade);
    END IF;

    -- Unreserved capacity check (null-safe)
    IF (COALESCE(v_inv_row.reserved_quantity_kg, 0) + v_item.req_qty) > v_inv_row.quantity_kg THEN
      RAISE EXCEPTION 'INSUFFICIENT_INVENTORY' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Insufficient unreserved capacity in lot %s (available: %s kg, requested: %s kg).', v_item.inv_id, v_inv_row.quantity_kg - v_inv_row.reserved_quantity_kg, v_item.req_qty);
    END IF;

    UPDATE public.inventory
    SET reserved_quantity_kg = COALESCE(reserved_quantity_kg, 0) + v_item.req_qty,
        status = CASE WHEN COALESCE(reserved_quantity_kg, 0) + v_item.req_qty >= quantity_kg THEN 'RESERVED' ELSE 'AVAILABLE' END,
        available = (COALESCE(reserved_quantity_kg, 0) + v_item.req_qty < quantity_kg),
        updated_at = pg_catalog.now()
    WHERE id = v_item.inv_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated != 1 THEN
      RAISE EXCEPTION 'CONCURRENT_MUTATION_FAILURE' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Failed to update inventory lot %s.', v_item.inv_id);
    END IF;
  END LOOP;

  -- 11. Decrement listing headroom transactionally
  UPDATE public.produce_listings
  SET quantity_kg = quantity_kg - p_requested_quantity,
      status = CASE WHEN quantity_kg - p_requested_quantity <= 0 THEN 'SOLD' ELSE 'ACTIVE' END,
      updated_at = pg_catalog.now()
  WHERE id = v_target_listing_id AND quantity_kg >= p_requested_quantity;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated != 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_LISTING_HEADROOM'
      USING ERRCODE = '40001', DETAIL = 'Listing headroom changed concurrently; order cannot be reserved.';
  END IF;

  -- 12. Insert Order strictly with zero initial fulfillment
  INSERT INTO public.orders (
    buyer_id,
    created_by,
    buyer_name,
    produce,
    requested_quantity_kg,
    required_grade,
    destination,
    listing_id,
    fulfilled_quantity_kg,
    fulfillment_percentage,
    status,
    idempotency_key,
    request_hash,
    created_at,
    updated_at
  ) VALUES (
    v_effective_buyer.actor_id,
    v_caller.actor_id,
    v_effective_buyer.full_name,
    p_produce,
    p_requested_quantity,
    p_required_grade,
    p_destination,
    v_target_listing_id,
    0,   -- Strictly zero initial fulfillment
    0,   -- Strictly zero initial fulfillment
    'Accepted',
    p_idempotency_key,
    v_canonical_hash,
    pg_catalog.now(),
    pg_catalog.now()
  ) RETURNING id INTO v_order_id;

  -- 13. Insert Order Items
  FOR v_item IN
    SELECT 
      (elem->>'inventory_id')::uuid AS inv_id,
      (elem->>'quantity_kg')::numeric AS req_qty
    FROM pg_catalog.jsonb_array_elements(v_sorted_items) elem
  LOOP
    INSERT INTO public.order_items (
      order_id,
      inventory_id,
      quantity_kg,
      created_at
    ) VALUES (
      v_order_id,
      v_item.inv_id,
      v_item.req_qty,
      pg_catalog.now()
    );
  END LOOP;

  -- 14. Audit log if delegated procurement
  IF v_caller.actor_id <> v_effective_buyer.actor_id THEN
    INSERT INTO public.admin_audit_logs (
      admin_id, action, entity_type, entity_id, new_state, reason, created_at
    ) VALUES (
      v_caller.actor_id,
      'DELEGATED_ORDER_CREATION',
      'orders',
      v_order_id::text,
      pg_catalog.jsonb_build_object(
        'actor_id', v_caller.actor_id,
        'buyer_id', v_effective_buyer.actor_id,
        'produce', p_produce,
        'quantity_kg', p_requested_quantity,
        'listing_id', v_target_listing_id
      ),
      'Administrator executed procurement order on behalf of buyer.',
      pg_catalog.now()
    );
  END IF;

  -- 15. Persist Idempotency Record & Return Stable Response
  v_response_payload := pg_catalog.jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'buyer_id', v_effective_buyer.actor_id,
    'created_by', v_caller.actor_id,
    'buyer_name', v_effective_buyer.full_name,
    'produce', p_produce,
    'requested_quantity_kg', p_requested_quantity,
    'fulfilled_quantity_kg', 0,
    'fulfillment_percentage', 0,
    'status', 'Accepted',
    'listing_id', v_target_listing_id,
    'lots_allocated_count', v_total_items_count,
    'idempotency_key', p_idempotency_key,
    'request_hash', v_canonical_hash,
    'created_at', pg_catalog.now()
  );

  INSERT INTO public.order_idempotency_keys (
    actor_id,
    buyer_id,
    idempotency_key,
    operation,
    target_id,
    request_hash,
    order_id,
    response_payload,
    created_at
  ) VALUES (
    v_caller.actor_id,
    v_effective_buyer.actor_id,
    p_idempotency_key,
    'CREATE_ORDER',
    v_target_listing_id,
    v_canonical_hash,
    v_order_id,
    v_response_payload,
    pg_catalog.now()
  );

  RETURN v_response_payload;
END;
$$;


-- --------------------------------------------------------------------
-- SECTION 6: FARMER OFFER ACCEPTANCE RPC (accept_buyer_offer_and_create_order)
-- --------------------------------------------------------------------
-- Enforces Global Lock Hierarchy: Level 0 (Advisory) -> Level 1 (Offer) -> Level 3 (Listing) -> Level 4 (Inventory ASC).
-- Atomically reserves inventory, creates order (0% fulfilled), transitions offer to ACCEPTED.
CREATE OR REPLACE FUNCTION public.accept_buyer_offer_and_create_order(
  p_actor_id UUID,
  p_offer_id UUID,
  p_items JSONB,
  p_idempotency_key TEXT,
  p_request_hash TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller RECORD;
  v_offer public.buyer_offers%ROWTYPE;
  v_buyer_profile RECORD;
  v_listing public.produce_listings%ROWTYPE;
  v_existing_record RECORD;
  v_canonical_hash TEXT;
  v_canonical_string TEXT;
  v_sorted_items JSONB;
  v_total_allocated NUMERIC := 0;
  v_distinct_items_count INTEGER;
  v_total_items_count INTEGER;
  v_item RECORD;
  v_inv_row RECORD;
  v_order_id UUID;
  v_response_payload JSONB;
  v_rows_updated INTEGER;
BEGIN
  -- 1. Parameter validations
  IF p_offer_id IS NULL THEN
    RAISE EXCEPTION 'OFFER_ID_REQUIRED' 
      USING ERRCODE = '22023', DETAIL = 'Buyer offer ID is mandatory.';
  END IF;

  IF p_idempotency_key IS NULL 
     OR pg_catalog.length(pg_catalog.btrim(p_idempotency_key)) = 0 
     OR pg_catalog.length(p_idempotency_key) > 255 
     OR p_idempotency_key !~ '^[a-zA-Z0-9_\-\.:]{1,255}$' THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_INVALID' 
      USING ERRCODE = '22023', DETAIL = 'A valid idempotency key (1-255 characters) is mandatory.';
  END IF;

  IF p_items IS NULL OR pg_catalog.jsonb_typeof(p_items) != 'array' OR pg_catalog.jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_ITEMS_PAYLOAD' 
      USING ERRCODE = '22023', DETAIL = 'Selected inventory items allocation array is required.';
  END IF;

  v_total_items_count := pg_catalog.jsonb_array_length(p_items);
  IF v_total_items_count > 50 THEN
    RAISE EXCEPTION 'MAX_LOTS_EXCEEDED' 
      USING ERRCODE = '22023', DETAIL = 'Maximum 50 inventory lots can be reserved.';
  END IF;

  -- 2. Validate authenticated farmer caller (Authoritative identity)
  SELECT * INTO v_caller FROM public._validate_and_resolve_caller(p_actor_id, 'FARMER'::public.user_role);

  -- 3. Lock Hierarchy Level 0: Advisory locks
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('offer_idempotency:' || v_caller.actor_id::text || ':' || p_idempotency_key)
  );
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtext('offer_lock:' || p_offer_id::text)
  );

  -- 4. Lock Hierarchy Level 1: Lock Buyer Offer FOR UPDATE
  SELECT * INTO v_offer 
  FROM public.buyer_offers 
  WHERE id = p_offer_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'OFFER_NOT_FOUND' 
      USING ERRCODE = '02000', DETAIL = pg_catalog.format('Buyer offer %s does not exist.', p_offer_id);
  END IF;

  -- 5. Normalize and sort allocations deterministically
  SELECT pg_catalog.count(DISTINCT (COALESCE(elem->>'inventory_id', elem->>'inventoryId'))::uuid)
  INTO v_distinct_items_count
  FROM pg_catalog.jsonb_array_elements(p_items) elem;

  IF v_distinct_items_count != v_total_items_count THEN
    RAISE EXCEPTION 'DUPLICATE_INVENTORY_ITEM' 
      USING ERRCODE = '22023', DETAIL = 'Duplicate inventory lot IDs are not permitted.';
  END IF;

  SELECT pg_catalog.jsonb_agg(
    pg_catalog.jsonb_build_object(
      'inventory_id', (COALESCE(elem->>'inventory_id', elem->>'inventoryId'))::uuid,
      'quantity_kg', (COALESCE(elem->>'quantity_kg', elem->>'quantity', elem->>'allocatedQuantity'))::numeric
    ) ORDER BY (COALESCE(elem->>'inventory_id', elem->>'inventoryId'))::uuid ASC
  )
  INTO v_sorted_items
  FROM pg_catalog.jsonb_array_elements(p_items) elem;

  -- Validate each allocation is strictly positive
  FOR v_item IN
    SELECT (elem->>'quantity_kg')::numeric AS req_qty
    FROM pg_catalog.jsonb_array_elements(v_sorted_items) elem
  LOOP
    IF v_item.req_qty IS NULL OR v_item.req_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_ALLOCATED_QUANTITY' 
        USING ERRCODE = '22023', DETAIL = 'Each allocated inventory lot quantity must be strictly greater than zero.';
    END IF;
  END LOOP;

  SELECT COALESCE(pg_catalog.sum((elem->>'quantity_kg')::numeric), 0)
  INTO v_total_allocated
  FROM pg_catalog.jsonb_array_elements(v_sorted_items) elem;

  IF v_total_allocated != v_offer.offered_quantity_kg THEN
    RAISE EXCEPTION 'ALLOCATION_QUANTITY_MISMATCH' 
      USING ERRCODE = '22023', DETAIL = pg_catalog.format('Total allocated quantity (%s kg) does not match offer quantity (%s kg).', v_total_allocated, v_offer.offered_quantity_kg);
  END IF;

  -- 6. Canonical Hash calculation for Offer Acceptance
  v_canonical_string := pg_catalog.jsonb_build_object(
    'actor_id', v_caller.actor_id,
    'buyer_id', v_offer.buyer_id,
    'items', v_sorted_items,
    'listing_id', v_offer.listing_id,
    'offer_id', v_offer.id,
    'offered_price_per_kg', v_offer.offered_price_per_kg,
    'offered_quantity_kg', v_offer.offered_quantity_kg,
    'operation', 'ACCEPT_OFFER'
  )::text;

  v_canonical_hash := public.compute_canonical_hash(v_canonical_string);

  -- 7. REPEAT IDEMPOTENCY LOOKUP AFTER LOCK ACQUISITION
  SELECT * INTO v_existing_record
  FROM public.order_idempotency_keys
  WHERE actor_id = v_caller.actor_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_record.operation <> 'ACCEPT_OFFER' THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED_FOR_DIFFERENT_OPERATION'
        USING ERRCODE = '23505', DETAIL = pg_catalog.format('Idempotency key %s was already used for operation %s.', p_idempotency_key, v_existing_record.operation);
    END IF;

    IF v_existing_record.target_id IS DISTINCT FROM p_offer_id THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_REUSED_FOR_DIFFERENT_TARGET'
        USING ERRCODE = '23505', DETAIL = pg_catalog.format('Idempotency key %s was used for offer target %s.', p_idempotency_key, v_existing_record.target_id);
    END IF;

    IF v_existing_record.request_hash <> v_canonical_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'
        USING ERRCODE = '23505', DETAIL = 'Idempotency key reused with a different request payload.';
    END IF;

    RETURN v_existing_record.response_payload;
  END IF;

  -- 8. Validate Offer Status
  IF v_offer.status = 'ACCEPTED' THEN
    RAISE EXCEPTION 'OFFER_ALREADY_ACCEPTED'
      USING ERRCODE = '22023', DETAIL = 'Buyer offer has already been accepted.';
  ELSIF v_offer.status <> 'PENDING' AND v_offer.status <> 'COUNTERED' THEN
    RAISE EXCEPTION 'INVALID_OFFER_STATUS' 
      USING ERRCODE = '22023', DETAIL = pg_catalog.format('Offer %s is not pending (status: %s).', p_offer_id, v_offer.status);
  END IF;

  -- 9. Validate Target Buyer Profile
  SELECT p.id, p.role, p.is_verified, p.full_name
  INTO v_buyer_profile 
  FROM public.profiles p 
  WHERE p.id = v_offer.buyer_id;

  IF NOT FOUND OR v_buyer_profile.role <> 'BUYER'::public.user_role THEN
    RAISE EXCEPTION 'BUYER_ROLE_VALIDATION_FAILED' 
      USING ERRCODE = '28000', DETAIL = 'Offering party is not a valid profile with BUYER role.';
  END IF;

  IF v_buyer_profile.is_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'BUYER_NOT_VERIFIED' 
      USING ERRCODE = '42501', DETAIL = 'Buyer account is not verified.';
  END IF;

  -- 10. Lock Hierarchy Level 3: Lock Produce Listing FOR UPDATE
  SELECT * INTO v_listing 
  FROM public.produce_listings 
  WHERE id = v_offer.listing_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'LISTING_NOT_FOUND' 
      USING ERRCODE = '02000', DETAIL = 'Listing associated with this offer does not exist.';
  END IF;

  -- Enforce Listing Ownership
  IF v_caller.role <> 'ADMIN'::public.user_role THEN
    IF v_listing.farmer_id <> v_caller.actor_id THEN
      RAISE EXCEPTION 'NOT_LISTING_OWNER' 
        USING ERRCODE = '42501', DETAIL = pg_catalog.format('Authenticated farmer (%s) does not own listing (%s).', v_caller.actor_id, v_listing.id);
    END IF;
  END IF;

  IF v_listing.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'INVALID_LISTING_STATUS' 
      USING ERRCODE = '22023', DETAIL = pg_catalog.format('Produce listing %s is not active (status: %s).', v_listing.id, v_listing.status);
  END IF;

  IF v_listing.quantity_kg < v_offer.offered_quantity_kg THEN
    RAISE EXCEPTION 'INSUFFICIENT_LISTING_HEADROOM' 
      USING ERRCODE = '40001', DETAIL = pg_catalog.format('Listing headroom (%s kg) is less than offer quantity (%s kg).', v_listing.quantity_kg, v_offer.offered_quantity_kg);
  END IF;

  -- 11. Lock Hierarchy Level 4: Lock Inventory Lots in strictly deterministic ID ASC order
  FOR v_item IN
    SELECT 
      (elem->>'inventory_id')::uuid AS inv_id,
      (elem->>'quantity_kg')::numeric AS req_qty
    FROM pg_catalog.jsonb_array_elements(v_sorted_items) elem
    ORDER BY (elem->>'inventory_id')::uuid ASC
  LOOP
    SELECT inv.*, f.profile_id AS farm_profile_id
    INTO v_inv_row
    FROM public.inventory inv
    JOIN public.farmers f ON f.id = inv.farmer_id
    WHERE inv.id = v_item.inv_id
    FOR UPDATE OF inv;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_NOT_AVAILABLE' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Inventory lot %s is unavailable, reserved, or non-existent.', v_item.inv_id);
    END IF;

    IF v_inv_row.status <> 'AVAILABLE' OR v_inv_row.available IS NOT TRUE THEN
      RAISE EXCEPTION 'INVENTORY_NOT_AVAILABLE' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Inventory lot %s is not available (status: %s).', v_item.inv_id, v_inv_row.status);
    END IF;

    -- Strict Listing & Farmer Ownership verification
    IF v_inv_row.listing_id IS NULL THEN
      RAISE EXCEPTION 'UNLINKED_INVENTORY_REJECTED' 
        USING ERRCODE = '42501', DETAIL = pg_catalog.format('Inventory lot %s is not linked to any produce listing.', v_item.inv_id);
    END IF;

    IF v_inv_row.listing_id <> v_listing.id THEN
      RAISE EXCEPTION 'INVENTORY_FROM_ANOTHER_LISTING' 
        USING ERRCODE = '42501', DETAIL = pg_catalog.format('Inventory lot %s is linked to listing %s, not offer listing %s.', v_item.inv_id, v_inv_row.listing_id, v_listing.id);
    END IF;

    IF v_inv_row.farm_profile_id <> v_listing.farmer_id THEN
      RAISE EXCEPTION 'INVENTORY_FROM_ANOTHER_FARMER' 
        USING ERRCODE = '42501', DETAIL = pg_catalog.format('Inventory lot %s belongs to farmer %s, not listing owner %s.', v_item.inv_id, v_inv_row.farm_profile_id, v_listing.farmer_id);
    END IF;

    -- Produce compatibility check
    IF pg_catalog.lower(pg_catalog.btrim(v_inv_row.produce)) <> pg_catalog.lower(pg_catalog.btrim(v_listing.crop_name)) THEN
      RAISE EXCEPTION 'PRODUCE_MISMATCH' 
        USING ERRCODE = '22023', DETAIL = pg_catalog.format('Lot %s produce (%s) does not match listing (%s).', v_item.inv_id, v_inv_row.produce, v_listing.crop_name);
    END IF;

    -- Quality Grade compatibility check
    IF v_inv_row.quality_grade <> v_listing.quality_grade THEN
      RAISE EXCEPTION 'INVALID_GRADE' 
        USING ERRCODE = '22023', DETAIL = pg_catalog.format('Lot %s grade %s does not match listing grade %s.', v_item.inv_id, v_inv_row.quality_grade, v_listing.quality_grade);
    END IF;

    -- Unreserved capacity check (null-safe)
    IF (COALESCE(v_inv_row.reserved_quantity_kg, 0) + v_item.req_qty) > v_inv_row.quantity_kg THEN
      RAISE EXCEPTION 'INSUFFICIENT_INVENTORY' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Insufficient unreserved capacity in lot %s (available: %s kg, requested: %s kg).', v_item.inv_id, v_inv_row.quantity_kg - v_inv_row.reserved_quantity_kg, v_item.req_qty);
    END IF;

    UPDATE public.inventory
    SET reserved_quantity_kg = COALESCE(reserved_quantity_kg, 0) + v_item.req_qty,
        status = CASE WHEN COALESCE(reserved_quantity_kg, 0) + v_item.req_qty >= quantity_kg THEN 'RESERVED' ELSE 'AVAILABLE' END,
        available = (COALESCE(reserved_quantity_kg, 0) + v_item.req_qty < quantity_kg),
        updated_at = pg_catalog.now()
    WHERE id = v_item.inv_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated != 1 THEN
      RAISE EXCEPTION 'CONCURRENT_MUTATION_FAILURE' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Failed to update inventory lot %s.', v_item.inv_id);
    END IF;
  END LOOP;

  -- 12. Decrement listing headroom transactionally
  UPDATE public.produce_listings
  SET quantity_kg = quantity_kg - v_offer.offered_quantity_kg,
      status = CASE WHEN quantity_kg - v_offer.offered_quantity_kg <= 0 THEN 'SOLD' ELSE 'ACTIVE' END,
      updated_at = pg_catalog.now()
  WHERE id = v_listing.id AND quantity_kg >= v_offer.offered_quantity_kg;

  GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
  IF v_rows_updated != 1 THEN
    RAISE EXCEPTION 'INSUFFICIENT_LISTING_HEADROOM'
      USING ERRCODE = '40001', DETAIL = 'Listing headroom changed concurrently; offer cannot be accepted.';
  END IF;

  -- 13. Insert Order with zero initial fulfillment
  INSERT INTO public.orders (
    buyer_id,
    created_by,
    buyer_name,
    produce,
    requested_quantity_kg,
    required_grade,
    destination,
    listing_id,
    offer_id,
    price_per_kg,
    fulfilled_quantity_kg,
    fulfillment_percentage,
    status,
    idempotency_key,
    request_hash,
    created_at,
    updated_at
  ) VALUES (
    v_buyer_profile.id,
    v_caller.actor_id,
    v_buyer_profile.full_name,
    v_listing.crop_name,
    v_offer.offered_quantity_kg,
    v_listing.quality_grade,
    v_offer.destination_city,
    v_listing.id,
    v_offer.id,
    v_offer.offered_price_per_kg,
    0,   -- Strictly zero initial fulfillment
    0,   -- Strictly zero initial fulfillment
    'Accepted',
    p_idempotency_key,
    v_canonical_hash,
    pg_catalog.now(),
    pg_catalog.now()
  ) RETURNING id INTO v_order_id;

  -- 14. Insert Order Items
  FOR v_item IN
    SELECT 
      (elem->>'inventory_id')::uuid AS inv_id,
      (elem->>'quantity_kg')::numeric AS req_qty
    FROM pg_catalog.jsonb_array_elements(v_sorted_items) elem
  LOOP
    INSERT INTO public.order_items (
      order_id,
      inventory_id,
      quantity_kg,
      created_at
    ) VALUES (
      v_order_id,
      v_item.inv_id,
      v_item.req_qty,
      pg_catalog.now()
    );
  END LOOP;

  -- 15. Transition Offer Status and link created Order
  -- Create private transaction-bound authorization record in protected ledger
  INSERT INTO public._offer_acceptance_authorizations (
    tx_id, offer_id, order_id, created_at
  ) VALUES (
    pg_catalog.pg_current_xact_id(),
    v_offer.id,
    v_order_id,
    pg_catalog.now()
  );

  UPDATE public.buyer_offers
  SET status = 'ACCEPTED',
      order_id = v_order_id,
      accepted_at = pg_catalog.now(),
      updated_at = pg_catalog.now()
  WHERE id = v_offer.id;

  -- 16. Audit log if administrative execution
  IF v_caller.role = 'ADMIN'::public.user_role THEN
    INSERT INTO public.admin_audit_logs (
      admin_id, action, entity_type, entity_id, new_state, reason, created_at
    ) VALUES (
      v_caller.actor_id,
      'ADMIN_OFFER_ACCEPTANCE',
      'buyer_offers',
      v_offer.id::text,
      pg_catalog.jsonb_build_object(
        'order_id', v_order_id,
        'farmer_id', v_listing.farmer_id,
        'buyer_id', v_buyer_profile.id,
        'quantity_kg', v_offer.offered_quantity_kg,
        'price_per_kg', v_offer.offered_price_per_kg
      ),
      'Administrator accepted buyer offer on behalf of seller.',
      pg_catalog.now()
    );
  END IF;

  -- 17. Persist Idempotency Record & Return Stable Response
  v_response_payload := pg_catalog.jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'offer_id', v_offer.id,
    'buyer_id', v_buyer_profile.id,
    'seller_id', v_listing.farmer_id,
    'produce', v_listing.crop_name,
    'requested_quantity_kg', v_offer.offered_quantity_kg,
    'price_per_kg', v_offer.offered_price_per_kg,
    'fulfilled_quantity_kg', 0,
    'fulfillment_percentage', 0,
    'status', 'Accepted',
    'listing_id', v_listing.id,
    'lots_allocated_count', v_total_items_count,
    'idempotency_key', p_idempotency_key,
    'request_hash', v_canonical_hash,
    'accepted_at', pg_catalog.now()
  );

  INSERT INTO public.order_idempotency_keys (
    actor_id,
    buyer_id,
    idempotency_key,
    operation,
    target_id,
    request_hash,
    order_id,
    response_payload,
    created_at
  ) VALUES (
    v_caller.actor_id,
    v_buyer_profile.id,
    p_idempotency_key,
    'ACCEPT_OFFER',
    p_offer_id,
    v_canonical_hash,
    v_order_id,
    v_response_payload,
    pg_catalog.now()
  );

  RETURN v_response_payload;
END;
$$;


-- --------------------------------------------------------------------
-- SECTION 7: ORDER CANCELLATION RPC (cancel_order_and_release_inventory)
-- --------------------------------------------------------------------
-- Enforces Global Lock Hierarchy: Level 2 (Order) -> Level 3 (Listing) -> Level 4 (Inventory ASC) -> Level 6 (Shipments ASC).
-- Preserves deliberate farmer state: Only SOLD listings are returned to ACTIVE.
CREATE OR REPLACE FUNCTION public.cancel_order_and_release_inventory(
  p_actor_id UUID,
  p_order_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller RECORD;
  v_order public.orders%ROWTYPE;
  v_listing public.produce_listings%ROWTYPE;
  v_item RECORD;
  v_inv_row public.inventory%ROWTYPE;
  v_total_released NUMERIC := 0;
  v_items_count INTEGER := 0;
  v_rows_updated INTEGER;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ORDER_ID_REQUIRED' 
      USING ERRCODE = '22023', DETAIL = 'Order ID is required.';
  END IF;

  -- 1. Validate authenticated caller
  SELECT * INTO v_caller FROM public._validate_and_resolve_caller(p_actor_id, NULL);

  -- 2. Lock Hierarchy Level 2: Lock Order FOR UPDATE
  SELECT * INTO v_order 
  FROM public.orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' 
      USING ERRCODE = '02000', DETAIL = pg_catalog.format('Order %s does not exist.', p_order_id);
  END IF;

  -- 3. Idempotent short-circuit
  IF v_order.status = 'Cancelled' THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', true,
      'order_id', p_order_id,
      'status', 'Cancelled',
      'already_cancelled', true,
      'released_quantity_kg', 0,
      'items_released', 0,
      'cancelled_at', v_order.updated_at
    );
  END IF;

  -- 4. Lifecycle state validation: Only 'Accepted' orders can be cancelled
  IF v_order.status <> 'Accepted' THEN
    RAISE EXCEPTION 'ORDER_NOT_CANCELLABLE' 
      USING ERRCODE = '22023', DETAIL = pg_catalog.format('Order %s cannot be cancelled from status %s. Only Accepted orders can be cancelled.', p_order_id, v_order.status);
  END IF;

  -- 5. Authorization: Only the purchasing buyer or an ADMIN may cancel
  IF v_caller.role <> 'ADMIN'::public.user_role THEN
    IF v_order.buyer_id IS NULL OR v_order.buyer_id <> v_caller.actor_id THEN
      RAISE EXCEPTION 'UNAUTHORIZED_CANCELLATION' 
        USING ERRCODE = '42501', DETAIL = 'Only the purchasing buyer or an administrator may cancel this order.';
    END IF;
  END IF;

  -- 6. Lock Hierarchy Level 3: Lock and Restore Listing Headroom
  IF v_order.listing_id IS NOT NULL THEN
    SELECT * INTO v_listing 
    FROM public.produce_listings 
    WHERE id = v_order.listing_id 
    FOR UPDATE;

    IF FOUND THEN
      UPDATE public.produce_listings
      SET quantity_kg = quantity_kg + v_order.requested_quantity_kg,
          status = CASE 
            WHEN status = 'SOLD' THEN 'ACTIVE' 
            ELSE status -- Preserves deliberate PAUSED or CANCELLED status
          END,
          updated_at = pg_catalog.now()
      WHERE id = v_order.listing_id;
    END IF;
  END IF;

  -- 7. Lock Hierarchy Level 4: Lock and Release inventory lots in deterministic ID ASC order
  FOR v_item IN
    SELECT inventory_id, quantity_kg
    FROM public.order_items
    WHERE order_id = p_order_id
    ORDER BY inventory_id ASC
  LOOP
    SELECT * INTO v_inv_row
    FROM public.inventory
    WHERE id = v_item.inventory_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_LOT_MISSING' 
        USING ERRCODE = '02000', DETAIL = pg_catalog.format('Inventory lot %s linked to order item not found.', v_item.inventory_id);
    END IF;

    IF COALESCE(v_inv_row.reserved_quantity_kg, 0) < v_item.quantity_kg THEN
      RAISE EXCEPTION 'RESERVATION_UNDERFLOW' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Inventory lot %s reserved counter (%s kg) is less than item allocation (%s kg).', v_item.inventory_id, v_inv_row.reserved_quantity_kg, v_item.quantity_kg);
    END IF;

    UPDATE public.inventory
    SET reserved_quantity_kg = COALESCE(reserved_quantity_kg, 0) - v_item.quantity_kg,
        status = CASE 
          WHEN (COALESCE(reserved_quantity_kg, 0) - v_item.quantity_kg) < quantity_kg THEN 'AVAILABLE' 
          ELSE 'RESERVED' 
        END,
        available = ((COALESCE(reserved_quantity_kg, 0) - v_item.quantity_kg) < quantity_kg),
        updated_at = pg_catalog.now()
    WHERE id = v_item.inventory_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated != 1 THEN
      RAISE EXCEPTION 'CONCURRENT_MUTATION_FAILURE' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Failed to release reservation on lot %s.', v_item.inventory_id);
    END IF;

    v_total_released := v_total_released + v_item.quantity_kg;
    v_items_count := v_items_count + 1;
  END LOOP;

  -- 8. Lock Hierarchy Level 6: Fail preparing shipments
  UPDATE public.shipments
  SET status = 'Failed',
      updated_at = pg_catalog.now()
  WHERE order_id = p_order_id AND status = 'Preparing';

  -- 9. Update Order status
  UPDATE public.orders
  SET status = 'Cancelled',
      updated_at = pg_catalog.now()
  WHERE id = p_order_id;

  -- 10. Audit log
  IF v_caller.role = 'ADMIN'::public.user_role OR p_reason IS NOT NULL THEN
    INSERT INTO public.admin_audit_logs (
      admin_id, action, entity_type, entity_id, new_state, reason, created_at
    ) VALUES (
      v_caller.actor_id,
      'CANCEL_ORDER',
      'orders',
      p_order_id::text,
      pg_catalog.jsonb_build_object(
        'previous_status', v_order.status,
        'status', 'Cancelled',
        'released_quantity_kg', v_total_released,
        'items_count', v_items_count
      ),
      COALESCE(p_reason, 'Order cancelled and reservations released.'),
      pg_catalog.now()
    );
  END IF;

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'Cancelled',
    'already_cancelled', false,
    'released_quantity_kg', v_total_released,
    'items_released', v_items_count,
    'cancelled_at', pg_catalog.now()
  );
END;
$$;


-- --------------------------------------------------------------------
-- SECTION 8: ORDER DISPATCH RPC (dispatch_order)
-- --------------------------------------------------------------------
-- Enforces Global Lock Hierarchy: Level 2 (Order) -> Level 6 (Shipments ASC).
-- Enforces authoritative transporter assignment consistency.
CREATE OR REPLACE FUNCTION public.dispatch_order(
  p_actor_id UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller RECORD;
  v_order public.orders%ROWTYPE;
  v_listing public.produce_listings%ROWTYPE;
  v_is_seller BOOLEAN := false;
  v_is_assigned_transporter BOOLEAN := false;
  v_total_shipments INTEGER := 0;
  v_shipments_updated INTEGER := 0;
  v_updated_order JSONB;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ORDER_ID_REQUIRED' 
      USING ERRCODE = '22023', DETAIL = 'Order ID is required.';
  END IF;

  -- 1. Validate authenticated caller
  SELECT * INTO v_caller FROM public._validate_and_resolve_caller(p_actor_id, NULL);

  -- 2. Lock Hierarchy Level 2: Lock Order FOR UPDATE
  SELECT * INTO v_order 
  FROM public.orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' 
      USING ERRCODE = '02000', DETAIL = pg_catalog.format('Order %s does not exist.', p_order_id);
  END IF;

  -- 3. Idempotent short-circuit
  IF v_order.status = 'Dispatched' THEN
    SELECT pg_catalog.to_jsonb(orders.*) INTO v_updated_order 
    FROM public.orders WHERE id = p_order_id;

    RETURN pg_catalog.jsonb_build_object(
      'success', true,
      'order_id', p_order_id,
      'status', 'Dispatched',
      'already_dispatched', true,
      'order', v_updated_order,
      'shipments_dispatched', 0,
      'dispatched_at', v_order.updated_at
    );
  END IF;

  -- 4. Lifecycle state validation
  IF v_order.status <> 'Accepted' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION' 
      USING ERRCODE = '22023', DETAIL = pg_catalog.format('Cannot dispatch order %s in status %s. Only Accepted orders can be dispatched.', p_order_id, v_order.status);
  END IF;

  -- 5. Authorization Model Enforcement:
  --   a. Verified ADMIN
  --   b. Verified Selling Farmer who owns the listing or inventory lots
  --   c. Verified Assigned Transporter
  IF v_caller.role = 'ADMIN'::public.user_role THEN
    NULL;
  ELSIF v_caller.role = 'FARMER'::public.user_role THEN
    IF v_order.listing_id IS NOT NULL THEN
      SELECT * INTO v_listing FROM public.produce_listings WHERE id = v_order.listing_id;
      IF FOUND AND v_listing.farmer_id = v_caller.actor_id THEN
        v_is_seller := true;
      END IF;
    END IF;

    IF NOT v_is_seller THEN
      IF EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.inventory inv ON inv.id = oi.inventory_id
        JOIN public.farmers f ON f.id = inv.farmer_id
        WHERE oi.order_id = p_order_id AND f.profile_id = v_caller.actor_id
      ) THEN
        v_is_seller := true;
      END IF;
    END IF;

    IF NOT v_is_seller THEN
      RAISE EXCEPTION 'UNAUTHORIZED_DISPATCH' 
        USING ERRCODE = '42501', DETAIL = 'Forbidden: Only the selling farmer or administrator may dispatch this order.';
    END IF;

  ELSIF v_caller.role = 'TRANSPORT_PROVIDER'::public.user_role THEN
    -- Transporter Assignment Precedence & Consistency
    IF v_order.assigned_transporter_id IS NOT NULL AND v_order.assigned_transporter_id = v_caller.actor_id THEN
      v_is_assigned_transporter := true;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.shipments 
      WHERE order_id = p_order_id AND assigned_transporter_id = v_caller.actor_id
    ) THEN
      v_is_assigned_transporter := true;
    END IF;

    IF NOT v_is_assigned_transporter THEN
      RAISE EXCEPTION 'UNAUTHORIZED_TRANSPORTER' 
        USING ERRCODE = '42501', DETAIL = 'Forbidden: Transporter is not assigned to this order or shipment.';
    END IF;

  ELSE
    RAISE EXCEPTION 'UNAUTHORIZED_DISPATCH' 
      USING ERRCODE = '42501', DETAIL = pg_catalog.format('Caller role %s is not authorized to dispatch orders.', v_caller.role);
  END IF;

  -- 6. Lock Hierarchy Level 6: Lock and transition shipments in deterministic ID ASC order
  SELECT pg_catalog.count(*) INTO v_total_shipments
  FROM public.shipments
  WHERE order_id = p_order_id;

  IF v_total_shipments = 0 THEN
    INSERT INTO public.shipments (
      order_id, status, origin, destination, total_quantity_kg, assigned_transporter_id, created_at, updated_at
    ) VALUES (
      p_order_id, 'In Transit', 'Farm Gate', v_order.destination, v_order.requested_quantity_kg, 
      COALESCE(v_order.assigned_transporter_id, CASE WHEN v_caller.role = 'TRANSPORT_PROVIDER'::public.user_role THEN v_caller.actor_id ELSE NULL END),
      pg_catalog.now(), pg_catalog.now()
    );
    v_shipments_updated := 1;
  ELSE
    UPDATE public.shipments
    SET status = 'In Transit',
        assigned_transporter_id = COALESCE(assigned_transporter_id, v_order.assigned_transporter_id, CASE WHEN v_caller.role = 'TRANSPORT_PROVIDER'::public.user_role THEN v_caller.actor_id ELSE NULL END),
        updated_at = pg_catalog.now()
    WHERE order_id = p_order_id AND status = 'Preparing';

    GET DIAGNOSTICS v_shipments_updated = ROW_COUNT;
  END IF;

  -- 7. Update Order status
  UPDATE public.orders
  SET status = 'Dispatched',
      updated_at = pg_catalog.now()
  WHERE id = p_order_id
  RETURNING pg_catalog.to_jsonb(orders.*) INTO v_updated_order;

  -- 8. Audit log
  INSERT INTO public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, new_state, reason, created_at
  ) VALUES (
    v_caller.actor_id,
    'DISPATCH_ORDER',
    'orders',
    p_order_id::text,
    pg_catalog.jsonb_build_object(
      'status', 'Dispatched',
      'previous_status', 'Accepted',
      'shipments_dispatched', v_shipments_updated
    ),
    'Order dispatched and shipments transitioned to In Transit.',
    pg_catalog.now()
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'Dispatched',
    'already_dispatched', false,
    'order', v_updated_order,
    'shipments_dispatched', v_shipments_updated,
    'dispatched_at', pg_catalog.now()
  );
END;
$$;


-- --------------------------------------------------------------------
-- SECTION 9: FULFILLMENT RPC (finalize_order_fulfillment)
-- --------------------------------------------------------------------
-- Enforces Global Lock Hierarchy: Level 2 (Order) -> Level 4 (Inventory ASC) -> Level 6 (Shipments ASC).
-- Consumes physical stock and reserved counters synchronously.
-- Sets order to Delivered with 100% fulfillment.
CREATE OR REPLACE FUNCTION public.finalize_order_fulfillment(
  p_actor_id UUID,
  p_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_caller RECORD;
  v_order public.orders%ROWTYPE;
  v_listing public.produce_listings%ROWTYPE;
  v_is_seller BOOLEAN := false;
  v_item RECORD;
  v_inv_row public.inventory%ROWTYPE;
  v_new_quantity NUMERIC;
  v_new_reserved NUMERIC;
  v_new_status TEXT;
  v_rows_updated INTEGER;
  v_updated_order JSONB;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ORDER_ID_REQUIRED' 
      USING ERRCODE = '22023', DETAIL = 'Order ID is required.';
  END IF;

  -- 1. Validate authenticated caller
  SELECT * INTO v_caller FROM public._validate_and_resolve_caller(p_actor_id, NULL);

  -- 2. Lock Hierarchy Level 2: Lock Order FOR UPDATE
  SELECT * INTO v_order 
  FROM public.orders 
  WHERE id = p_order_id 
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' 
      USING ERRCODE = '02000', DETAIL = pg_catalog.format('Order %s does not exist.', p_order_id);
  END IF;

  -- 3. Idempotent short-circuit
  IF v_order.status = 'Delivered' THEN
    SELECT pg_catalog.to_jsonb(orders.*) INTO v_updated_order 
    FROM public.orders WHERE id = p_order_id;

    RETURN pg_catalog.jsonb_build_object(
      'success', true,
      'order_id', p_order_id,
      'status', 'Delivered',
      'already_fulfilled', true,
      'order', v_updated_order,
      'fulfilled_quantity_kg', v_order.fulfilled_quantity_kg,
      'fulfillment_percentage', v_order.fulfillment_percentage,
      'delivered_at', v_order.updated_at
    );
  END IF;

  -- 4. Lifecycle state validation: Only 'Dispatched' orders can be fulfilled
  IF v_order.status <> 'Dispatched' THEN
    RAISE EXCEPTION 'ORDER_NOT_FULFILLABLE' 
      USING ERRCODE = '22023', DETAIL = pg_catalog.format('Order %s cannot be fulfilled from status %s. Only Dispatched orders can be fulfilled.', p_order_id, v_order.status);
  END IF;

  -- 5. Authorization: Verified ADMIN or Selling Farmer
  IF v_caller.role = 'ADMIN'::public.user_role THEN
    NULL;
  ELSIF v_caller.role = 'FARMER'::public.user_role THEN
    IF v_order.listing_id IS NOT NULL THEN
      SELECT * INTO v_listing FROM public.produce_listings WHERE id = v_order.listing_id;
      IF FOUND AND v_listing.farmer_id = v_caller.actor_id THEN
        v_is_seller := true;
      END IF;
    END IF;

    IF NOT v_is_seller THEN
      IF EXISTS (
        SELECT 1 FROM public.order_items oi
        JOIN public.inventory inv ON inv.id = oi.inventory_id
        JOIN public.farmers f ON f.id = inv.farmer_id
        WHERE oi.order_id = p_order_id AND f.profile_id = v_caller.actor_id
      ) THEN
        v_is_seller := true;
      END IF;
    END IF;

    IF NOT v_is_seller THEN
      RAISE EXCEPTION 'UNAUTHORIZED_FULFILLMENT' 
        USING ERRCODE = '42501', DETAIL = 'Forbidden: Only the selling farmer or administrator may finalize delivery for this order.';
    END IF;
  ELSE
    RAISE EXCEPTION 'UNAUTHORIZED_FULFILLMENT' 
      USING ERRCODE = '42501', DETAIL = pg_catalog.format('Caller role %s is not authorized to finalize delivery.', v_caller.role);
  END IF;

  -- 6. Lock Hierarchy Level 4: Lock and consume inventory in deterministic ID ASC order
  FOR v_item IN
    SELECT inventory_id, quantity_kg
    FROM public.order_items
    WHERE order_id = p_order_id
    ORDER BY inventory_id ASC
  LOOP
    SELECT * INTO v_inv_row
    FROM public.inventory
    WHERE id = v_item.inventory_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_LOT_MISSING' 
        USING ERRCODE = '02000', DETAIL = pg_catalog.format('Inventory lot %s linked to order item not found.', v_item.inventory_id);
    END IF;

    -- Verify stock counters (null-safe)
    IF v_inv_row.quantity_kg < v_item.quantity_kg THEN
      RAISE EXCEPTION 'STOCK_COUNTER_UNDERFLOW' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Inventory lot %s physical quantity (%s kg) is less than consumed quantity (%s kg).', v_item.inventory_id, v_inv_row.quantity_kg, v_item.quantity_kg);
    END IF;

    IF COALESCE(v_inv_row.reserved_quantity_kg, 0) < v_item.quantity_kg THEN
      RAISE EXCEPTION 'RESERVATION_COUNTER_UNDERFLOW' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Inventory lot %s reserved quantity (%s kg) is less than consumed quantity (%s kg).', v_item.inventory_id, v_inv_row.reserved_quantity_kg, v_item.quantity_kg);
    END IF;

    v_new_quantity := v_inv_row.quantity_kg - v_item.quantity_kg;
    v_new_reserved := COALESCE(v_inv_row.reserved_quantity_kg, 0) - v_item.quantity_kg;

    IF v_new_quantity <= 0 THEN
      v_new_status := 'SOLD';
    ELSIF v_new_reserved >= v_new_quantity THEN
      v_new_status := 'RESERVED';
    ELSE
      v_new_status := 'AVAILABLE';
    END IF;

    UPDATE public.inventory
    SET quantity_kg = v_new_quantity,
        reserved_quantity_kg = v_new_reserved,
        status = v_new_status,
        available = (v_new_status = 'AVAILABLE'),
        updated_at = pg_catalog.now()
    WHERE id = v_item.inventory_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated != 1 THEN
      RAISE EXCEPTION 'CONCURRENT_MUTATION_FAILURE' 
        USING ERRCODE = '40001', DETAIL = pg_catalog.format('Failed to update inventory lot %s on fulfillment.', v_item.inventory_id);
    END IF;
  END LOOP;

  -- 7. Lock Hierarchy Level 6: Transition Shipments to 'Delivered'
  UPDATE public.shipments
  SET status = 'Delivered',
      progress_percentage = 100,
      updated_at = pg_catalog.now()
  WHERE order_id = p_order_id;

  -- 8. Update Order to 'Delivered' with 100% fulfillment
  UPDATE public.orders
  SET status = 'Delivered',
      fulfilled_quantity_kg = requested_quantity_kg,
      fulfillment_percentage = 100,
      updated_at = pg_catalog.now()
  WHERE id = p_order_id
  RETURNING pg_catalog.to_jsonb(orders.*) INTO v_updated_order;

  -- 9. Audit log
  INSERT INTO public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, new_state, reason, created_at
  ) VALUES (
    v_caller.actor_id,
    'FINALIZE_FULFILLMENT',
    'orders',
    p_order_id::text,
    pg_catalog.jsonb_build_object(
      'status', 'Delivered',
      'fulfilled_quantity_kg', v_order.requested_quantity_kg,
      'fulfillment_percentage', 100
    ),
    'Order delivery finalized and inventory physically consumed.',
    pg_catalog.now()
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'Delivered',
    'already_fulfilled', false,
    'order', v_updated_order,
    'fulfilled_quantity_kg', v_order.requested_quantity_kg,
    'fulfillment_percentage', 100,
    'delivered_at', pg_catalog.now()
  );
END;
$$;


-- --------------------------------------------------------------------
-- SECTION 10: DECOMMISSIONED LEGACY RPC STUB
-- --------------------------------------------------------------------
-- Closes the unvalidated inventory reservation pathway permanently.
-- Revokes ALL execution privileges from every role.
DROP FUNCTION IF EXISTS public.reserve_inventory_for_order(JSONB, UUID);
CREATE OR REPLACE FUNCTION public.reserve_inventory_for_order(
  p_items JSONB,
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'DEPRECATED_LEGACY_RPC: reserve_inventory_for_order has been decommissioned. All reservations must use create_and_reserve_order or accept_buyer_offer_and_create_order.'
    USING ERRCODE = '0A000';
END;
$$;


-- --------------------------------------------------------------------
-- SECTION 11: PRIVILEGE HARDENING & POSTGRES OWNERSHIP
-- --------------------------------------------------------------------

-- 11.1 Revoke ALL from PUBLIC and anon across all routines
REVOKE ALL ON FUNCTION public.compute_canonical_hash(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public._validate_and_resolve_caller(UUID, public.user_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_and_reserve_order(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.accept_buyer_offer_and_create_order(UUID, UUID, JSONB, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.cancel_order_and_release_inventory(UUID, UUID, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.dispatch_order(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.finalize_order_fulfillment(UUID, UUID) FROM PUBLIC, anon;

-- 11.2 Legacy RPC revoked from EVERY role
REVOKE ALL ON FUNCTION public.reserve_inventory_for_order(JSONB, UUID) FROM PUBLIC, anon, authenticated, service_role;

-- 11.3 Grant EXECUTE strictly to authorized roles
GRANT EXECUTE ON FUNCTION public.compute_canonical_hash(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public._validate_and_resolve_caller(UUID, public.user_role) TO service_role;
GRANT EXECUTE ON FUNCTION public.create_and_reserve_order(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.accept_buyer_offer_and_create_order(UUID, UUID, JSONB, TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.cancel_order_and_release_inventory(UUID, UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.dispatch_order(UUID, UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.finalize_order_fulfillment(UUID, UUID) TO authenticated, service_role;

-- 11.4 Enforce postgres ownership across all routines
ALTER FUNCTION public.compute_canonical_hash(TEXT) OWNER TO postgres;
ALTER FUNCTION public._validate_and_resolve_caller(UUID, public.user_role) OWNER TO postgres;
ALTER FUNCTION public.create_and_reserve_order(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.accept_buyer_offer_and_create_order(UUID, UUID, JSONB, TEXT, TEXT) OWNER TO postgres;
ALTER FUNCTION public.cancel_order_and_release_inventory(UUID, UUID, TEXT) OWNER TO postgres;
ALTER FUNCTION public.dispatch_order(UUID, UUID) OWNER TO postgres;
ALTER FUNCTION public.finalize_order_fulfillment(UUID, UUID) OWNER TO postgres;
ALTER FUNCTION public.reserve_inventory_for_order(JSONB, UUID) OWNER TO postgres;

COMMIT;
