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

    const { data, error } = await supabase
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
        ),
        inventory!inner (
          id,
          farmer_id,
          produce,
          quantity_kg,
          quality_grade,
          status,
          reserved_quantity_kg,
          farmers!inner (
            id,
            name,
            location
          )
        )
      `)
      .eq("inventory.farmers.name", farmerName)
      .order("id", { ascending: false });

    if (error) {
      console.error("Failed to load farmer orders:", error);

      return Response.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      orders: data ?? [],
    });
  } catch (error) {
    console.error("Farmer orders API error:", error);

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
