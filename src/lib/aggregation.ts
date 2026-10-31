export type Grade = "A" | "B" | "C";

export type Farmer = {
  id: string;
  name: string;
  produce: string;
  quantity: number;
  grade: Grade;
  location: string;
  distanceKm: number;

  qualityScore?: number | null;
  qualityConfidence?: number | null;
  qualityObservations?: string[];

  status?: "AVAILABLE" | "RESERVED" | "SOLD";
  reservedQuantity?: number;
};

export type BuyerRequirement = {
  produce: string;
  quantity: number;
  grade: Grade | "Any";
  destination: string;
};

export type AggregationSelection = Farmer & {
  allocatedQuantity: number;
  qualityScore: number;
  selectionReason: string[];
};

export type AggregationResult = {
  selectedFarmers: Farmer[];
  totalQuantity: number;
  requestedQuantity: number;
  remainingQuantity: number;
  fulfillmentPercentage: number;

  // Extra intelligence for the X-MILE demo
  selectionDetails: AggregationSelection[];
  eligibleFarmerCount: number;
  rejectedFarmerCount: number;
  qualityPriority: string;
  aggregationSummary: string;
};

function normalizeProduce(value: string): string {
  const text = value.toLowerCase().trim();

  if (text === "tomato" || text === "tomatoes") {
    return "tomato";
  }

  return text.replace(/s$/, "");
}

function gradeMatches(
  farmerGrade: Grade,
  requiredGrade: Grade | "Any"
): boolean {
  if (requiredGrade === "Any") {
    return true;
  }

  const allowedGrades: Record<Grade, Grade[]> = {
    A: ["A"],
    B: ["A", "B"],
    C: ["A", "B", "C"],
  };

  return allowedGrades[requiredGrade].includes(farmerGrade);
}

/*
  Convert the A/B/C grade into a numerical quality score.

  These are procurement-priority scores, NOT AI visual scores.
  The actual AI quality score is stored separately in inventory.
*/
function getGradeScore(grade: Grade): number {
  const scores: Record<Grade, number> = {
    A: 90,
    B: 75,
    C: 60,
  };

  return scores[grade];
}

/*
  Calculate a procurement score.

  X-MILE prioritizes:
  1. Quality
  2. Shorter pickup distance
  3. Availability of useful quantity
*/
function getProcurementScore(farmer: Farmer): number {
  const qualityScore = getGradeScore(farmer.grade);

  const distancePenalty = Math.min(
    farmer.distanceKm * 0.08,
    20
  );

  const quantityBonus = Math.min(
    farmer.quantity / 1000,
    5
  );

  return (
    qualityScore -
    distancePenalty +
    quantityBonus
  );
}

export function aggregateSupply(
  requirement: BuyerRequirement,
  availableFarmers: Farmer[]
): AggregationResult {
  const requiredProduce = normalizeProduce(
    requirement.produce
  );

  /*
    STEP 1
    Filter inventory by produce, quality and availability.
  */
  const eligibleFarmers = availableFarmers.filter((farmer) => {
    const sameProduce =
      normalizeProduce(farmer.produce) === requiredProduce;

    const acceptableGrade = gradeMatches(
      farmer.grade,
      requirement.grade
    );

    return (
      sameProduce &&
      acceptableGrade &&
      farmer.quantity > 0
    );
  });

  /*
    STEP 2
    Rank eligible inventory using a procurement score.

    Higher quality comes first.
    When quality is similar, shorter distance is preferred.
    Larger useful inventory gets a small bonus.
  */
  eligibleFarmers.sort((a, b) => {
    const scoreDifference =
      getProcurementScore(b) -
      getProcurementScore(a);

    if (Math.abs(scoreDifference) > 0.5) {
      return scoreDifference;
    }

    return a.distanceKm - b.distanceKm;
  });

  /*
    STEP 3
    Pool fragmented inventory until the buyer's
    requested quantity is fulfilled.
  */
  let remaining = requirement.quantity;

  const selectedFarmers: Farmer[] = [];
  const selectionDetails: AggregationSelection[] = [];

  for (const farmer of eligibleFarmers) {
    if (remaining <= 0) {
      break;
    }

    const allocatedQuantity = Math.min(
      farmer.quantity,
      remaining
    );

    const qualityScore =
      getGradeScore(farmer.grade);

    const selectionReason: string[] = [];

    selectionReason.push(
      `Grade ${farmer.grade} meets the buyer requirement`
    );

    if (farmer.distanceKm <= 50) {
      selectionReason.push(
        "Short pickup distance"
      );
    } else if (farmer.distanceKm <= 100) {
      selectionReason.push(
        "Moderate pickup distance"
      );
    } else {
      selectionReason.push(
        "Selected because quality and available quantity remain valuable"
      );
    }

    if (allocatedQuantity === farmer.quantity) {
      selectionReason.push(
        "Full available inventory allocated"
      );
    } else {
      selectionReason.push(
        "Partial quantity allocated to complete the bulk order"
      );
    }

    selectedFarmers.push({
      ...farmer,
      quantity: allocatedQuantity,
    });

    selectionDetails.push({
      ...farmer,
      quantity: allocatedQuantity,
      allocatedQuantity,
      qualityScore,
      selectionReason,
    });

    remaining -= allocatedQuantity;
  }

  const totalQuantity =
    requirement.quantity - remaining;

  const fulfillmentPercentage =
    requirement.quantity > 0
      ? Math.round(
          (totalQuantity / requirement.quantity) * 100
        )
      : 0;

  const rejectedFarmerCount =
    availableFarmers.length -
    eligibleFarmers.length;

  /*
    STEP 4
    Generate an explanation suitable for the
    X-MILE buyer dashboard and SIH demo.
  */
  let aggregationSummary = "";

  if (remaining <= 0) {
    aggregationSummary =
      `X-MILE pooled ${selectedFarmers.length} farmer inventories ` +
      `to fulfill the ${requirement.quantity} kg ${requirement.produce} ` +
      `requirement while prioritizing quality and efficient pickup.`;
  } else {
    aggregationSummary =
      `X-MILE pooled ${selectedFarmers.length} eligible farmer inventories ` +
      `and fulfilled ${fulfillmentPercentage}% of the requested quantity. ` +
      `${remaining} kg remains unavailable at the required quality.`;
  }

  let qualityPriority = "";

  if (requirement.grade === "A") {
    qualityPriority =
      "Strict Grade A matching enabled — lower grades are excluded.";
  } else if (requirement.grade === "B") {
    qualityPriority =
      "Grade B requirement — Grade A and B inventory are eligible, with Grade A prioritized.";
  } else if (requirement.grade === "C") {
    qualityPriority =
      "Grade C requirement — A, B and C inventory are eligible, with higher grades prioritized.";
  } else {
    qualityPriority =
      "Any-grade procurement enabled — higher-quality inventory is prioritized.";
  }

  return {
    selectedFarmers,
    totalQuantity,
    requestedQuantity: requirement.quantity,
    remainingQuantity: remaining,
    fulfillmentPercentage,

    selectionDetails,
    eligibleFarmerCount: eligibleFarmers.length,
    rejectedFarmerCount,
    qualityPriority,
    aggregationSummary,
  };
}
