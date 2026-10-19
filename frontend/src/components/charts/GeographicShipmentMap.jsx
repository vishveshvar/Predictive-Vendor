import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Truck, MapPin, Package } from 'lucide-react';

// Fix Leaflet default icon paths in bundler
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom styled pin icons
const createCustomIcon = (color = '#0284c7') =>
  L.divIcon({
    className: 'custom-leaflet-pin',
    html: `<div style="background-color: ${color}; width: 14px; height: 14px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 10px ${color};"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

export default function GeographicShipmentMap({ stores = [], orders = [] }) {
  // Central Logistics Hub (Chicago)
  const hubCoords = [41.8781, -87.6298];

  const defaultStores = [
    { name: 'Apex Metro Flagship', city: 'San Francisco', lat: 37.7749, lng: -122.4194, orders: 12 },
    { name: 'TechHaven Downtown', city: 'New York', lat: 40.7128, lng: -74.006, orders: 10 },
    { name: 'Silicon Gateway', city: 'Austin', lat: 30.2672, lng: -97.7431, orders: 8 },
    { name: 'Pacific Pulse', city: 'Seattle', lat: 47.6062, lng: -122.3321, orders: 6 },
    { name: 'Sunbelt Audio', city: 'Miami', lat: 25.7617, lng: -80.1918, orders: 5 },
    { name: 'Rocky Mountain Gear', city: 'Denver', lat: 39.7392, lng: -104.9903, orders: 4 },
  ];

  const activeStores = stores.length > 0 ? stores : defaultStores;

  return (
    <div className="glass-panel p-5 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-cyan-500" />
            <span>Shipment Transit Map</span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Logistics routes and shipments from central distribution hub to retail stores.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5 text-cyan-500 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Active Shipments</span>
          </span>
        </div>
      </div>

      <div className="h-80 w-full rounded-xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 relative">
        <MapContainer
          center={[39.8283, -98.5795]}
          zoom={4}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Central Hub Marker */}
          <Marker position={hubCoords} icon={createCustomIcon('#f59e0b')}>
            <Popup>
              <div className="text-xs p-1">
                <strong className="text-amber-600 block">Wholesale Central Hub</strong>
                <span>Chicago, IL • Primary Logistics Facility</span>
              </div>
            </Popup>
          </Marker>

          {/* Store Markers & Route Polylines */}
          {activeStores.map((s, idx) => (
            <React.Fragment key={idx}>
              <Marker position={[s.lat, s.lng]} icon={createCustomIcon('#0284c7')}>
                <Popup>
                  <div className="text-xs p-1">
                    <strong className="text-brand-600 block">{s.name}</strong>
                    <span>{s.city}</span>
                  </div>
                </Popup>
              </Marker>

              {/* Transit Polyline from Chicago to Store */}
              <Polyline
                positions={[hubCoords, [s.lat, s.lng]]}
                pathOptions={{
                  color: '#06b6d4',
                  weight: 2,
                  dashArray: '5, 8',
                  opacity: 0.6,
                }}
              />
            </React.Fragment>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
