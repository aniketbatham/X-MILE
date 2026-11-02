-- ====================================================================
-- MIGRATION 005: RESERVATION FUNCTIONS & PERMISSIONS
-- X-MILE Platform — Production Architecture
-- Atomic Inventory Reservation, Cancellation & Fulfillment Lifecycle RPCs
-- Hardened with SET search_path = '' and Service-Role Execution Grants
-- ====================================================================

-- 1. ATOMIC ORDER CREATION & INVENTORY RESERVATION FUNCTION
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
  v_existing_order_id UUID;
  v_existing_hash TEXT;
  v_existing_response JSONB;
  v_actor_role public.user_role;
  v_actor_verified BOOLEAN;
  v_buyer_role public.user_role;
  v_buyer_verified BOOLEAN;
  v_authoritative_buyer_name TEXT;
  v_total_allocated NUMERIC := 0;
  v_item RECORD;
  v_inv_row public.inventory%ROWTYPE;
  v_rows_updated INTEGER;
  v_order_id UUID;
  v_response_payload JSONB;
  v_distinct_items_count INTEGER;
  v_total_items_count INTEGER;
BEGIN
  -- ------------------------------------------------------------------
  -- 1. PARAMETER VALIDATIONS & BOUNDS
  -- ------------------------------------------------------------------
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'ACTOR_ID_REQUIRED'
      USING ERRCODE = '22023', MESSAGE = 'Actor ID is mandatory.';
  END IF;

  IF p_buyer_id IS NULL THEN
    RAISE EXCEPTION 'BUYER_ID_REQUIRED'
      USING ERRCODE = '22023', MESSAGE = 'Buyer ID is mandatory.';
  END IF;

  -- Enforce bound idempotency key: 1-255 characters, alphanumeric/hyphen/underscore/dot/colon
  IF p_idempotency_key IS NULL 
     OR pg_catalog.length(pg_catalog.trim(p_idempotency_key)) = 0 
     OR pg_catalog.length(p_idempotency_key) > 255 
     OR p_idempotency_key !~ '^[a-zA-Z0-9_\-\.:]{1,255}$' THEN
    RAISE EXCEPTION 'IDEMPOTENCY_KEY_INVALID'
      USING ERRCODE = '22023', MESSAGE = 'A valid idempotency key (1-255 characters, allowed: a-z, A-Z, 0-9, _, -, ., :) is mandatory.';
  END IF;

  IF p_request_hash IS NULL 
     OR pg_catalog.length(pg_catalog.trim(p_request_hash)) != 64 
     OR p_request_hash !~ '^[a-fA-F0-9]{64}$' THEN
    RAISE EXCEPTION 'INVALID_REQUEST_HASH'
      USING ERRCODE = '22023', MESSAGE = 'A valid 64-character SHA-256 request hash is mandatory.';
  END IF;

  IF p_requested_quantity IS NULL OR p_requested_quantity <= 0 THEN
    RAISE EXCEPTION 'INVALID_REQUESTED_QUANTITY'
      USING ERRCODE = '22023', MESSAGE = 'Requested quantity must be greater than zero.';
  END IF;

  IF p_required_grade IS NULL OR p_required_grade NOT IN ('A', 'B', 'C') THEN
    RAISE EXCEPTION 'INVALID_REQUIRED_GRADE'
      USING ERRCODE = '22023', MESSAGE = 'Required grade must be A, B, or C.';
  END IF;

  IF p_destination IS NULL OR pg_catalog.trim(p_destination) = '' THEN
    RAISE EXCEPTION 'DESTINATION_REQUIRED'
      USING ERRCODE = '22023', MESSAGE = 'Destination delivery location is required.';
  END IF;

  IF p_items IS NULL OR pg_catalog.jsonb_typeof(p_items) != 'array' OR pg_catalog.jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'INVALID_ITEMS_PAYLOAD'
      USING ERRCODE = '22023', MESSAGE = 'Selected inventory items array is required.';
  END IF;

  v_total_items_count := pg_catalog.jsonb_array_length(p_items);
  IF v_total_items_count > 50 THEN
    RAISE EXCEPTION 'MAX_LOTS_EXCEEDED'
      USING ERRCODE = '22023', MESSAGE = 'Maximum 50 inventory lots can be reserved in a single order.';
  END IF;

  -- Verify no duplicate inventory IDs in items array
  SELECT pg_catalog.count(DISTINCT (elem->>'inventory_id')::uuid)
  INTO v_distinct_items_count
  FROM pg_catalog.jsonb_array_elements(p_items) elem;

  IF v_distinct_items_count != v_total_items_count THEN
    RAISE EXCEPTION 'DUPLICATE_INVENTORY_ITEM'
      USING ERRCODE = '22023', MESSAGE = 'Duplicate inventory lot IDs are not permitted in an order payload.';
  END IF;

  -- ------------------------------------------------------------------
  -- 2. AUTHORIZATION & ACCOUNT VERIFICATION
  -- ------------------------------------------------------------------
  SELECT role, is_verified 
  INTO v_actor_role, v_actor_verified 
  FROM public.profiles 
  WHERE id = p_actor_id;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'ACTOR_PROFILE_NOT_FOUND'
      USING ERRCODE = '28000', MESSAGE = 'Authenticated actor profile not found.';
  END IF;

  -- Mandatory account verification enforcement (P2)
  IF v_actor_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'ACTOR_NOT_VERIFIED'
      USING ERRCODE = '42501', MESSAGE = 'Actor account must be verified before performing order transactions.';
  END IF;

  -- Lookup target buyer profile to strictly derive authoritative buyer name and verification
  SELECT role, is_verified, full_name
  INTO v_buyer_role, v_buyer_verified, v_authoritative_buyer_name
  FROM public.profiles
  WHERE id = p_buyer_id;

  IF v_buyer_role IS NULL OR v_buyer_role != 'BUYER'::public.user_role THEN
    RAISE EXCEPTION 'TARGET_BUYER_NOT_FOUND'
      USING ERRCODE = '28000', MESSAGE = 'Target buyer profile not found or role is not BUYER.';
  END IF;

  IF v_buyer_verified IS NOT TRUE THEN
    RAISE EXCEPTION 'BUYER_NOT_VERIFIED'
      USING ERRCODE = '42501', MESSAGE = 'Buyer account must be verified before placing orders.';
  END IF;

  IF p_actor_id = p_buyer_id THEN
    -- Buyer Self-Checkout
    IF v_actor_role != 'BUYER'::public.user_role AND v_actor_role != 'ADMIN'::public.user_role THEN
      RAISE EXCEPTION 'BUYER_ROLE_REQUIRED'
        USING ERRCODE = '42501', MESSAGE = 'Only verified buyers can execute self-checkout.';
    END IF;
  ELSE
    -- Admin Delegated Procurement
    IF v_actor_role != 'ADMIN'::public.user_role THEN
      RAISE EXCEPTION 'ADMIN_DELEGATION_REQUIRED'
        USING ERRCODE = '42501', MESSAGE = 'Only administrators can create orders on behalf of other buyers.';
    END IF;
  END IF;

  -- ------------------------------------------------------------------
  -- 3. TRANSACTION-SCOPED ADVISORY LOCK
  -- ------------------------------------------------------------------
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext(p_buyer_id::text || ':' || p_idempotency_key));

  -- ------------------------------------------------------------------
  -- 4. FAST-PATH IDEMPOTENCY CHECK
  -- ------------------------------------------------------------------
  SELECT order_id, request_hash, response_payload
  INTO v_existing_order_id, v_existing_hash, v_existing_response
  FROM public.order_idempotency_keys
  WHERE buyer_id = p_buyer_id AND idempotency_key = p_idempotency_key;

  IF FOUND THEN
    IF v_existing_hash != p_request_hash THEN
      RAISE EXCEPTION 'IDEMPOTENCY_KEY_PAYLOAD_MISMATCH'
        USING ERRCODE = '23505', MESSAGE = 'Idempotency key reused with a different request payload.';
    END IF;

    -- Return exact cached original response without re-locking or mutating stock
    RETURN v_existing_response;
  END IF;

  -- ------------------------------------------------------------------
  -- 5. EXACT ALLOCATION SUM CHECK
  -- ------------------------------------------------------------------
  SELECT pg_catalog.coalesce(pg_catalog.sum((elem->>'quantity')::numeric), 0)
  INTO v_total_allocated
  FROM pg_catalog.jsonb_array_elements(p_items) elem;

  IF v_total_allocated != p_requested_quantity THEN
    RAISE EXCEPTION 'ALLOCATION_SUM_MISMATCH'
      USING ERRCODE = '22023', MESSAGE = pg_catalog.format('Total allocated quantity (%s kg) does not match requested quantity (%s kg).', v_total_allocated, p_requested_quantity);
  END IF;

  -- ------------------------------------------------------------------
  -- 6. LOCK AND UPDATE INVENTORY IN ASCENDING UUID ORDER
  -- ------------------------------------------------------------------
  FOR v_item IN
    SELECT 
      (elem->>'inventory_id')::uuid AS inv_id,
      (elem->>'quantity')::numeric AS req_qty
    FROM pg_catalog.jsonb_array_elements(p_items) elem
    ORDER BY (elem->>'inventory_id')::uuid ASC
  LOOP
    IF v_item.req_qty IS NULL OR v_item.req_qty <= 0 THEN
      RAISE EXCEPTION 'INVALID_QUANTITY'
        USING ERRCODE = '22023', MESSAGE = pg_catalog.format('Allocated quantity for lot %s must be greater than zero.', v_item.inv_id);
    END IF;

    -- Lock row exclusively with pre-lock invariant checks
    SELECT * INTO v_inv_row
    FROM public.inventory
    WHERE id = v_item.inv_id
      AND status = 'AVAILABLE'
      AND available IS TRUE
      AND pg_catalog.coalesce(reserved_quantity_kg, 0) >= 0
      AND pg_catalog.coalesce(reserved_quantity_kg, 0) < quantity_kg
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_NOT_AVAILABLE'
        USING ERRCODE = '40001', MESSAGE = pg_catalog.format('Inventory lot %s is unavailable, already reserved, or does not exist.', v_item.inv_id);
    END IF;

    -- Check produce compatibility
    IF pg_catalog.lower(pg_catalog.trim(v_inv_row.produce)) != pg_catalog.lower(pg_catalog.trim(p_produce)) THEN
      RAISE EXCEPTION 'PRODUCE_MISMATCH'
        USING ERRCODE = '22023', MESSAGE = pg_catalog.format('Lot %s produce (%s) does not match order produce (%s).', v_item.inv_id, v_inv_row.produce, p_produce);
    END IF;

    -- Check grade compatibility
    IF p_required_grade = 'A' AND v_inv_row.quality_grade != 'A' THEN
      RAISE EXCEPTION 'GRADE_MISMATCH'
        USING ERRCODE = '22023', MESSAGE = pg_catalog.format('Lot %s grade %s cannot satisfy Grade A requirement.', v_item.inv_id, v_inv_row.quality_grade);
    ELSIF p_required_grade = 'B' AND v_inv_row.quality_grade NOT IN ('A', 'B') THEN
      RAISE EXCEPTION 'GRADE_MISMATCH'
        USING ERRCODE = '22023', MESSAGE = pg_catalog.format('Lot %s grade %s cannot satisfy Grade B requirement.', v_item.inv_id, v_inv_row.quality_grade);
    END IF;

    -- Check available capacity
    IF (v_inv_row.reserved_quantity_kg + v_item.req_qty) > v_inv_row.quantity_kg THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK'
        USING ERRCODE = '40001', MESSAGE = pg_catalog.format('Insufficient available quantity in lot %s (requested: %s kg, remaining: %s kg).', v_item.inv_id, v_item.req_qty, v_inv_row.quantity_kg - v_inv_row.reserved_quantity_kg);
    END IF;

    -- Execute inventory reservation update
    UPDATE public.inventory
    SET reserved_quantity_kg = reserved_quantity_kg + v_item.req_qty,
        status = CASE WHEN reserved_quantity_kg + v_item.req_qty >= quantity_kg THEN 'RESERVED' ELSE 'AVAILABLE' END,
        available = (reserved_quantity_kg + v_item.req_qty < quantity_kg),
        updated_at = pg_catalog.now()
    WHERE id = v_item.inv_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated != 1 THEN
      RAISE EXCEPTION 'CONCURRENT_MUTATION_FAILURE'
        USING ERRCODE = '40001', MESSAGE = pg_catalog.format('Failed to update inventory lot %s.', v_item.inv_id);
    END IF;
  END LOOP;

  -- ------------------------------------------------------------------
  -- 7. INSERT ORDER (Authoritative buyer_name from database profile)
  -- ------------------------------------------------------------------
  INSERT INTO public.orders (
    buyer_id,
    created_by,
    buyer_name,
    produce,
    requested_quantity_kg,
    required_grade,
    destination,
    fulfilled_quantity_kg,
    fulfillment_percentage,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_buyer_id,
    p_actor_id,
    v_authoritative_buyer_name,
    p_produce,
    p_requested_quantity,
    p_required_grade,
    p_destination,
    p_requested_quantity,
    100,
    'Accepted',
    pg_catalog.now(),
    pg_catalog.now()
  ) RETURNING id INTO v_order_id;

  -- ------------------------------------------------------------------
  -- 8. INSERT ORDER ITEMS
  -- ------------------------------------------------------------------
  FOR v_item IN
    SELECT 
      (elem->>'inventory_id')::uuid AS inv_id,
      (elem->>'quantity')::numeric AS req_qty
    FROM pg_catalog.jsonb_array_elements(p_items) elem
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

  -- ------------------------------------------------------------------
  -- 9. ADMIN AUDIT ATTRIBUTION (If delegated procurement)
  -- ------------------------------------------------------------------
  IF p_actor_id != p_buyer_id THEN
    INSERT INTO public.admin_audit_logs (
      admin_id,
      action,
      entity_type,
      entity_id,
      new_state,
      reason,
      created_at
    ) VALUES (
      p_actor_id,
      'DELEGATED_ORDER_CREATION',
      'orders',
      v_order_id::text,
      pg_catalog.jsonb_build_object(
        'buyer_id', p_buyer_id,
        'buyer_name', v_authoritative_buyer_name,
        'produce', p_produce,
        'quantity_kg', p_requested_quantity,
        'lots_count', v_total_items_count
      ),
      'Procurement executed on behalf of buyer',
      pg_catalog.now()
    );
  END IF;

  -- ------------------------------------------------------------------
  -- 10. CONSTRUCT AND PERSIST IDEMPOTENT RESPONSE
  -- ------------------------------------------------------------------
  v_response_payload := pg_catalog.jsonb_build_object(
    'success', true,
    'order_id', v_order_id,
    'buyer_id', p_buyer_id,
    'created_by', p_actor_id,
    'buyer_name', v_authoritative_buyer_name,
    'produce', p_produce,
    'requested_quantity_kg', p_requested_quantity,
    'fulfilled_quantity_kg', p_requested_quantity,
    'fulfillment_percentage', 100,
    'status', 'Accepted',
    'lots_allocated_count', v_total_items_count,
    'idempotency_key', p_idempotency_key,
    'created_at', pg_catalog.now()
  );

  INSERT INTO public.order_idempotency_keys (
    buyer_id,
    idempotency_key,
    request_hash,
    order_id,
    response_payload,
    created_at
  ) VALUES (
    p_buyer_id,
    p_idempotency_key,
    p_request_hash,
    v_order_id,
    v_response_payload,
    pg_catalog.now()
  );

  RETURN v_response_payload;
END;
$$;

-- 2. ATOMIC ORDER CANCELLATION & INVENTORY RESERVATION RELEASE
-- Releases only the quantities allocated to this specific order.
CREATE OR REPLACE FUNCTION public.cancel_order_and_release_inventory(
  p_actor_id UUID,
  p_order_id UUID,
  p_reason TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order_row public.orders%ROWTYPE;
  v_actor_role public.user_role;
  v_inv_row public.inventory%ROWTYPE;
  v_item RECORD;
  v_rows_updated INTEGER;
BEGIN
  IF p_actor_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS' USING ERRCODE = '22023', MESSAGE = 'Actor ID and Order ID are required.';
  END IF;

  -- 1. Advisory Lock scoped to order lifecycle
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('order_lifecycle:' || p_order_id::text));

  -- 2. Authorization Verification
  SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'ACTOR_PROFILE_NOT_FOUND' USING ERRCODE = '28000', MESSAGE = 'Actor profile not found.';
  END IF;

  SELECT * INTO v_order_row FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = '02000', MESSAGE = 'Order not found.';
  END IF;

  -- Actor must be the buyer of the order or an ADMIN
  IF v_actor_role != 'ADMIN'::public.user_role AND v_order_row.buyer_id != p_actor_id AND v_order_row.created_by != p_actor_id THEN
    RAISE EXCEPTION 'UNAUTHORIZED_CANCELLATION' USING ERRCODE = '42501', MESSAGE = 'Only the purchasing buyer or administrator can cancel an order.';
  END IF;

  -- 3. Idempotent check: if already cancelled, return success without duplicate release
  IF v_order_row.status = 'Cancelled' THEN
    RETURN pg_catalog.jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'Cancelled', 'message', 'Order already cancelled.');
  END IF;

  -- Dispatched or Delivered orders cannot be cancelled
  IF v_order_row.status IN ('Dispatched', 'Delivered') THEN
    RAISE EXCEPTION 'ORDER_CANNOT_BE_CANCELLED' USING ERRCODE = '22023', MESSAGE = pg_catalog.format('Cannot cancel order %s in status %s.', p_order_id, v_order_row.status);
  END IF;

  -- 4. Release Reserved Stock in Sorted Inventory Order
  FOR v_item IN
    SELECT inventory_id, quantity_kg
    FROM public.order_items
    WHERE order_id = p_order_id
    ORDER BY inventory_id ASC
  LOOP
    -- Lock inventory row exclusively with pre-decrement invariant checks
    SELECT * INTO v_inv_row
    FROM public.inventory
    WHERE id = v_item.inventory_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_LOT_NOT_FOUND'
        USING ERRCODE = '02000', MESSAGE = pg_catalog.format('Inventory lot %s does not exist.', v_item.inventory_id);
    END IF;

    -- Invariant check: reserved quantity must be >= allocated quantity (fail loudly on counter corruption)
    IF v_inv_row.reserved_quantity_kg < v_item.quantity_kg THEN
      RAISE EXCEPTION 'INCONSISTENT_RESERVATION_COUNTER'
        USING ERRCODE = '22023',
        MESSAGE = pg_catalog.format('Data integrity violation: Reserved quantity (%s kg) for lot %s is less than allocated quantity (%s kg).',
          v_inv_row.reserved_quantity_kg, v_item.inventory_id, v_item.quantity_kg);
    END IF;

    -- Decrement directly without GREATEST to prevent concealing counter errors
    UPDATE public.inventory
    SET reserved_quantity_kg = reserved_quantity_kg - v_item.quantity_kg,
        status = CASE 
          WHEN (reserved_quantity_kg - v_item.quantity_kg) < quantity_kg AND status = 'RESERVED' THEN 'AVAILABLE'
          ELSE status 
        END,
        available = ((reserved_quantity_kg - v_item.quantity_kg) < quantity_kg AND status != 'SOLD'),
        updated_at = pg_catalog.now()
    WHERE id = v_item.inventory_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated != 1 THEN
      RAISE EXCEPTION 'INVENTORY_RELEASE_FAILURE' USING ERRCODE = '40001', MESSAGE = pg_catalog.format('Failed to release stock for lot %s.', v_item.inventory_id);
    END IF;
  END LOOP;

  -- 5. Update Order Status
  UPDATE public.orders
  SET status = 'Cancelled',
      updated_at = pg_catalog.now()
  WHERE id = p_order_id;

  -- 6. Update Shipment if exists
  UPDATE public.shipments
  SET status = 'Failed',
      updated_at = pg_catalog.now()
  WHERE order_id = p_order_id AND status = 'Preparing';

  -- 7. Audit Log
  INSERT INTO public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, new_state, reason, created_at
  ) VALUES (
    p_actor_id,
    'CANCEL_ORDER',
    'orders',
    p_order_id::text,
    pg_catalog.jsonb_build_object('status', 'Cancelled', 'previous_status', v_order_row.status),
    pg_catalog.coalesce(p_reason, 'Order cancelled and inventory reservation released.'),
    pg_catalog.now()
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'Cancelled',
    'released_at', pg_catalog.now()
  );
END;
$$;

-- 3. ATOMIC ORDER FULFILLMENT & STOCK CONSUMPTION
-- Consumes only the allocated reservation upon confirmed delivery.
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
  v_order_row public.orders%ROWTYPE;
  v_actor_role public.user_role;
  v_inv_row public.inventory%ROWTYPE;
  v_item RECORD;
  v_rows_updated INTEGER;
BEGIN
  IF p_actor_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS' USING ERRCODE = '22023', MESSAGE = 'Actor ID and Order ID are required.';
  END IF;

  -- 1. Advisory Lock
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('order_lifecycle:' || p_order_id::text));

  SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'ACTOR_PROFILE_NOT_FOUND' USING ERRCODE = '28000', MESSAGE = 'Actor profile not found.';
  END IF;

  SELECT * INTO v_order_row FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = '02000', MESSAGE = 'Order not found.';
  END IF;

  -- Idempotent return if already delivered
  IF v_order_row.status = 'Delivered' THEN
    RETURN pg_catalog.jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'Delivered', 'message', 'Order already fulfilled.');
  END IF;

  -- Require strict linear transition: Accepted -> Dispatched -> Delivered
  IF v_order_row.status != 'Dispatched' THEN
    RAISE EXCEPTION 'ORDER_CANNOT_BE_FULFILLED' USING ERRCODE = '22023', 
      MESSAGE = pg_catalog.format('Cannot fulfill order %s in status %s. Order must be Dispatched before delivery can be finalized.', p_order_id, v_order_row.status);
  END IF;

  -- Authorization check: Actor must be ADMIN or a farmer owning inventory items in this order
  IF v_actor_role != 'ADMIN'::public.user_role THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM public.order_items oi
      JOIN public.inventory inv ON oi.inventory_id = inv.id
      JOIN public.farmers f ON inv.farmer_id = f.id
      WHERE oi.order_id = p_order_id
        AND (f.profile_id = p_actor_id OR f.id = p_actor_id)
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED_FULFILLMENT' USING ERRCODE = '42501', 
        MESSAGE = 'Only an administrator or the assigned farmer/seller may finalize delivery.';
    END IF;
  END IF;

  -- 2. Deduct Total Stock and Reserved Stock for Each Order Item in Sorted Order
  FOR v_item IN
    SELECT inventory_id, quantity_kg
    FROM public.order_items
    WHERE order_id = p_order_id
    ORDER BY inventory_id ASC
  LOOP
    -- Lock inventory row exclusively with pre-decrement invariant checks
    SELECT * INTO v_inv_row
    FROM public.inventory
    WHERE id = v_item.inventory_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_LOT_NOT_FOUND'
        USING ERRCODE = '02000', MESSAGE = pg_catalog.format('Inventory lot %s does not exist.', v_item.inventory_id);
    END IF;

    -- Invariant check: stock counters must be sufficient for allocated deduction
    IF v_inv_row.reserved_quantity_kg < v_item.quantity_kg OR v_inv_row.quantity_kg < v_item.quantity_kg THEN
      RAISE EXCEPTION 'INCONSISTENT_STOCK_COUNTER'
        USING ERRCODE = '22023',
        MESSAGE = pg_catalog.format('Data integrity violation: Stock counters for lot %s (quantity: %s kg, reserved: %s kg) are insufficient for allocated quantity (%s kg).',
          v_item.inventory_id, v_inv_row.quantity_kg, v_inv_row.reserved_quantity_kg, v_item.quantity_kg);
    END IF;

    -- Deduct directly without GREATEST
    UPDATE public.inventory
    SET quantity_kg = quantity_kg - v_item.quantity_kg,
        reserved_quantity_kg = reserved_quantity_kg - v_item.quantity_kg,
        status = CASE 
          WHEN (quantity_kg - v_item.quantity_kg) <= 0 THEN 'SOLD'
          WHEN (reserved_quantity_kg - v_item.quantity_kg) >= (quantity_kg - v_item.quantity_kg) THEN 'RESERVED'
          ELSE 'AVAILABLE'
        END,
        available = ((quantity_kg - v_item.quantity_kg) > 0 AND (reserved_quantity_kg - v_item.quantity_kg) < (quantity_kg - v_item.quantity_kg)),
        updated_at = pg_catalog.now()
    WHERE id = v_item.inventory_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated != 1 THEN
      RAISE EXCEPTION 'INVENTORY_CONSUMPTION_FAILURE' USING ERRCODE = '40001', MESSAGE = pg_catalog.format('Failed to consume stock for lot %s.', v_item.inventory_id);
    END IF;
  END LOOP;

  -- 3. Update Order and Shipment
  UPDATE public.orders
  SET status = 'Delivered',
      updated_at = pg_catalog.now()
  WHERE id = p_order_id;

  UPDATE public.shipments
  SET status = 'Delivered',
      progress_percentage = 100,
      updated_at = pg_catalog.now()
  WHERE order_id = p_order_id;

  -- 4. Audit Log
  INSERT INTO public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, new_state, reason, created_at
  ) VALUES (
    p_actor_id,
    'FINALIZE_DELIVERY',
    'orders',
    p_order_id::text,
    pg_catalog.jsonb_build_object('status', 'Delivered', 'fulfilled_quantity_kg', v_order_row.fulfilled_quantity_kg),
    'Order delivery finalized and inventory permanently deducted.',
    pg_catalog.now()
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'status', 'Delivered',
    'fulfilled_at', pg_catalog.now()
  );
END;
$$;

-- 4. ATOMIC ORDER DISPATCH (Accepted -> Dispatched)
-- Transitions order to Dispatched and shipment to In Transit atomically in one transaction.
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
  v_order_row public.orders%ROWTYPE;
  v_actor_role public.user_role;
  v_total_shipments INTEGER;
  v_preparing_shipments INTEGER;
  v_shipments_updated INTEGER;
  v_updated_order JSONB;
BEGIN
  IF p_actor_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS' USING ERRCODE = '22023', MESSAGE = 'Actor ID and Order ID are required.';
  END IF;

  -- 1. Advisory Lock scoped to order lifecycle (hierarchical lock root)
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('order_lifecycle:' || p_order_id::text));

  -- 2. Validate actor
  SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_actor_id;
  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'ACTOR_PROFILE_NOT_FOUND' USING ERRCODE = '28000', MESSAGE = 'Actor profile not found.';
  END IF;

  SELECT * INTO v_order_row FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND' USING ERRCODE = '02000', MESSAGE = 'Order not found.';
  END IF;

  -- Idempotency: If already Dispatched, return success
  IF v_order_row.status = 'Dispatched' THEN
    RETURN pg_catalog.jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'Dispatched', 'message', 'Order already dispatched.');
  END IF;

  -- Strict linear check: Only Accepted orders can be Dispatched
  IF v_order_row.status != 'Accepted' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION' USING ERRCODE = '22023',
      MESSAGE = pg_catalog.format('Cannot transition order %s to Dispatched from current status %s.', p_order_id, v_order_row.status);
  END IF;

  -- Authorization check: ADMIN or farmer owning items in this order
  IF v_actor_role != 'ADMIN'::public.user_role THEN
    IF NOT EXISTS (
      SELECT 1 
      FROM public.order_items oi
      JOIN public.inventory inv ON oi.inventory_id = inv.id
      JOIN public.farmers f ON inv.farmer_id = f.id
      WHERE oi.order_id = p_order_id
        AND (f.profile_id = p_actor_id OR f.id = p_actor_id)
    ) THEN
      RAISE EXCEPTION 'UNAUTHORIZED_DISPATCH' USING ERRCODE = '42501',
        MESSAGE = 'Only an administrator or the assigned farmer/seller may dispatch an order.';
    END IF;
  END IF;

  -- 3. Lock Shipment Records in Deterministic Ascending UUID Order
  PERFORM id
  FROM public.shipments
  WHERE order_id = p_order_id
  ORDER BY id ASC
  FOR UPDATE;

  -- 4. Establish Shipment Cardinality & Invariant Verification
  SELECT 
    pg_catalog.count(*),
    pg_catalog.count(*) FILTER (WHERE status = 'Preparing')
  INTO v_total_shipments, v_preparing_shipments
  FROM public.shipments
  WHERE order_id = p_order_id;

  -- Cardinality check: At least 1 shipment must exist
  IF v_total_shipments = 0 THEN
    RAISE EXCEPTION 'NO_SHIPMENTS_FOUND' USING ERRCODE = '22023',
      MESSAGE = pg_catalog.format('Cannot dispatch order %s: No shipment records found for this order.', p_order_id);
  END IF;

  -- State consistency check: ALL shipments for this order must be in 'Preparing' status
  IF v_total_shipments != v_preparing_shipments THEN
    RAISE EXCEPTION 'SHIPMENT_STATE_INCONSISTENT' USING ERRCODE = '22023',
      MESSAGE = pg_catalog.format('Cannot dispatch order %s: Shipment records are in inconsistent states (total: %s, in Preparing: %s).', p_order_id, v_total_shipments, v_preparing_shipments);
  END IF;

  -- 5. Transition All Shipments to 'In Transit'
  UPDATE public.shipments
  SET status = 'In Transit',
      updated_at = pg_catalog.now()
  WHERE order_id = p_order_id
    AND status = 'Preparing';

  GET DIAGNOSTICS v_shipments_updated = ROW_COUNT;

  IF v_shipments_updated != v_total_shipments THEN
    RAISE EXCEPTION 'SHIPMENT_COUNT_MISMATCH' USING ERRCODE = '40001',
      MESSAGE = pg_catalog.format('Dispatched shipment count mismatch for order %s: expected %s, updated %s.', p_order_id, v_total_shipments, v_shipments_updated);
  END IF;

  -- 6. Update Order Status
  UPDATE public.orders
  SET status = 'Dispatched',
      updated_at = pg_catalog.now()
  WHERE id = p_order_id
  RETURNING pg_catalog.to_jsonb(orders.*) INTO v_updated_order;

  -- 7. Audit Log
  INSERT INTO public.admin_audit_logs (
    admin_id, action, entity_type, entity_id, new_state, reason, created_at
  ) VALUES (
    p_actor_id,
    'DISPATCH_ORDER',
    'orders',
    p_order_id::text,
    pg_catalog.jsonb_build_object(
      'status', 'Dispatched',
      'previous_status', 'Accepted',
      'shipments_dispatched', v_shipments_updated
    ),
    'Order dispatched and all associated shipments transitioned to In Transit atomically.',
    pg_catalog.now()
  );

  RETURN pg_catalog.jsonb_build_object(
    'success', true,
    'order', v_updated_order,
    'shipments_dispatched', v_shipments_updated,
    'dispatched_at', pg_catalog.now()
  );
END;
$$;

-- 4. HARDENED LEGACY RPC FUNCTION (14-Day Transition Grace Period)
CREATE OR REPLACE FUNCTION public.reserve_inventory_for_order(
  p_items JSONB,
  p_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_item RECORD;
  v_inv_row public.inventory%ROWTYPE;
  v_rows_updated INTEGER;
BEGIN
  IF p_order_id IS NULL THEN
    RAISE EXCEPTION 'ORDER_ID_REQUIRED' USING ERRCODE = '22023', MESSAGE = 'Order ID is required.';
  END IF;

  IF p_items IS NULL OR pg_catalog.jsonb_typeof(p_items) != 'array' THEN
    RAISE EXCEPTION 'INVALID_ITEMS_PAYLOAD' USING ERRCODE = '22023', MESSAGE = 'Items array is required.';
  END IF;

  FOR v_item IN
    SELECT 
      (elem->>'inventoryId')::uuid AS inv_id,
      (elem->>'quantity')::numeric AS req_qty
    FROM pg_catalog.jsonb_array_elements(p_items) elem
    ORDER BY (elem->>'inventoryId')::uuid ASC
  LOOP
    SELECT * INTO v_inv_row
    FROM public.inventory
    WHERE id = v_item.inv_id
      AND status = 'AVAILABLE'
      AND available IS TRUE
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'INVENTORY_NOT_AVAILABLE'
        USING ERRCODE = '40001', MESSAGE = pg_catalog.format('Inventory %s not available.', v_item.inv_id);
    END IF;

    IF (v_inv_row.reserved_quantity_kg + v_item.req_qty) > v_inv_row.quantity_kg THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK'
        USING ERRCODE = '40001', MESSAGE = 'Insufficient quantity available.';
    END IF;

    UPDATE public.inventory
    SET reserved_quantity_kg = reserved_quantity_kg + v_item.req_qty,
        status = CASE WHEN reserved_quantity_kg + v_item.req_qty >= quantity_kg THEN 'RESERVED' ELSE 'AVAILABLE' END,
        available = (reserved_quantity_kg + v_item.req_qty < quantity_kg),
        updated_at = pg_catalog.now()
    WHERE id = v_item.inv_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated != 1 THEN
      RAISE EXCEPTION 'CONCURRENT_MUTATION_FAILURE';
    END IF;

    INSERT INTO public.order_items (order_id, inventory_id, quantity_kg, created_at)
    VALUES (p_order_id, v_item.inv_id, v_item.req_qty, pg_catalog.now());
  END LOOP;
END;
$$;

-- 5. FUNCTION EXECUTION GRANTS: STRICT SERVICE-ROLE EXCLUSIVITY
REVOKE ALL ON FUNCTION public.create_and_reserve_order(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_and_reserve_order(UUID, UUID, TEXT, TEXT, NUMERIC, TEXT, TEXT, JSONB, TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.cancel_order_and_release_inventory(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_order_and_release_inventory(UUID, UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_order_fulfillment(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_order_fulfillment(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.dispatch_order(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_order(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.reserve_inventory_for_order(JSONB, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_inventory_for_order(JSONB, UUID) TO service_role;
