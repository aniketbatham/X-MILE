"use client";

import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import { useEffect } from "react";

type PickupPoint = {
  farmerId: string;
  farmerName: string;
  location: string;
  quantity: number;
};

type LogisticsMapProps = {
  pickupPoints: PickupPoint[];
  routeCoordinates: [number, number][];
  destination: string;
};

const pickupIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",

  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const destinationIcon = new L.Icon({
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",

  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -40],
  shadowSize: [41, 41],
});

function MapBounds({
  coordinates,
}: {
  coordinates: [number, number][];
}) {
  const map = useMap();

  useEffect(() => {
    if (coordinates.length === 0) return;

    const bounds = L.latLngBounds(coordinates);

    map.fitBounds(bounds, {
      padding: [40, 40],
    });
  }, [coordinates, map]);

  return null;
}

export default function LogisticsMap({
  pickupPoints,
  routeCoordinates,
  destination,
}: LogisticsMapProps) {
  if (routeCoordinates.length === 0) {
    return (
      <div className="flex h-[420px] items-center justify-center rounded-2xl bg-slate-100 text-center">
        <div>
          <div className="text-4xl">🗺️</div>

          <p className="mt-3 font-semibold text-slate-700">
            Route map unavailable
          </p>

          <p className="mt-1 text-sm text-slate-500">
            Generate a valid OSRM route to display the map.
          </p>
        </div>
      </div>
    );
  }

  const center = routeCoordinates[
    Math.floor(routeCoordinates.length / 2)
  ] ?? [12.9716, 77.5946];

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200">
      <MapContainer
        center={center}
        zoom={8}
        scrollWheelZoom={false}
        className="h-[420px] w-full"
      >
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapBounds coordinates={routeCoordinates} />

        {/* ACTUAL OSRM ROUTE */}
        <Polyline
          positions={routeCoordinates}
          pathOptions={{
            weight: 6,
          }}
        />

        {/* FARMER PICKUPS */}
        {pickupPoints.map((point, index) => {
          const coordinate = findNearestRouteCoordinate(
            point.location,
            routeCoordinates
          );

          if (!coordinate) return null;

          return (
            <Marker
              key={point.farmerId}
              position={coordinate}
              icon={pickupIcon}
            >
              <Popup>
                <div className="min-w-[180px]">
                  <p className="font-bold">
                    Pickup #{index + 1}
                  </p>

                  <p className="mt-1 font-semibold">
                    {point.farmerName}
                  </p>

                  <p className="text-sm">
                    {point.location}
                  </p>

                  <p className="mt-1 text-sm">
                    Quantity:{" "}
                    <strong>{point.quantity} kg</strong>
                  </p>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* DESTINATION */}
        <Marker
          position={routeCoordinates[routeCoordinates.length - 1]}
          icon={destinationIcon}
        >
          <Popup>
            <div>
              <p className="font-bold">
                HARVEX Buyer
              </p>

              <p className="mt-1 text-sm">
                Destination: {destination}
              </p>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

/*
  The OSRM route geometry contains the road path,
  but our pickup locations are represented by their
  known coordinates in logistics.ts.

  For the MVP, we locate the pickup point approximately
  along the route using the known location coordinates.
*/

const locationCoordinates: Record<
  string,
  [number, number]
> = {
  Tumakuru: [13.3409, 77.101],
  Kunigal: [13.023, 77.025],
  Hassan: [13.0033, 76.1004],
  Bengaluru: [12.9716, 77.5946],
  Mysuru: [12.2958, 76.6394],
  Mandya: [12.5218, 76.8951],
};

function findNearestRouteCoordinate(
  location: string,
  routeCoordinates: [number, number][]
): [number, number] | null {
  const target = locationCoordinates[location];

  if (!target || routeCoordinates.length === 0) {
    return null;
  }

  let nearest = routeCoordinates[0];
  let nearestDistance = Infinity;

  for (const coordinate of routeCoordinates) {
    const distance =
      Math.pow(coordinate[0] - target[0], 2) +
      Math.pow(coordinate[1] - target[1], 2);

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = coordinate;
    }
  }

  return nearest;
}
