import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, NavigationArrow, CircleNotch } from '@phosphor-icons/react';
import { useDebounce } from '@/hooks/use-debounce';

// Fix leaflet icon paths in react
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface DeliveryZone {
  id: number;
  name: string;
  centerLat: number;
  centerLng: number;
  radiusKm: number;
  active: boolean;
}

interface PreviewCircle {
  lat: number;
  lng: number;
  radiusKm: number;
}

interface MapPickerProps {
  location: { latitude: number; longitude: number } | null;
  onChange: (lat: number, lng: number) => void;
  onAddressChange?: (address: string) => void;
  onZoneValidation?: (isValid: boolean) => void;
  previewCircle?: PreviewCircle | null;
  className?: string;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 }; // Cairo

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function LocationMarker({ position, onChange }: { position: { lat: number; lng: number } | null, onChange: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
      map.flyTo(e.latlng, map.getZoom());
    },
  });

  useEffect(() => {
    if (position) map.flyTo(position, map.getZoom());
  }, [position, map]);

  return position === null ? null : <Marker position={position} />;
}

function FlyTo({ target }: { target: { lat: number; lng: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target, 16);
  }, [target, map]);
  return null;
}

export function MapPicker({ location, onChange, onAddressChange, onZoneValidation, previewCircle, className }: MapPickerProps) {
  const position = location ? { lat: location.latitude, lng: location.longitude } : null;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebounce(query.trim(), 400);

  const { data: zones = [] } = useQuery<DeliveryZone[]>({
    queryKey: ['delivery-zones'],
    queryFn: async () => {
      const res = await fetch('/api/delivery-zones');
      if (!res.ok) return [];
      return res.json();
    },
    staleTime: 5 * 60 * 1000,
  });

  // Re-validate whenever location or zones change
  useEffect(() => {
    if (!onZoneValidation) return;
    if (!location) { onZoneValidation(true); return; }
    if (zones.length === 0) { onZoneValidation(true); return; }
    const inZone = zones.some(
      z => haversineKm(location.latitude, location.longitude, z.centerLat, z.centerLng) <= z.radiusKm
    );
    onZoneValidation(inZone);
  }, [location, zones, onZoneValidation]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setShowDropdown(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setShowDropdown(false);

    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(debouncedQuery)}&format=json&limit=5&addressdetails=0&countrycodes=eg`;
    fetch(url, {
      signal: controller.signal,
      headers: { 'Accept-Language': 'ar,en', 'User-Agent': 'FreshVeg/1.0' }
    })
      .then(res => res.json())
      .then((data: NominatimResult[]) => {
        setResults(data);
        setShowDropdown(true);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setResults([]);
          setShowDropdown(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => {
      controller.abort();
      setLoading(false);
    };
  }, [debouncedQuery]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const handleSelect = (result: NominatimResult) => {
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    onChange(lat, lng);
    onAddressChange?.(result.display_name);
    setFlyTarget({ lat, lng });
    setShowDropdown(false);
    setQuery(result.display_name);
  };

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
        setFlyTarget({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      });
    }
  };

  return (
    <div className={`relative flex flex-col gap-3 ${className}`}>
      {/* Search bar */}
      <div ref={dropdownRef} className="relative z-[500]">
        <div className="relative">
          {loading && (
            <CircleNotch className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground pointer-events-none" />
          )}
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search address in Egypt..."
            className="pe-9"
          />
        </div>

        {/* Dropdown results */}
        {showDropdown && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
            {results.length === 0 ? (
              <div className="px-4 py-3 text-sm text-muted-foreground">No results found</div>
            ) : (
              <ul>
                {results.map((r) => (
                  <li key={r.place_id}>
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors border-b border-border last:border-b-0 whitespace-normal break-words"
                      onClick={() => handleSelect(r)}
                    >
                      {r.display_name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Map */}
      <div className="relative">
        <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2">
          <Button
            type="button"
            size="icon"
            onClick={handleCurrentLocation}
            className="rounded-full shadow-lg"
          >
            <NavigationArrow className="w-4 h-4" />
          </Button>
        </div>
        <div className="h-64 sm:h-80 w-full rounded-2xl overflow-hidden border border-border shadow-sm">
          <MapContainer
            center={position || DEFAULT_CENTER}
            zoom={13}
            scrollWheelZoom={true}
            className="h-full w-full"
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {zones.map(zone => (
              <Circle
                key={zone.id}
                center={[zone.centerLat, zone.centerLng]}
                radius={zone.radiusKm * 1000}
                pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.1, weight: 2 }}
              />
            ))}
            {previewCircle && Number.isFinite(previewCircle.lat) && Number.isFinite(previewCircle.lng) && previewCircle.radiusKm > 0 && (
              <Circle
                key="preview"
                center={[previewCircle.lat, previewCircle.lng]}
                radius={previewCircle.radiusKm * 1000}
                pathOptions={{ color: '#2563eb', fillColor: '#2563eb', fillOpacity: 0.12, weight: 2, dashArray: '6 4' }}
              />
            )}
            <LocationMarker position={position} onChange={onChange} />
            <FlyTo target={flyTarget} />
          </MapContainer>
        </div>
      </div>

      {/* Coordinates display */}
      {location && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
        </div>
      )}
    </div>
  );
}
