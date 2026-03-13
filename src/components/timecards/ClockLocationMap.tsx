import { MapContainer, TileLayer, Marker, Circle, Popup } from 'react-leaflet';
import L from 'leaflet';
import { CheckCircle, XCircle } from 'lucide-react';

// Fix default marker icon (Leaflet + bundler issue)
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ClockLocationMapProps {
  lat?: number;
  lng?: number;
  geofenceRadius?: number;
  locationName?: string;
  isInside?: boolean;
}

const DEFAULT_LAT = 36.7378;
const DEFAULT_LNG = -119.7871;
const DEFAULT_RADIUS = 150; // meters

export function ClockLocationMap({
  lat = DEFAULT_LAT,
  lng = DEFAULT_LNG,
  geofenceRadius = DEFAULT_RADIUS,
  locationName = 'Downtown Kitchen',
  isInside = true,
}: ClockLocationMapProps) {
  const center: [number, number] = [lat, lng];
  const fenceColor = isInside ? '#16a34a' : '#dc2626';

  return (
    <div className="rounded-lg overflow-hidden border" style={{ borderColor: '#D1D9E6' }}>
      <div style={{ height: 180 }}>
        <MapContainer
          center={center}
          zoom={17}
          scrollWheelZoom={false}
          dragging={false}
          zoomControl={false}
          attributionControl={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <Circle
            center={center}
            radius={geofenceRadius}
            pathOptions={{ color: fenceColor, fillColor: fenceColor, fillOpacity: 0.12, weight: 2 }}
          />
          <Marker position={center}>
            <Popup>{locationName}</Popup>
          </Marker>
        </MapContainer>
      </div>
      <div className="flex items-center justify-between px-3 py-2" style={{ backgroundColor: '#EEF1F7' }}>
        <span className="text-xs font-medium" style={{ color: '#0B1628' }}>{locationName}</span>
        <span className="flex items-center gap-1 text-xs font-medium">
          {isInside ? (
            <>
              <CheckCircle className="w-3.5 h-3.5" style={{ color: '#16a34a' }} />
              <span style={{ color: '#16a34a' }}>Within Geofence</span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5" style={{ color: '#dc2626' }} />
              <span style={{ color: '#dc2626' }}>Outside Geofence</span>
            </>
          )}
        </span>
      </div>
    </div>
  );
}
