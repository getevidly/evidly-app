import { useEffect, useRef } from 'react';

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  complianceScore: number;
  actionItems: number;
  status: string;
}

interface LocationMapProps {
  locations: Location[];
  onLocationClick?: (locationId: string) => void;
  selectedLocation?: string;
}

declare global {
  interface Window {
    L: any;
  }
}

export function LocationMap({ locations, onLocationClick, selectedLocation }: LocationMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  useEffect(() => {
    if (!mapRef.current || !window.L || mapInstanceRef.current) return;

    const map = window.L.map(mapRef.current, {
      center: [37.05, -120.25],
      zoom: 8,
      zoomControl: true,
      scrollWheelZoom: true,
    });

    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    markersRef.current.forEach((marker) => {
      mapInstanceRef.current.removeLayer(marker);
    });
    markersRef.current = [];

    locations.forEach((location) => {
      const getMarkerColor = (score: number) => {
        if (score >= 90) return '#22c55e';
        if (score >= 70) return '#eab308';
        return '#ef4444';
      };

      const color = getMarkerColor(location.complianceScore);

      const marker = window.L.circleMarker([location.lat, location.lng], {
        radius: 12,
        fillColor: color,
        fillOpacity: 1,
        color: '#fff',
        weight: 2,
      });

      marker.bindPopup(`
        <div style="text-align: center; min-width: 150px;">
          <div style="font-weight: 700; font-size: 15px; margin-bottom: 6px;"><b>${location.name}</b></div>
          <div style="font-size: 13px; margin-bottom: 4px;">Score: <b>${location.complianceScore}%</b></div>
          <div style="font-size: 13px; margin-bottom: 4px;">Status: <b>${location.status}</b></div>
          <div style="font-size: 13px;">Action Items: <b>${location.actionItems}</b></div>
        </div>
      `);

      marker.on('mouseover', function () {
        this.openPopup();
      });

      marker.on('click', function () {
        if (onLocationClick) {
          onLocationClick(location.id);
          mapInstanceRef.current.setView([location.lat, location.lng], 12, {
            animate: true,
            duration: 0.5,
          });
        }
      });

      marker.addTo(mapInstanceRef.current);
      markersRef.current.push(marker);
    });
  }, [locations, onLocationClick]);

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedLocation || selectedLocation === 'all') {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([37.05, -120.25], 8, {
          animate: true,
          duration: 0.5,
        });
      }
      return;
    }

    const location = locations.find((loc) => loc.id === selectedLocation);
    if (location && mapInstanceRef.current) {
      mapInstanceRef.current.setView([location.lat, location.lng], 12, {
        animate: true,
        duration: 0.5,
      });

      const markerIndex = locations.findIndex((loc) => loc.id === selectedLocation);
      if (markerIndex >= 0 && markersRef.current[markerIndex]) {
        markersRef.current[markerIndex].openPopup();
      }
    }
  }, [selectedLocation, locations]);

  return (
    <div
      ref={mapRef}
      className="w-full h-full rounded-lg"
      style={{ height: '180px' }}
    />
  );
}
