/** Haversine distance between two lat/lng points in km. */
export function haversineDistance(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Minimum distance (km) from a point to a GeoJSON LineString route. */
export function distanceToRoute(
  point: { lat: number; lng: number },
  routeCoordinates: [number, number][] // [lng, lat] from GeoJSON
): number {
  if (!routeCoordinates || routeCoordinates.length === 0) return Infinity;
  let minDist = Infinity;
  for (const coord of routeCoordinates) {
    const dist = haversineDistance(point, { lat: coord[1], lng: coord[0] });
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}
