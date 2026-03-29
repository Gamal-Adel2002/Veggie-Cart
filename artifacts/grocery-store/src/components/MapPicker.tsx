import React, { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Circle, useMapEvents, useMap } from 'react-leaflet';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';

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

interface MapPickerProps {
  location: { latitude: number; longitude: number } | null;
  onChange: (lat: number, lng: number) => void;
  onAddressChange?: (address: string) => void;
  onZoneValidation?: (isValid: boolean) => void;
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

export function MapPicker({ location, onChange, onAddressChange, onZoneValidation, className }: MapPickerProps) {
  const position = location ? { lat: location.latitude, lng: location.longitude } : null;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number } | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleSearch = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setShowDropdown(false);
    try {
      const lang = navigator.language || 'en';
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=0`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': lang, 'User-Agent': 'FreshVeg/1.0' }
      });
      const data: NominatimResult[] = await res.json();
      setResults(data);
      setShowDropdown(true);
    } catch {
      setResults([]);
      setShowDropdown(true);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    } else if (e.key === 'Escape') {
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
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search address..."
              className="pr-4"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleSearch}
            disabled={loading}
            className="shrink-0"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </Button>
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
            <Navigation className="w-4 h-4" />
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
