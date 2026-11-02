-- ====================================================================
-- X-MILE MILESTONE 4, PHASE 2: ATOMIC DISPATCH & SHIPMENT TRACKING
-- Target: gufyukekzkomxfhvtruf (staging) / Local Disposable PostgreSQL 17
-- ====================================================================
-- OBJECTIVES:
-- 1. Extend dispatch_order() to recognize assigned verified transporters
--    (orders.assigned_transporter_id & shipments.assigned_transporter_id)
--    in addition to farmers and admins.
-- 2. Extend finalize_order_fulfillment() to recognize assigned verified
--    transporters in addition to farmers and admins.
-- 3. Strict Authorization Ordering: Authorize actor BEFORE idempotency return.
-- 4. Fulfillment Shipment Invariants: Lock shipments in deterministic id ASC,
--    enforce cardinality (count > 0), and require all shipments to be In Transit.
-- 5. Maintain strict linear lifecycle transitions:
--    Accepted -> Dispatched -> Delivered
-- 6. Preserve deterministic row locking, stock invariant checks,
--    idempotency, and audit logging.
-- ====================================================================

-- 1. ATOMIC ORDER DISPATCH (Accepted -> Dispatched)
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
  v_actor_verified BOOLEAN;
  v_total_shipments INTEGER;
  v_preparing_shipments INTEGER;
  v_shipments_updated INTEGER;
  v_updated_order JSONB;
BEGIN
  IF p_actor_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS: Actor ID and Order ID are required.' USING ERRCODE = '22023';
  END IF;

  -- 1. Advisory Lock scoped to order lifecycle (hierarchical lock root)
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('order_lifecycle:' || p_order_id::text));

  -- 2. Validate actor profile and status
  SELECT role, is_verified INTO v_actor_role, v_actor_verified 
  FROM public.profiles 
  WHERE id = p_actor_id;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'ACTOR_PROFILE_NOT_FOUND: Actor profile not found.' USING ERRCODE = '28000';
  END IF;

  -- Lock order row
  SELECT * INTO v_order_row FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Order not found.' USING ERRCODE = '02000';
  END IF;

  -- 3. AUTHORIZATION CHECK (MUST PRECEDE IDEMPOTENCY)
  -- Allowed actors:
  --   a) ADMIN
  --   b) Verified transporter assigned to the order or an associated shipment
  --   c) Owning seller farmer
  IF v_actor_role != 'ADMIN'::public.user_role THEN
    IF v_actor_role = 'TRANSPORT_PROVIDER'::public.user_role THEN
      IF v_actor_verified IS NOT TRUE THEN
        RAISE EXCEPTION 'UNAUTHORIZED_DISPATCH: Transporter must be verified to dispatch orders.'
          USING ERRCODE = '42501';
      END IF;

      -- Check if actor is the assigned transporter on the order or an associated shipment
      IF v_order_row.assigned_transporter_id IS DISTINCT FROM p_actor_id THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.shipments s
          WHERE s.order_id = p_order_id
            AND s.assigned_transporter_id = p_actor_id
        ) THEN
          RAISE EXCEPTION 'UNAUTHORIZED_DISPATCH: Transporter is not assigned to this order or shipment.'
            USING ERRCODE = '42501';
        END IF;
      END IF;
    ELSE
      -- Check seller farmer authorization
      IF NOT EXISTS (
        SELECT 1 
        FROM public.order_items oi
        JOIN public.inventory inv ON oi.inventory_id = inv.id
        JOIN public.farmers f ON inv.farmer_id = f.id
        WHERE oi.order_id = p_order_id
          AND (f.profile_id = p_actor_id OR f.id = p_actor_id)
      ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_DISPATCH: Only an administrator, assigned seller, or assigned transporter may dispatch an order.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- 4. Idempotency: If already Dispatched, return success safely ONLY for authorized callers
  IF v_order_row.status = 'Dispatched' THEN
    RETURN pg_catalog.jsonb_build_object(
      'success', true, 
      'order_id', p_order_id, 
      'status', 'Dispatched', 
      'message', 'Order already dispatched.'
    );
  END IF;

  -- 5. Strict linear check: Only Accepted orders can be Dispatched
  IF v_order_row.status != 'Accepted' THEN
    RAISE EXCEPTION 'INVALID_STATUS_TRANSITION: Cannot transition order % to Dispatched from current status %.', p_order_id, v_order_row.status
      USING ERRCODE = '22023';
  END IF;

  -- 6. Lock Shipment Records in Deterministic Ascending UUID Order
  PERFORM id
  FROM public.shipments
  WHERE order_id = p_order_id
  ORDER BY id ASC
  FOR UPDATE;

  -- 7. Establish Shipment Cardinality & Invariant Verification
  SELECT 
    pg_catalog.count(*),
    pg_catalog.count(*) FILTER (WHERE status = 'Preparing')
  INTO v_total_shipments, v_preparing_shipments
  FROM public.shipments
  WHERE order_id = p_order_id;

  -- Cardinality check: At least 1 shipment must exist
  IF v_total_shipments = 0 THEN
    RAISE EXCEPTION 'NO_SHIPMENTS_FOUND: Cannot dispatch order %: No shipment records found for this order.', p_order_id
      USING ERRCODE = '22023';
  END IF;

  -- State consistency check: ALL shipments for this order must be in 'Preparing' status
  IF v_total_shipments != v_preparing_shipments THEN
    RAISE EXCEPTION 'SHIPMENT_STATE_INCONSISTENT: Cannot dispatch order %: Shipment records are in inconsistent states (total: %, in Preparing: %).', p_order_id, v_total_shipments, v_preparing_shipments
      USING ERRCODE = '22023';
  END IF;

  -- 8. Transition All Shipments to 'In Transit'
  UPDATE public.shipments
  SET status = 'In Transit',
      progress_percentage = CASE WHEN progress_percentage < 25 THEN 25 ELSE progress_percentage END,
      updated_at = pg_catalog.now()
  WHERE order_id = p_order_id
    AND status = 'Preparing';

  GET DIAGNOSTICS v_shipments_updated = ROW_COUNT;

  IF v_shipments_updated != v_total_shipments THEN
    RAISE EXCEPTION 'SHIPMENT_COUNT_MISMATCH: Dispatched shipment count mismatch for order %: expected %, updated %.', p_order_id, v_total_shipments, v_shipments_updated
      USING ERRCODE = '40001';
  END IF;

  -- 9. Update Order Status
  UPDATE public.orders
  SET status = 'Dispatched',
      updated_at = pg_catalog.now()
  WHERE id = p_order_id
  RETURNING pg_catalog.to_jsonb(orders.*) INTO v_updated_order;

  -- 10. Audit Log
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


-- 2. ATOMIC ORDER FULFILLMENT & STOCK CONSUMPTION (Dispatched -> Delivered)
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
  v_actor_verified BOOLEAN;
  v_inv_row public.inventory%ROWTYPE;
  v_item RECORD;
  v_rows_updated INTEGER;
  v_total_shipments INTEGER;
  v_in_transit_shipments INTEGER;
BEGIN
  IF p_actor_id IS NULL OR p_order_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENTS: Actor ID and Order ID are required.' USING ERRCODE = '22023';
  END IF;

  -- 1. Advisory Lock
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtext('order_lifecycle:' || p_order_id::text));

  -- 2. Validate actor profile and status
  SELECT role, is_verified INTO v_actor_role, v_actor_verified 
  FROM public.profiles 
  WHERE id = p_actor_id;

  IF v_actor_role IS NULL THEN
    RAISE EXCEPTION 'ACTOR_PROFILE_NOT_FOUND: Actor profile not found.' USING ERRCODE = '28000';
  END IF;

  -- 3. Lock order row
  SELECT * INTO v_order_row FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Order not found.' USING ERRCODE = '02000';
  END IF;

  -- 4. AUTHORIZATION CHECK (MUST PRECEDE IDEMPOTENCY)
  -- Allowed actors:
  --   a) ADMIN
  --   b) Verified transporter assigned to the order or an associated shipment
  --   c) Owning seller farmer
  IF v_actor_role != 'ADMIN'::public.user_role THEN
    IF v_actor_role = 'TRANSPORT_PROVIDER'::public.user_role THEN
      IF v_actor_verified IS NOT TRUE THEN
        RAISE EXCEPTION 'UNAUTHORIZED_FULFILLMENT: Transporter must be verified to finalize delivery.'
          USING ERRCODE = '42501';
      END IF;

      IF v_order_row.assigned_transporter_id IS DISTINCT FROM p_actor_id THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.shipments s
          WHERE s.order_id = p_order_id
            AND s.assigned_transporter_id = p_actor_id
        ) THEN
          RAISE EXCEPTION 'UNAUTHORIZED_FULFILLMENT: Transporter is not assigned to this order or shipment.'
            USING ERRCODE = '42501';
        END IF;
      END IF;
    ELSE
      -- Check seller farmer authorization
      IF NOT EXISTS (
        SELECT 1 
        FROM public.order_items oi
        JOIN public.inventory inv ON oi.inventory_id = inv.id
        JOIN public.farmers f ON inv.farmer_id = f.id
        WHERE oi.order_id = p_order_id
          AND (f.profile_id = p_actor_id OR f.id = p_actor_id)
      ) THEN
        RAISE EXCEPTION 'UNAUTHORIZED_FULFILLMENT: Only an administrator, assigned seller, or assigned transporter may finalize delivery.'
          USING ERRCODE = '42501';
      END IF;
    END IF;
  END IF;

  -- 5. Idempotent return if already delivered ONLY for authorized callers
  IF v_order_row.status = 'Delivered' THEN
    RETURN pg_catalog.jsonb_build_object('success', true, 'order_id', p_order_id, 'status', 'Delivered', 'message', 'Order already fulfilled.');
  END IF;

  -- 6. Require strict linear transition: Accepted -> Dispatched -> Delivered
  IF v_order_row.status != 'Dispatched' THEN
    RAISE EXCEPTION 'ORDER_CANNOT_BE_FULFILLED: Cannot fulfill order % in status %. Order must be Dispatched before delivery can be finalized.', p_order_id, v_order_row.status
      USING ERRCODE = '22023';
  END IF;

  -- 7. Lock Associated Shipment Records in Deterministic Ascending UUID Order
  PERFORM id
  FROM public.shipments
  WHERE order_id = p_order_id
  ORDER BY id ASC
  FOR UPDATE;

  -- 8. Establish Shipment Cardinality & Invariant Verification for Delivery
  SELECT 
    pg_catalog.count(*),
    pg_catalog.count(*) FILTER (WHERE status = 'In Transit')
  INTO v_total_shipments, v_in_transit_shipments
  FROM public.shipments
  WHERE order_id = p_order_id;

  -- Invariant: At least 1 shipment must exist
  IF v_total_shipments = 0 THEN
    RAISE EXCEPTION 'NO_SHIPMENTS_FOUND: Cannot fulfill order %: No shipment records found for this order.', p_order_id
      USING ERRCODE = '22023';
  END IF;

  -- Invariant: Every associated shipment must be 'In Transit' before fulfillment
  IF v_total_shipments != v_in_transit_shipments THEN
    RAISE EXCEPTION 'SHIPMENT_STATE_INCONSISTENT: Cannot fulfill order %: All associated shipments must be In Transit before delivery can be finalized (total: %, in In Transit: %).', p_order_id, v_total_shipments, v_in_transit_shipments
      USING ERRCODE = '22023';
  END IF;

  -- 9. Deduct Total Stock and Reserved Stock for Each Order Item in Sorted Order
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
      RAISE EXCEPTION 'INVENTORY_LOT_NOT_FOUND: Inventory lot % does not exist.', v_item.inventory_id
        USING ERRCODE = '02000';
    END IF;

    -- Invariant check: stock counters must be sufficient for allocated deduction
    IF v_inv_row.reserved_quantity_kg < v_item.quantity_kg OR v_inv_row.quantity_kg < v_item.quantity_kg THEN
      RAISE EXCEPTION 'INCONSISTENT_STOCK_COUNTER: Data integrity violation: Stock counters for lot % (quantity: % kg, reserved: % kg) are insufficient for allocated quantity (% kg).',
        v_item.inventory_id, v_inv_row.quantity_kg, v_inv_row.reserved_quantity_kg, v_item.quantity_kg
        USING ERRCODE = '22023';
    END IF;

    -- Deduct directly
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
      RAISE EXCEPTION 'INVENTORY_CONSUMPTION_FAILURE: Failed to consume stock for lot %.', v_item.inventory_id
        USING ERRCODE = '40001';
    END IF;
  END LOOP;

  -- 10. Update Order and Shipment
  UPDATE public.orders
  SET status = 'Delivered',
      updated_at = pg_catalog.now()
  WHERE id = p_order_id;

  UPDATE public.shipments
  SET status = 'Delivered',
      progress_percentage = 100,
      updated_at = pg_catalog.now()
  WHERE order_id = p_order_id;

  -- 11. Audit Log
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
    'fulfilled_quantity_kg', v_order_row.fulfilled_quantity_kg,
    'delivered_at', pg_catalog.now()
  );
END;
$$;

-- Grant execution to service_role (and keep revocations tight)
REVOKE ALL ON FUNCTION public.dispatch_order(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_order(UUID, UUID) TO service_role;

REVOKE ALL ON FUNCTION public.finalize_order_fulfillment(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_order_fulfillment(UUID, UUID) TO service_role;
