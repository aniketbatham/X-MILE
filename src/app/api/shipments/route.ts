import { supabase } from "@/lib/supabase";

/*
  CREATE SHIPMENT
*/
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      orderId,
      origin,
      destination,
      totalQuantityKg,
      estimatedDistanceKm,
      estimatedTimeMinutes,
    } = body;

    if (!orderId || !destination) {
      return Response.json(
        {
          error:
            "Order ID and destination are required.",
        },
        { status: 400 }
      );
    }

    /*
      Make sure the order exists.
    */
    const { data: order, error: orderError } =
      await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

    if (orderError || !order) {
      return Response.json(
        {
          error: "Order not found.",
        },
        { status: 404 }
      );
    }

    /*
      Prevent duplicate shipments for the same order.
    */
    const { data: existingShipment } =
      await supabase
        .from("shipments")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();

    if (existingShipment) {
      return Response.json({
        success: true,
        shipment: existingShipment,
        message:
          "Shipment already exists for this order.",
      });
    }

    /*
      Create shipment.
      New shipments always start at 0%.
    */
    const { data: shipment, error } =
      await supabase
        .from("shipments")
        .insert({
          order_id: orderId,
          status: "Preparing",
          origin: origin ?? null,
          destination,
          total_quantity_kg:
            totalQuantityKg ??
            order.fulfilled_quantity_kg ??
            0,
          current_location:
            origin ?? null,
          estimated_distance_km:
            estimatedDistanceKm ?? null,
          estimated_time_minutes:
            estimatedTimeMinutes ?? null,
          progress_percentage: 0,
        })
        .select()
        .single();

    if (error || !shipment) {
      console.error(
        "Failed to create shipment:",
        error
      );

      return Response.json(
        {
          error:
            error?.message ??
            "Failed to create shipment.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      shipment,
    });
  } catch (error) {
    console.error(
      "Shipment creation error:",
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

/*
  GET SHIPMENT
*/
export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const orderId =
      searchParams.get("orderId");

    const shipmentId =
      searchParams.get("id");

    let query = supabase
      .from("shipments")
      .select("*")
      .order("created_at", {
        ascending: false,
      });

    if (orderId) {
      query = query.eq(
        "order_id",
        orderId
      );
    }

    if (shipmentId) {
      query = query.eq(
        "id",
        shipmentId
      );
    }

    const { data, error } =
      await query;

    if (error) {
      console.error(
        "Failed to load shipments:",
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
      shipments: data ?? [],
    });
  } catch (error) {
    console.error(
      "Get shipments error:",
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

/*
  UPDATE SHIPMENT
*/
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const {
      id,
      status,
      currentLocation,
      progressPercentage,
    } = body;

    const validStatuses = [
      "Preparing",
      "Dispatched",
      "In Transit",
      "Delivered",
      "Delayed",
    ];

    if (
      !id ||
      !validStatuses.includes(status)
    ) {
      return Response.json(
        {
          error:
            "Invalid shipment ID or status.",
        },
        { status: 400 }
      );
    }

    /*
      Load the existing shipment first.
      This allows Delayed shipments to keep
      their current progress.
    */
    const { data: existingShipment, error: fetchError } =
      await supabase
        .from("shipments")
        .select("*")
        .eq("id", id)
        .single();

    if (fetchError || !existingShipment) {
      return Response.json(
        {
          error:
            fetchError?.message ??
            "Shipment not found.",
        },
        { status: 404 }
      );
    }

    /*
      Determine progress.
    */
    let nextProgress =
      existingShipment.progress_percentage ?? 0;

    if (progressPercentage !== undefined) {
      const numericProgress =
        Number(progressPercentage);

      if (
        !Number.isFinite(numericProgress) ||
        numericProgress < 0 ||
        numericProgress > 100
      ) {
        return Response.json(
          {
            error:
              "Progress percentage must be between 0 and 100.",
          },
          { status: 400 }
        );
      }

      nextProgress = Math.round(
        numericProgress
      );
    } else {
      switch (status) {
        case "Preparing":
          nextProgress = 0;
          break;

        case "Dispatched":
          nextProgress = 25;
          break;

        case "In Transit":
          /*
            Do not reset progress if the shipment
            is already moving.
          */
          nextProgress = Math.max(
            existingShipment.progress_percentage ?? 0,
            25
          );
          break;

        case "Delivered":
          nextProgress = 100;
          break;

        case "Delayed":
          /*
            Keep the current progress.
          */
          nextProgress =
            existingShipment.progress_percentage ?? 0;
          break;
      }
    }

    /*
      A delivered shipment must always be 100%.
    */
    if (status === "Delivered") {
      nextProgress = 100;
    }

    /*
      Update shipment.
    */
    const updateData: {
      status: string;
      progress_percentage: number;
      current_location?: string;
      updated_at: string;
    } = {
      status,
      progress_percentage: nextProgress,
      updated_at:
        new Date().toISOString(),
    };

    if (
      currentLocation !== undefined
    ) {
      updateData.current_location =
        currentLocation;
    }

    const { data, error } =
      await supabase
        .from("shipments")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

    if (error || !data) {
      console.error(
        "Failed to update shipment:",
        error
      );

      return Response.json(
        {
          error:
            error?.message ??
            "Failed to update shipment.",
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      shipment: data,
    });
  } catch (error) {
    console.error(
      "Update shipment error:",
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