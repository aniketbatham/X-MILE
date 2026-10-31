export type PickupPoint = {
  farmerId: string;
  farmerName: string;
  location: string;
  quantity: number;
};

export type LogisticsPlan = {
  pickupPoints: PickupPoint[];
  destination: string;
  totalQuantity: number;
  estimatedDistanceKm: number;
  estimatedRouteTimeMinutes: number;
  routeCoordinates: [number, number][];
  optimized: boolean;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

/*
  Demo coordinates for X-MILE MVP.

  Production version:
  farmer onboarding will store precise farm coordinates
  or a geocoded pickup location in the database.
*/
const locationCoordinates: Record<string, Coordinates> = {
  Tumakuru: {
    latitude: 13.3409,
    longitude: 77.101,
  },

  Kunigal: {
    latitude: 13.023,
    longitude: 77.025,
  },

  Hassan: {
    latitude: 13.0033,
    longitude: 76.1004,
  },

  Bengaluru: {
    latitude: 12.9716,
    longitude: 77.5946,
  },

  Mysuru: {
    latitude: 12.2958,
    longitude: 76.6394,
  },

  Mandya: {
    latitude: 12.5218,
    longitude: 76.8951,
  },
};

function getCoordinates(location: string): Coordinates | null {
  return locationCoordinates[location] ?? null;
}

function buildFallbackPlan(
  pickupPoints: PickupPoint[],
  destination: string
): LogisticsPlan {
  const totalQuantity = pickupPoints.reduce(
    (sum, point) => sum + point.quantity,
    0
  );

  return {
    pickupPoints,
    destination,
    totalQuantity,
    estimatedDistanceKm: 0,
    estimatedRouteTimeMinutes: 0,
    routeCoordinates: [],
    optimized: false,
  };
}

export async function optimizeRoute(
  pickupPoints: PickupPoint[],
  destination: string
): Promise<LogisticsPlan> {
  const destinationCoordinates = getCoordinates(destination);

  const pointsWithCoordinates = pickupPoints
    .map((point) => ({
      point,
      coordinates: getCoordinates(point.location),
    }))
    .filter(
      (
        item
      ): item is {
        point: PickupPoint;
        coordinates: Coordinates;
      } => item.coordinates !== null
    );

  /*
    If we don't have coordinates for a location,
    keep the system functional rather than crashing.
  */
  if (
    !destinationCoordinates ||
    pointsWithCoordinates.length !== pickupPoints.length ||
    pickupPoints.length === 0
  ) {
    return buildFallbackPlan(pickupPoints, destination);
  }

  /*
    OSRM Trip service can optimize waypoint ordering.
    We use roundtrip=false and end=last so the route
    starts at the first pickup and finishes at the buyer.
  */

  const coordinates = [
    ...pointsWithCoordinates.map((item) => item.coordinates),
    destinationCoordinates,
  ];

  const coordinateString = coordinates
    .map(
      (coordinate) =>
        `${coordinate.longitude},${coordinate.latitude}`
    )
    .join(";");

  const url =
    `https://router.project-osrm.org/trip/v1/driving/` +
    `${coordinateString}` +
    `?roundtrip=false&source=first&destination=last&overview=full&geometries=geojson`;

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error(
        `OSRM request failed with status ${response.status}`
      );
    }

    const data = await response.json();

    if (data.code !== "Ok" || !data.trips?.length) {
      throw new Error("OSRM returned no valid route.");
    }

    const trip = data.trips[0];

    /*
      OSRM returns waypoint indices.
      Reconstruct the farmer order from those indices.
    */
    const waypoints = [...(data.waypoints ?? [])].sort(
      (a, b) => a.waypoint_index - b.waypoint_index
    );

    const optimizedPickupPoints: PickupPoint[] = [];

    for (const waypoint of waypoints) {
      const inputIndex = waypoint.trips_index;

      if (
        typeof inputIndex === "number" &&
        inputIndex < pointsWithCoordinates.length
      ) {
        optimizedPickupPoints.push(
          pointsWithCoordinates[inputIndex].point
        );
      }
    }

    /*
      If the OSRM response doesn't provide enough information,
      retain the original pickup list.
    */
    const finalPickupPoints =
      optimizedPickupPoints.length === pickupPoints.length
        ? optimizedPickupPoints
        : pickupPoints;

    const routeCoordinates: [number, number][] =
  (trip.geometry?.coordinates ?? []).map(
    ([longitude, latitude]: [number, number]) =>
      [latitude, longitude] as [number, number]
  );

    return {
      pickupPoints: finalPickupPoints,
      destination,
      totalQuantity: pickupPoints.reduce(
        (sum, point) => sum + point.quantity,
        0
      ),
      estimatedDistanceKm:
        Math.round((trip.distance / 1000) * 10) / 10,
      estimatedRouteTimeMinutes:
        Math.round(trip.duration / 60),
      routeCoordinates,
      optimized: true,
    };
  } catch (error) {
    console.error("OSRM routing failed:", error);

    /*
      Graceful fallback keeps the demo alive if the public
      routing service is temporarily unavailable.
    */
    return buildFallbackPlan(pickupPoints, destination);
  }
}
