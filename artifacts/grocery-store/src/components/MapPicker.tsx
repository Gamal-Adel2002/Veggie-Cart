import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Navigation } from 'lucide-react';

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

interface MapPickerProps {
  location: { latitude: number; longitude: number } | null;
  onChange: (lat: number, lng: number) => void;
  className?: string;
}

const DEFAULT_CENTER = { lat: 30.0444, lng: 31.2357 }; // Cairo

function LocationMarker({ position, onChange }: { position: any, onChange: any }) {
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

export function MapPicker({ location, onChange, className }: MapPickerProps) {
  const position = location ? { lat: location.latitude, lng: location.longitude } : null;

  const handleCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        onChange(pos.coords.latitude, pos.coords.longitude);
      });
    }
  };

  return (
    <div className={`relative flex flex-col gap-3 ${className}`}>
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
          <LocationMarker position={position} onChange={onChange} />
        </MapContainer>
      </div>
      {location && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">{location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}</span>
        </div>
      )}
    </div>
  );
}
