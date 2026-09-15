import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const farmerName = searchParams.get("farmerName");

    if (!farmerName) {
      return Response.json(
        { error: "Farmer name is required." },
        { status: 400 }
      );
    }

    // Find ALL farmers with this name.
    // Demo Farmer exists more than once in the database.
    const { data: farmers, error: farmerError } =
      await supabase
        .from("farmers")
        .select("id, name, location")
        .eq("name", farmerName);

    if (farmerError) {
      console.error(
        "Farmer lookup failed:",
        farmerError
      );

      return Response.json(
        { error: farmerError.message },
        { status: 500 }
      );
    }

    if (!farmers || farmers.length === 0) {
      return Response.json({
        success: true,
        orders: [],
      });
    }

    const farmerIds = farmers.map(
      (farmer) => farmer.id
    );

    console.log(
      "HARVEX FARMER IDS:",
      farmerIds
    );

    // Find all inventory belonging to any farmer
    // with this farmer name.
    const { data: inventory, error: inventoryError } =
      await supabase
        .from("inventory")
        .select(`
          id,
          farmer_id,
          produce,
          quantity_kg,
          quality_grade,
          status,
          reserved_quantity_kg
        `)
        .in("farmer_id", farmerIds);

    if (inventoryError) {
      console.error(
        "Farmer inventory lookup failed:",
        inventoryError
      );

      return Response.json(
        { error: inventoryError.message },
        { status: 500 }
      );
    }

    const inventoryIds = (inventory ?? []).map(
      (item) => item.id
    );

    console.log(
      "HARVEX FARMER INVENTORY IDS:",
      inventoryIds
    );

    if (inventoryIds.length === 0) {
      return Response.json({
        success: true,
        orders: [],
      });
    }

    // Find order items connected to this farmer's inventory.
    const {
      data: orderItems,
      error: orderItemsError,
    } = await supabase
      .from("order_items")
      .select(`
        id,
        quantity_kg,
        inventory_id,
        orders (
          id,
          buyer_name,
          produce,
          requested_quantity_kg,
          required_grade,
          destination,
          fulfilled_quantity_kg,
          fulfillment_percentage,
          status,
          created_at
        )
      `)
      .in("inventory_id", inventoryIds)
      .order("id", { ascending: false });

    if (orderItemsError) {
      console.error(
        "Failed to load farmer order items:",
        orderItemsError
      );

      return Response.json(
        { error: orderItemsError.message },
        { status: 500 }
      );
    }

    const inventoryMap = new Map(
      (inventory ?? []).map((item) => [
        item.id,
        item,
      ])
    );

    const farmerMap = new Map(
      farmers.map((farmer) => [
        farmer.id,
        farmer,
      ])
    );

    const orders = (orderItems ?? []).map(
      (item: any) => {
        const inventoryItem =
          inventoryMap.get(item.inventory_id);

        const farmer =
          inventoryItem
            ? farmerMap.get(
                inventoryItem.farmer_id
              )
            : null;

        return {
          id: item.id,
          quantity_kg: item.quantity_kg,
          inventory_id: item.inventory_id,
          orders: item.orders,
          inventory: inventoryItem ?? null,
          farmer: farmer
            ? {
                id: farmer.id,
                name: farmer.name,
                location: farmer.location,
              }
            : null,
        };
      }
    );

    console.log(
      `HARVEX FARMER ORDERS: ${farmerName} → ${orders.length} incoming orders`
    );

    return Response.json({
      success: true,
      orders,
    });
  } catch (error) {
    console.error(
      "Farmer orders API error:",
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