export type DemandPoint = {
  date: string;
  quantity: number;
};

export type DemandForecast = {
  produce: string;
  forecastQuantity: number;
  trend: "Increasing" | "Stable" | "Decreasing";
  confidence: number;
  historicalAverage: number;
  recommendation: string;
};

function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function calculateTrend(values: number[]): DemandForecast["trend"] {
  if (values.length < 2) return "Stable";

  const firstHalf = values.slice(0, Math.ceil(values.length / 2));
  const secondHalf = values.slice(Math.floor(values.length / 2));

  const firstAverage = calculateAverage(firstHalf);
  const secondAverage = calculateAverage(secondHalf);

  const change =
    firstAverage > 0
      ? ((secondAverage - firstAverage) / firstAverage) * 100
      : 0;

  if (change > 10) return "Increasing";
  if (change < -10) return "Decreasing";

  return "Stable";
}

export function forecastDemand(
  produce: string,
  historicalData: DemandPoint[],
  forecastPeriods: number = 1
): DemandForecast {
  if (historicalData.length === 0) {
    return {
      produce,
      forecastQuantity: 0,
      trend: "Stable",
      confidence: 0,
      historicalAverage: 0,
      recommendation: "Not enough demand data for forecasting.",
    };
  }

  const quantities = historicalData.map((point) => point.quantity);

  const historicalAverage = calculateAverage(quantities);

  const trend = calculateTrend(quantities);

  // Give more importance to recent demand.
  const recentData = quantities.slice(-3);

  const recentAverage = calculateAverage(recentData);

  let trendMultiplier = 1;

  if (trend === "Increasing") {
    trendMultiplier = 1.15;
  } else if (trend === "Decreasing") {
    trendMultiplier = 0.9;
  }

  const forecastQuantity = Math.round(
    recentAverage * trendMultiplier * forecastPeriods
  );

  // Prototype confidence score.
  // More historical observations = higher confidence.
  const confidence = Math.min(
    95,
    Math.round(60 + historicalData.length * 4)
  );

  let recommendation = "";

  if (trend === "Increasing") {
    recommendation =
      "Demand is rising. X-MILE should increase farmer sourcing and prepare pooled inventory.";
  } else if (trend === "Decreasing") {
    recommendation =
      "Demand is declining. X-MILE should avoid unnecessary inventory buildup.";
  } else {
    recommendation =
      "Demand is relatively stable. Maintain balanced inventory levels.";
  }

  return {
    produce,
    forecastQuantity,
    trend,
    confidence,
    historicalAverage: Math.round(historicalAverage),
    recommendation,
  };
}