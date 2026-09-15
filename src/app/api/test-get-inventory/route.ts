import { getInventory } from "@/lib/inventory";

export async function GET() {
  try {
    const inventory = await getInventory();

    return Response.json({
      success: true,
      count: inventory.length,
      inventory,
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