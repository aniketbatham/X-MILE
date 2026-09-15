import { aggregateSupply } from "@/lib/aggregation";
import { getInventory } from "@/lib/inventory";

export async function GET() {
  try {
    const inventory = await getInventory();

    const result = aggregateSupply(
      {
        produce: "Tomatoes",
        quantity: 5000,
        grade: "A",
        destination: "Bengaluru",
      },
      inventory
    );

    return Response.json({
      success: true,
      inventoryCount: inventory.length,
      result,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}