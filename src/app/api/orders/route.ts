import { getServiceSupabase } from "@/lib/supabase-server";
import { verifyServerSession } from "@/lib/server-auth";
import crypto from "crypto";

const IDEMPOTENCY_KEY_REGEX = /^[a-zA-Z0-9_\-.:]{1,255}$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface InputItem {
  inventory_id?: string;
  inventoryId?: string;
  id?: string;
  quantity?: number | string;
  quantity_kg?: number | string;
  allocatedQuantity?: number | string;
}

interface OrderRecord {
  id: string;
  buyer_id?: string | null;
  created_by?: string | null;
  buyer_name: string;
  produce: string;
  requested_quantity_kg: number;
  required_grade: string;
  destination: string;
  fulfilled_quantity_kg: number;
  fulfillment_percentage: number;
  status: string;
  created_at: string;
  updated_at: string;
}

interface OrderItemRecord {
  id: string;
  order_id: string;
  inventory_id: string;
  quantity_kg: number;
  created_at?: string;
}

interface InventoryRecord {
  id: string;
  farmer_id: string;
  produce: string;
  quality_grade: string;
}

async function getFarmerIdsForUser(
  dbClient: ReturnType<typeof getServiceSupabase>,
  userId: string
): Promise<string[]> {
  const { data: farmers } = await dbClient
    .from("farmers")
    .select("id")
    .or(`profile_id.eq.${userId},id.eq.${userId}`);

  const ids = new Set<string>([userId]);
  if (farmers) {
    for (const f of farmers) {
      ids.add(f.id);
    }
  }
  return Array.from(ids);
}

async function isFarmerForOrder(
  dbClient: ReturnType<typeof getServiceSupabase>,
  orderId: string,
  userId: string
): Promise<boolean> {
  const farmerIds = await getFarmerIdsForUser(dbClient, userId);

  const { data: orderItems, error: itemsError } = await dbClient
    .from("order_items")
    .select("inventory_id")
    .eq("order_id", orderId);

  if (itemsError || !orderItems || orderItems.length === 0) {
    return false;
  }

  const invIds = orderItems.map((oi) => oi.inventory_id);
  const { data: matchingInventory, error: invError } = await dbClient
    .from("inventory")
    .select("id")
    .in("farmer_id", farmerIds)
    .in("id", invIds)
    .limit(1);

  if (invError || !matchingInventory) {
    return false;
  }

  return matchingInventory.length > 0;
}

async function isTransporterForOrder(
  dbClient: ReturnType<typeof getServiceSupabase>,
  orderId: string,
  userId: string
): Promise<boolean> {
  const { data: shipments, error: shipError } = await dbClient
    .from("shipments")
    .select("id")
    .eq("order_id", orderId)
    .eq("assigned_transporter_id", userId)
    .limit(1);

  if (!shipError && shipments && shipments.length > 0) {
    return true;
  }

  const { data: orderRow, error: orderError } = await dbClient
    .from("orders")
    .select("id")
    .eq("id", orderId)
    .eq("assigned_transporter_id", userId)
    .limit(1);

  return !orderError && !!orderRow && orderRow.length > 0;
}

/**
 * Strips unrelated farmer inventory items and sensitive buyer account fields
 * from the order payload returned to a farmer.
 */
function sanitizeOrderForFarmer(
  order: OrderRecord,
  farmerItems: OrderItemRecord[]
) {
  const allocatedQty = farmerItems.reduce(
    (sum, item) => sum + Number(item.quantity_kg || 0),
    0
  );

  return {
    id: order.id,
    produce: order.produce,
    required_grade: order.required_grade,
    status: order.status,
    destination: order.destination,
    buyer_name: order.buyer_name, // Business/buyer name for dispatch slip
    requested_quantity_kg: allocatedQty, // Only this farmer's allocated portion
    farmer_allocated_quantity_kg: allocatedQty,
    fulfillment_percentage: order.fulfillment_percentage,
    created_at: order.created_at,
    updated_at: order.updated_at,
    items: farmerItems.map((item) => ({
      id: item.id,
      inventory_id: item.inventory_id,
      quantity_kg: item.quantity_kg,
      created_at: item.created_at,
    })),
  };
}

// -----------------------------------------
// POST: CREATE AND RESERVE ORDER
// -----------------------------------------
export async function POST(request: Request) {
  try {
    // 1. Authenticate through verified Supabase Auth session
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json(
        {
          error: session.error || "Authentication required. Please sign in with an authorized account.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // Role check: Only BUYER self-checkout or ADMIN delegated procurement is authorized
    if (session.role !== "BUYER" && session.role !== "ADMIN") {
      return Response.json(
        {
          error: "Forbidden: Only verified Buyers or Administrators can place orders.",
          code: "FORBIDDEN_ROLE",
        },
        { status: 403 }
      );
    }

    // Account verification check (P2)
    if (!session.isVerified) {
      return Response.json(
        {
          error: "Forbidden: Account must be verified to place orders or execute procurement.",
          code: "ACCOUNT_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const {
      buyerName,
      produce,
      requestedQuantity,
      requiredGrade,
      destination,
      selectedInventory,
      targetBuyerId,
    } = body;

    // Idempotency key from header or body with strict regex and size bounding (P1)
    const idempotencyKey =
      request.headers.get("x-idempotency-key")?.trim() ||
      (typeof body.idempotencyKey === "string" ? body.idempotencyKey.trim() : null);

    if (!idempotencyKey || !IDEMPOTENCY_KEY_REGEX.test(idempotencyKey)) {
      return Response.json(
        {
          error: "Invalid or missing idempotency key. Key must be between 1 and 255 alphanumeric characters, dashes, underscores, dots, or colons.",
          code: "INVALID_IDEMPOTENCY_KEY",
        },
        { status: 400 }
      );
    }

    const numRequestedQty = Number(requestedQuantity);
    if (!Number.isFinite(numRequestedQty) || numRequestedQty <= 0) {
      return Response.json(
        {
          error: "requestedQuantity must be a positive finite number.",
          code: "INVALID_QUANTITY",
        },
        { status: 400 }
      );
    }

    const normalizedGrade = String(requiredGrade || "").toUpperCase().trim();
    if (!["A", "B", "C"].includes(normalizedGrade)) {
      return Response.json(
        {
          error: "requiredGrade must be 'A', 'B', or 'C'.",
          code: "INVALID_REQUIRED_GRADE",
        },
        { status: 400 }
      );
    }

    if (!produce || !destination) {
      return Response.json(
        {
          error: "Missing required order details: produce and destination are mandatory.",
          code: "MISSING_REQUIRED_FIELDS",
        },
        { status: 400 }
      );
    }

    if (!Array.isArray(selectedInventory) || selectedInventory.length === 0) {
      return Response.json(
        {
          error: "No inventory lots were selected for this order.",
          code: "NO_INVENTORY_SELECTED",
        },
        { status: 400 }
      );
    }

    // Determine actor and buyer identities (Actor vs Owner)
    const actorId = session.userId;
    let buyerId = session.userId;
    let effectiveBuyerName = session.name;

    if (session.role === "ADMIN") {
      if (!targetBuyerId || !UUID_REGEX.test(targetBuyerId)) {
        return Response.json(
          {
            error: "Administrators executing procurement must specify a valid targetBuyerId UUID.",
            code: "TARGET_BUYER_REQUIRED",
          },
          { status: 400 }
        );
      }
      buyerId = targetBuyerId;
      effectiveBuyerName = buyerName || "Procurement on behalf of Buyer";
    }

    // Validate and canonically sort selected inventory items
    const canonicalItems = [];
    const seenInventoryIds = new Set<string>();

    for (const rawItem of selectedInventory as InputItem[]) {
      const invId = String(rawItem.inventory_id || rawItem.inventoryId || rawItem.id || "").toLowerCase().trim();
      const qty = Number(rawItem.quantity || rawItem.quantity_kg || rawItem.allocatedQuantity);

      if (!UUID_REGEX.test(invId)) {
        return Response.json(
          {
            error: `Invalid inventory ID format: '${invId}'. Must be a valid UUID.`,
            code: "INVALID_INVENTORY_ID",
          },
          { status: 400 }
        );
      }

      if (!Number.isFinite(qty) || qty <= 0) {
        return Response.json(
          {
            error: `Invalid allocation quantity for lot '${invId}'. Must be a positive finite number.`,
            code: "INVALID_QUANTITY",
          },
          { status: 400 }
        );
      }

      if (seenInventoryIds.has(invId)) {
        return Response.json(
          {
            error: `Duplicate inventory ID '${invId}' detected in reservation request.`,
            code: "DUPLICATE_INVENTORY_ITEM",
          },
          { status: 400 }
        );
      }

      seenInventoryIds.add(invId);
      canonicalItems.push({
        inventory_id: invId,
        quantity: qty,
      });
    }

    canonicalItems.sort((a, b) => a.inventory_id.localeCompare(b.inventory_id));

    // Calculate server-side SHA-256 fingerprint (never trust client hash)
    const canonicalPayload = JSON.stringify({
      buyer_id: buyerId.toLowerCase().trim(),
      produce: String(produce).toLowerCase().trim(),
      requested_quantity: numRequestedQty,
      required_grade: normalizedGrade,
      destination: String(destination).trim(),
      items: canonicalItems,
    });

    const requestHash = crypto.createHash("sha256").update(canonicalPayload).digest("hex");

    // Execute atomic reservation via privileged service-role client
    const dbClient = getServiceSupabase();

    const { data: rpcResult, error: rpcError } = await dbClient.rpc(
      "create_and_reserve_order",
      {
        p_actor_id: actorId,
        p_buyer_id: buyerId,
        p_buyer_name: effectiveBuyerName,
        p_produce: String(produce).trim(),
        p_requested_quantity: numRequestedQty,
        p_required_grade: normalizedGrade,
        p_destination: String(destination).trim(),
        p_items: canonicalItems,
        p_idempotency_key: idempotencyKey,
        p_request_hash: requestHash,
      }
    );

    if (rpcError) {
      console.error("Atomic order reservation RPC error:", rpcError);

      const msg = rpcError.message || "";

      if (msg.includes("INSUFFICIENT_STOCK") || msg.includes("INVENTORY_NOT_AVAILABLE")) {
        return Response.json(
          { error: "Insufficient inventory capacity or lot is no longer available.", code: "INSUFFICIENT_STOCK" },
          { status: 409 }
        );
      }

      if (msg.includes("IDEMPOTENCY_KEY_PAYLOAD_MISMATCH")) {
        return Response.json(
          { error: "Idempotency key has already been used with a different request payload.", code: "IDEMPOTENCY_KEY_PAYLOAD_MISMATCH" },
          { status: 422 }
        );
      }

      if (msg.includes("ACTOR_NOT_VERIFIED") || msg.includes("BUYER_NOT_VERIFIED")) {
        return Response.json(
          { error: "Forbidden: Actor or buyer account is not verified in the database.", code: "ACCOUNT_NOT_VERIFIED" },
          { status: 403 }
        );
      }

      if (msg.includes("BUYER_ROLE_REQUIRED") || msg.includes("ADMIN_DELEGATION_REQUIRED")) {
        return Response.json(
          { error: "Forbidden: Caller does not possess authorized role for this order.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }

      if (msg.includes("TARGET_BUYER_NOT_FOUND") || msg.includes("ACTOR_PROFILE_NOT_FOUND")) {
        return Response.json(
          { error: "Specified buyer or actor profile was not found in the database.", code: "PROFILE_NOT_FOUND" },
          { status: 404 }
        );
      }

      if (
        msg.includes("ALLOCATION_SUM_MISMATCH") ||
        msg.includes("INVALID_QUANTITY") ||
        msg.includes("DUPLICATE_INVENTORY_ITEM") ||
        msg.includes("INVALID_REQUIRED_GRADE") ||
        msg.includes("IDEMPOTENCY_KEY_INVALID")
      ) {
        return Response.json(
          { error: msg, code: "INVALID_REQUEST_PARAMETERS" },
          { status: 400 }
        );
      }

      return Response.json(
        { error: "Failed to reserve inventory for order.", code: "RESERVATION_FAILED" },
        { status: 500 }
      );
    }

    return Response.json(rpcResult);
  } catch (error) {
    console.error("Order API exception:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Internal server error occurred.",
        code: "INTERNAL_ERROR",
      },
      { status: 500 }
    );
  }
}

// -----------------------------------------
// GET: QUERY ORDERS WITH STRICT ACCESS BOUNDARIES & ISOLATION
// -----------------------------------------
export async function GET(request: Request) {
  try {
    // 1. Verify caller session
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json(
        {
          error: session.error || "Authentication required to access orders.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    const dbClient = getServiceSupabase();

    // -------------------------------------------------------------
    // Case A: Query specific order by ID
    // -------------------------------------------------------------
    if (id) {
      if (!UUID_REGEX.test(id)) {
        return Response.json(
          { error: "Invalid order ID format. Must be a valid UUID.", code: "INVALID_ORDER_ID" },
          { status: 400 }
        );
      }

      const { data: order, error: orderError } = await dbClient
        .from("orders")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (orderError) {
        console.error("Failed to load order:", orderError);
        return Response.json({ error: orderError.message }, { status: 500 });
      }

      if (!order) {
        return Response.json({ error: "Order not found.", code: "ORDER_NOT_FOUND" }, { status: 404 });
      }

      // Authorization & Data Isolation
      if (session.role === "ADMIN") {
        // Fetch all order items for admin inspection
        const { data: allItems } = await dbClient
          .from("order_items")
          .select("*")
          .eq("order_id", id);

        return Response.json({
          success: true,
          orders: [{ ...order, items: allItems ?? [] }],
        });
      }

      if (session.role === "BUYER") {
        if (order.buyer_id === session.userId || order.created_by === session.userId) {
          const { data: allItems } = await dbClient
            .from("order_items")
            .select("*")
            .eq("order_id", id);

          return Response.json({
            success: true,
            orders: [{ ...order, items: allItems ?? [] }],
          });
        }
        return Response.json(
          { error: "Forbidden: You are not authorized to view this order.", code: "FORBIDDEN" },
          { status: 403 }
        );
      }

      if (session.role === "FARMER") {
        const farmerIds = await getFarmerIdsForUser(dbClient, session.userId);

        // Fetch all items for this order
        const { data: orderItems, error: itemsError } = await dbClient
          .from("order_items")
          .select("*")
          .eq("order_id", id);

        if (itemsError || !orderItems || orderItems.length === 0) {
          return Response.json(
            { error: "Forbidden: You are not authorized to view this order.", code: "FORBIDDEN" },
            { status: 403 }
          );
        }

        // Fetch inventory lots to resolve ownership
        const itemInvIds = orderItems.map((oi) => oi.inventory_id);
        const { data: inventoryRows } = await dbClient
          .from("inventory")
          .select("id, farmer_id, produce, quality_grade")
          .in("id", itemInvIds);

        const ownedInventoryIds = new Set(
          (inventoryRows || [])
            .filter((inv: InventoryRecord) => farmerIds.includes(inv.farmer_id))
            .map((inv: InventoryRecord) => inv.id)
        );

        // STRICT ISOLATION: Keep ONLY this farmer's order items
        const farmerItems = orderItems.filter((oi: OrderItemRecord) =>
          ownedInventoryIds.has(oi.inventory_id)
        );

        if (farmerItems.length === 0) {
          return Response.json(
            { error: "Forbidden: You are not authorized to view this order.", code: "FORBIDDEN" },
            { status: 403 }
          );
        }

        const sanitizedOrder = sanitizeOrderForFarmer(order as OrderRecord, farmerItems);
        return Response.json({ success: true, orders: [sanitizedOrder] });
      }

      return Response.json(
        { error: "Forbidden: Role not authorized to view orders.", code: "FORBIDDEN" },
        { status: 403 }
      );
    }

    // -------------------------------------------------------------
    // Case B: List orders based on caller's role boundary
    // -------------------------------------------------------------
    if (session.role === "ADMIN") {
      const { data: orders, error: listError } = await dbClient
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (listError) {
        console.error("Failed to list orders (Admin):", listError);
        return Response.json({ error: listError.message }, { status: 500 });
      }

      return Response.json({ success: true, orders: orders ?? [] });
    }

    if (session.role === "BUYER") {
      const { data: orders, error: listError } = await dbClient
        .from("orders")
        .select("*")
        .or(`buyer_id.eq.${session.userId},created_by.eq.${session.userId}`)
        .order("created_at", { ascending: false });

      if (listError) {
        console.error("Failed to list orders (Buyer):", listError);
        return Response.json({ error: listError.message }, { status: 500 });
      }

      return Response.json({ success: true, orders: orders ?? [] });
    }

    if (session.role === "FARMER") {
      const farmerIds = await getFarmerIdsForUser(dbClient, session.userId);

      // Find all inventory lots owned by this farmer
      const { data: farmerLots, error: lotsError } = await dbClient
        .from("inventory")
        .select("id")
        .in("farmer_id", farmerIds);

      if (lotsError) {
        console.error("Failed to load farmer inventory:", lotsError);
        return Response.json({ error: lotsError.message }, { status: 500 });
      }

      const lotIds = (farmerLots || []).map((l) => l.id);
      if (lotIds.length === 0) {
        return Response.json({ success: true, orders: [] });
      }

      // Find order_items containing farmer's inventory
      const { data: orderItems, error: itemsError } = await dbClient
        .from("order_items")
        .select("*")
        .in("inventory_id", lotIds);

      if (itemsError) {
        console.error("Failed to load order items for farmer:", itemsError);
        return Response.json({ error: itemsError.message }, { status: 500 });
      }

      const orderIds = Array.from(new Set((orderItems || []).map((oi) => oi.order_id)));
      if (orderIds.length === 0) {
        return Response.json({ success: true, orders: [] });
      }

      const { data: orders, error: ordersError } = await dbClient
        .from("orders")
        .select("*")
        .in("id", orderIds)
        .order("created_at", { ascending: false });

      if (ordersError) {
        console.error("Failed to load orders for farmer:", ordersError);
        return Response.json({ error: ordersError.message }, { status: 500 });
      }

      // Group farmer items by order_id and build isolated order views
      const itemsByOrderId = new Map<string, OrderItemRecord[]>();
      for (const item of (orderItems || [])) {
        const existing = itemsByOrderId.get(item.order_id) || [];
        existing.push(item);
        itemsByOrderId.set(item.order_id, existing);
      }

      const isolatedOrders = (orders || []).map((order) => {
        const matchingItems = itemsByOrderId.get(order.id) || [];
        return sanitizeOrderForFarmer(order as OrderRecord, matchingItems);
      });

      return Response.json({ success: true, orders: isolatedOrders });
    }

    return Response.json(
      { error: "Forbidden: Role not authorized to view orders.", code: "FORBIDDEN" },
      { status: 403 }
    );
  } catch (error) {
    console.error("Get orders error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

// -----------------------------------------
// PATCH: ORDER LIFECYCLE MANAGEMENT (ATOMIC)
// -----------------------------------------
export async function PATCH(request: Request) {
  try {
    // 1. Authenticate caller
    const session = await verifyServerSession(request);
    if (!session.isAuthenticated || !session.userId) {
      return Response.json(
        {
          error: session.error || "Authentication required to update order status.",
          code: "UNAUTHORIZED",
        },
        { status: 401 }
      );
    }

    // 2. Verification check
    if (!session.isVerified) {
      return Response.json(
        {
          error: "Forbidden: Account must be verified to update order status.",
          code: "ACCOUNT_NOT_VERIFIED",
        },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, status, reason } = body;

    const validStatuses = [
      "Accepted",
      "Dispatched",
      "Delivered",
      "Disputed",
      "Cancelled",
    ];

    if (!id || !UUID_REGEX.test(id) || !status || !validStatuses.includes(status)) {
      return Response.json(
        {
          error: "Invalid order ID or unsupported status transition. Allowed statuses: Accepted, Dispatched, Delivered, Disputed, Cancelled.",
          code: "INVALID_STATUS_OR_ID",
        },
        { status: 400 }
      );
    }

    const dbClient = getServiceSupabase();

    // 3. Fetch existing order
    const { data: order, error: orderError } = await dbClient
      .from("orders")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (orderError) {
      console.error("Failed to load order for update:", orderError);
      return Response.json({ error: orderError.message }, { status: 500 });
    }

    if (!order) {
      return Response.json(
        { error: "Order not found.", code: "ORDER_NOT_FOUND" },
        { status: 404 }
      );
    }

    // 4. Handle Lifecycle Operations
    if (status === "Cancelled") {
      // Authorization check: Actor must be the purchasing buyer or an Admin
      if (session.role !== "ADMIN" && order.buyer_id !== session.userId && order.created_by !== session.userId) {
        return Response.json(
          {
            error: "Forbidden: Only the purchasing buyer or an administrator may cancel this order.",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      // Execute atomic cancellation and inventory release RPC
      const { data: cancelResult, error: cancelError } = await dbClient.rpc(
        "cancel_order_and_release_inventory",
        {
          p_actor_id: session.userId,
          p_order_id: id,
          p_reason: typeof reason === "string" ? reason.trim() : "Order cancelled by authorized user.",
        }
      );

      if (cancelError) {
        console.error("Order cancellation RPC error:", cancelError);
        const msg = cancelError.message || "";
        if (msg.includes("ORDER_CANNOT_BE_CANCELLED") || msg.includes("INVALID_ARGUMENTS")) {
          return Response.json({ error: msg, code: "INVALID_STATUS_TRANSITION" }, { status: 400 });
        }
        if (msg.includes("UNAUTHORIZED_CANCELLATION")) {
          return Response.json({ error: msg, code: "FORBIDDEN" }, { status: 403 });
        }
        return Response.json({ error: "Failed to cancel order.", code: "CANCELLATION_FAILED" }, { status: 500 });
      }

      return Response.json({ success: true, order: cancelResult });
    }

    if (status === "Delivered") {
      // Linear lifecycle enforcement: Order MUST be Dispatched before it can be Delivered
      if (order.status !== "Dispatched") {
        return Response.json(
          {
            error: `Cannot transition order to Delivered from current status '${order.status}'. Order must be marked as 'Dispatched' before it can be finalized as 'Delivered'.`,
            code: "INVALID_STATUS_TRANSITION",
          },
          { status: 400 }
        );
      }

      // Authorization: Admin, Farmer owning items in this order, or assigned Transporter
      const isFarmer = session.role === "FARMER" && (await isFarmerForOrder(dbClient, id, session.userId));
      const isTransporter =
        (session.role === "TRANSPORT_PROVIDER" || session.role === "LOGISTICS") &&
        (await isTransporterForOrder(dbClient, id, session.userId));

      if (session.role !== "ADMIN" && !isFarmer && !isTransporter) {
        return Response.json(
          {
            error: "Forbidden: Only an administrator, assigned seller, or assigned transporter may finalize delivery.",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      // Execute atomic delivery finalization and inventory stock deduction RPC
      const { data: fulfillResult, error: fulfillError } = await dbClient.rpc(
        "finalize_order_fulfillment",
        {
          p_actor_id: session.userId,
          p_order_id: id,
        }
      );

      if (fulfillError) {
        console.error("Order fulfillment RPC error:", fulfillError);
        const msg = fulfillError.message || "";
        if (msg.includes("ORDER_CANNOT_BE_FULFILLED") || msg.includes("INVALID_ARGUMENTS")) {
          return Response.json({ error: msg, code: "INVALID_STATUS_TRANSITION" }, { status: 400 });
        }
        return Response.json({ error: "Failed to finalize delivery.", code: "FULFILLMENT_FAILED" }, { status: 500 });
      }

      return Response.json({ success: true, order: fulfillResult });
    }

    if (status === "Dispatched") {
      // Allowed transition: Only from Accepted
      if (order.status !== "Accepted") {
        return Response.json(
          {
            error: `Cannot transition order to Dispatched from current status '${order.status}'.`,
            code: "INVALID_STATUS_TRANSITION",
          },
          { status: 400 }
        );
      }

      // Authorization: Admin, Farmer owning items in this order, or assigned Transporter
      const isFarmer = session.role === "FARMER" && (await isFarmerForOrder(dbClient, id, session.userId));
      const isTransporter =
        (session.role === "TRANSPORT_PROVIDER" || session.role === "LOGISTICS") &&
        (await isTransporterForOrder(dbClient, id, session.userId));

      if (session.role !== "ADMIN" && !isFarmer && !isTransporter) {
        return Response.json(
          {
            error: "Forbidden: Only an administrator, assigned seller, or assigned transporter may mark an order as Dispatched.",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      // Execute atomic dispatch RPC: order and shipment are updated in a single transaction
      const { data: dispatchResult, error: dispatchError } = await dbClient.rpc(
        "dispatch_order",
        {
          p_actor_id: session.userId,
          p_order_id: id,
        }
      );

      if (dispatchError) {
        console.error("Order dispatch RPC error:", dispatchError);
        const msg = dispatchError.message || "";
        if (msg.includes("INVALID_STATUS_TRANSITION") || msg.includes("INVALID_ARGUMENTS")) {
          return Response.json({ error: msg, code: "INVALID_STATUS_TRANSITION" }, { status: 400 });
        }
        if (msg.includes("UNAUTHORIZED_DISPATCH")) {
          return Response.json({ error: msg, code: "FORBIDDEN" }, { status: 403 });
        }
        return Response.json({ error: "Failed to dispatch order.", code: "DISPATCH_FAILED" }, { status: 500 });
      }

      return Response.json({
        success: true,
        order: dispatchResult.order || dispatchResult,
      });
    }

    if (status === "Disputed") {
      // Disputing an order: Can only dispute Accepted, Dispatched, or Delivered orders
      if (order.status === "Cancelled" || order.status === "Disputed") {
        return Response.json(
          {
            error: `Cannot dispute order in current status '${order.status}'.`,
            code: "INVALID_STATUS_TRANSITION",
          },
          { status: 400 }
        );
      }

      // Authorization: Purchasing buyer or Admin
      if (session.role !== "ADMIN" && order.buyer_id !== session.userId && order.created_by !== session.userId) {
        return Response.json(
          {
            error: "Forbidden: Only the purchasing buyer or an administrator may dispute this order.",
            code: "FORBIDDEN",
          },
          { status: 403 }
        );
      }

      const { data: updatedOrder, error: updateError } = await dbClient
        .from("orders")
        .update({
          status: "Disputed",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (updateError) {
        console.error("Failed to dispute order:", updateError);
        return Response.json({ error: updateError.message }, { status: 500 });
      }

      return Response.json({
        success: true,
        order: updatedOrder,
      });
    }

    if (status === "Accepted") {
      if (order.status === "Accepted") {
        return Response.json({ success: true, order });
      }

      return Response.json(
        {
          error: `Cannot transition order back to Accepted from status '${order.status}'.`,
          code: "INVALID_STATUS_TRANSITION",
        },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Unhandled status transition.", code: "BAD_REQUEST" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Update order error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
