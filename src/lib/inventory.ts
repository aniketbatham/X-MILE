import { supabase } from "./supabase";
import type { Farmer, Grade } from "./aggregation";

export async function getInventory(): Promise<Farmer[]> {
  const { data, error } = await supabase
    .from("inventory")
    .select(`
      id,
      produce,
      quantity_kg,
      quality_grade,
      quality_score,
      quality_confidence,
      quality_observations,
      status,
      reserved_quantity_kg,
      farmers (
        id,
        name,
        location
      )
    `)
    .eq("available", true);

  if (error) {
    console.error("Failed to load inventory:", error);
    return [];
  }

  return (data ?? []).map((item: any) => ({
    id: item.id,
    name: item.farmers?.name ?? "Unknown Farmer",
    produce: item.produce,
    quantity:
      Math.max(
        Number(item.quantity_kg) -
          Number(item.reserved_quantity_kg ?? 0),
     0
  ),
    grade: item.quality_grade as Grade,
    location: item.farmers?.location ?? "Unknown",

    // Real Gemini quality information
    qualityScore:
      typeof item.quality_score === "number"
        ? item.quality_score
        : null,

    qualityConfidence:
      typeof item.quality_confidence === "number"
        ? item.quality_confidence
        : null,

    qualityObservations:
      Array.isArray(item.quality_observations)
        ? item.quality_observations
        : [],

    // Real inventory status
    status:
      item.status === "RESERVED" ||
      item.status === "SOLD"
        ? item.status
        : "AVAILABLE",

    reservedQuantity:
      typeof item.reserved_quantity_kg === "number"
        ? item.reserved_quantity_kg
        : 0,

    // Distance will be calculated by the aggregation engine
    // based on the buyer's destination.
    distanceKm: 0,
  }));
}

export async function addInventoryItem(
  farmer: Farmer,
  qualityScore?: number,
  qualityConfidence?: number,
  qualityObservations?: string[]
): Promise<Farmer | null> {
  // First create the farmer
  const { data: farmerData, error: farmerError } = await supabase
    .from("farmers")
    .insert({
      name: farmer.name,
      location: farmer.location,
    })
    .select()
    .single();

  if (farmerError || !farmerData) {
    console.error("Failed to create farmer:", farmerError);
    return null;
  }

  // Then create the inventory listing
  const { data: inventoryData, error: inventoryError } = await supabase
    .from("inventory")
    .insert({
      farmer_id: farmerData.id,
      produce: farmer.produce,
      quantity_kg: farmer.quantity,
      quality_grade: farmer.grade,

      // Store the actual Gemini result
      quality_score: qualityScore ?? null,
      quality_confidence: qualityConfidence ?? null,
      quality_observations: qualityObservations ?? [],

      // New inventory lifecycle fields
      status: "AVAILABLE",
      reserved_quantity_kg: 0,

      available: true,
    })
    .select()
    .single();

  if (inventoryError || !inventoryData) {
    console.error("Failed to create inventory:", inventoryError);
    return null;
  }

  return {
    ...farmer,
    id: inventoryData.id,
    qualityScore: qualityScore ?? null,
    qualityConfidence: qualityConfidence ?? null,
    qualityObservations: qualityObservations ?? [],
    status: "AVAILABLE",
    reservedQuantity: 0,
  };
}
