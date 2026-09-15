import { supabase } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      buyerName,
      produce,
      requestedQuantity,
      requiredGrade,
      destination,
      fulfilledQuantity,
      fulfillmentPercentage,
      selectedInventory,
    } = body;

    if (
      !buyerName ||
      !produce ||
      !requestedQuantity ||
      !requiredGrade ||
      !destination
    ) {
      return Response.json(
        {
          error: "Missing required order details.",
        },
        { status: 400 }
      );
    }

    /*
      The Buyer page sends the exact inventory rows
      and quantities selected by the aggregation engine.
    */
    if (
      !Array.isArray(selectedInventory) ||
      selectedInventory.length === 0
    ) {
      return Response.json(
        {
          error:
            "No inventory was selected for this order.",
        },
        { status: 400 }
      );
    }

    /*
      STEP 1
      Create the order.
    */
    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .insert({
          buyer_name: buyerName,
          produce,
          requested_quantity_kg:
            requestedQuantity,
          required_grade: requiredGrade,
          destination,
          fulfilled_quantity_kg:
            fulfilledQuantity ?? 0,
          fulfillment_percentage:
            fulfillmentPercentage ?? 0,
          status: "Accepted",
        })
        .select()
        .single();

    if (orderError || !order) {
      console.error(
        "Failed to create order:",
        orderError
      );

      return Response.json(
        {
          error:
            orderError?.message ??
            "Failed to create order.",
        },
        { status: 500 }
      );
    }

    /*
      STEP 2
      Reserve the exact inventory selected
      by the Buyer aggregation engine.

      The Supabase RPC performs the reservation
      inside a database transaction.
    */
    const { error: reservationError } =
      await supabase.rpc(
        "reserve_inventory_for_order",
        {
          p_order_id: order.id,
          p_items: selectedInventory,
        }
      );

    if (reservationError) {
      console.error(
        "Inventory reservation failed:",
        reservationError
      );

      /*
        The order was created before the reservation
        failed, so remove it to avoid leaving behind
        an order that has no reserved inventory.
      */
      await supabase
        .from("orders")
        .delete()
        .eq("id", order.id);

      return Response.json(
        {
          error:
            reservationError.message ??
            "Failed to reserve inventory.",
        },
        { status: 409 }
      );
    }

    /*
      Everything succeeded.
    */
    return Response.json({
      success: true,
      order,
      reservation: {
        status: "RESERVED",
        items: selectedInventory,
      },
    });
  } catch (error) {
    console.error(
      "Order API error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

// -----------------------------------------
// GET ORDER
// -----------------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const id = searchParams.get("id");

    let query = supabase
      .from("orders")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (id) {
      query = query.eq("id", id);
    }

    const { data, error } =
      await query;

    if (error) {
      console.error(
        "Failed to load orders:",
        error
      );

      return Response.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      orders: data ?? [],
    });
  } catch (error) {
    console.error(
      "Get orders error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}

// -----------------------------------------
// UPDATE ORDER STATUS
// -----------------------------------------

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const { id, status } = body;

    const validStatuses = [
      "Accepted",
      "Dispatched",
      "Delivered",
      "Disputed",
    ];

    if (
      !id ||
      !validStatuses.includes(status)
    ) {
      return Response.json(
        {
          error:
            "Invalid order ID or status.",
        },
        { status: 400 }
      );
    }

    const { data, error } =
      await supabase
        .from("orders")
        .update({
          status,
        })
        .eq("id", id)
        .select()
        .single();

    if (error) {
      console.error(
        "Failed to update order:",
        error
      );

      return Response.json(
        {
          error: error.message,
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      order: data,
    });
  } catch (error) {
    console.error(
      "Update order error:",
      error
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
