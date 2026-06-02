/**
 * DriverMap — shows the driver's live position, pickup/destination pins and
 * a driving route line fetched from OSRM (same source used everywhere else
 * in the app).  Used in both ActiveRideScreen and RequestsScreen.
 */
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'sf-symbols-typescript';
import type { ActiveRide } from '@/api/rides';
import { JihColors } from '@/constants/theme';

interface Props {
  activeRide?:    ActiveRide | null;
  driverLocation: { latitude: number; longitude: number } | null;
  pickupLat?:     number;
  pickupLng?:     number;
}

const VEHICLE_SYMBOL: Record<string, SFSymbol> = {
  tuktuk: 'car.2.fill',
  car:    'car.fill',
  moto:   'motorcycle',
  van:    'bus.fill',
};

const SIEM_REAP = { latitude: 13.3671, longitude: 103.8498, latitudeDelta: 0.06, longitudeDelta: 0.06 };

export default function DriverMap({ activeRide, driverLocation, pickupLat, pickupLng }: Props) {
  const mapRef = useRef<MapView>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  const status   = activeRide?.status ?? null;
  const pLat     = pickupLat  ?? activeRide?.pickup_lat;
  const pLng     = pickupLng  ?? activeRide?.pickup_lng;
  const dLat     = activeRide?.destination_lat ?? null;
  const dLng     = activeRide?.destination_lng ?? null;
  const inProgress = status === 'in_progress';
  const targetLat  = (inProgress && dLat) ? dLat : pLat;
  const targetLng  = (inProgress && dLng) ? dLng : pLng;

  // ── Fetch driving route from driver → current target ──────────────────────
  useEffect(() => {
    if (!driverLocation || !targetLat || !targetLng) { setRouteCoords([]); return; }
    let cancelled = false;
    fetch(
      `https://router.project-osrm.org/route/v1/driving/` +
      `${driverLocation.longitude},${driverLocation.latitude};${targetLng},${targetLat}` +
      `?overview=full&geometries=geojson`
    )
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        if (data.routes?.[0]) {
          const coords = (data.routes[0].geometry.coordinates as [number, number][])
            .map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
          setRouteCoords(coords);
        }
      })
      .catch(() => { if (!cancelled) setRouteCoords([]); });
    return () => { cancelled = true; };
  }, [
    driverLocation?.latitude,
    driverLocation?.longitude,
    targetLat,
    targetLng,
  ]);

  // ── Auto-fit camera to show driver + target ───────────────────────────────
  useEffect(() => {
    if (!mapRef.current) return;
    const pts: { latitude: number; longitude: number }[] = [];
    if (driverLocation) pts.push(driverLocation);
    if (pLat && pLng) pts.push({ latitude: pLat, longitude: pLng });
    if (dLat && dLng) pts.push({ latitude: dLat, longitude: dLng });

    if (pts.length >= 2) {
      mapRef.current.fitToCoordinates(pts, {
        edgePadding: { top: 64, right: 40, bottom: 80, left: 40 },
        animated: true,
      });
    } else if (pts.length === 1) {
      mapRef.current.animateToRegion({
        ...pts[0],
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });
    }
  }, [
    driverLocation?.latitude,
    driverLocation?.longitude,
    pLat, pLng, dLat, dLng,
  ]);

  return (
    <View style={StyleSheet.absoluteFill}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={SIEM_REAP}
        showsUserLocation={false}
        showsMyLocationButton={false}
      >
        {/* Driver tuk-tuk marker */}
        {driverLocation && (
          <Marker coordinate={driverLocation} title="You" anchor={{ x: 0.5, y: 0.5 }}>
            <View style={s.driverMarker}>
              <SymbolView
                name={VEHICLE_SYMBOL[activeRide?.vehicle_type ?? ''] ?? 'car.fill'}
                style={s.driverIcon}
                tintColor="#fff"
                resizeMode="scaleAspectFit"
              />
            </View>
          </Marker>
        )}

        {/* Pickup pin (green) */}
        {pLat != null && pLng != null && (
          <Marker
            coordinate={{ latitude: pLat, longitude: pLng }}
            title="Pickup"
            pinColor="#22c55e"
          />
        )}

        {/* Destination pin (red) — shown once ride is in progress */}
        {dLat != null && dLng != null && (
          <Marker
            coordinate={{ latitude: dLat, longitude: dLng }}
            title="Destination"
            pinColor="#ef4444"
          />
        )}

        {/* Route line */}
        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={JihColors.gold}
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* No GPS banner */}
      {!driverLocation && (
        <View style={s.noGps}>
          <Text style={s.noGpsText}>📡 Getting your location…</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  driverMarker: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#1A2744',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: JihColors.gold,
  },
  driverIcon: { width: 20, height: 20 },
  noGps: {
    position: 'absolute', top: 12, left: 12, right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)', borderRadius: 10,
    padding: 10, alignItems: 'center',
  },
  noGpsText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
});
