import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, RefreshCw, Layers, Users, ShoppingBag, CheckCircle2, Sparkles } from 'lucide-react';
import { Client, Venda } from '../../types';
import { db } from '../../db';

// Fix default leaflet marker icon path issue in Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom Rose Pin Icon
const roseIcon = L.divIcon({
  className: 'custom-rose-pin',
  html: `<div style="
    background-color: #e11d48;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 3px solid #ffffff;
    box-shadow: 0 4px 10px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 14px;
  ">📍</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28]
});

interface ClientsMapProps {
  clients: Client[];
  orders: Venda[];
  onSelectClient?: (client: Client) => void;
}

export async function geocodeClientAddress(
  address: string,
  neighborhood?: string,
  city: string = 'Manaus'
): Promise<{ lat: number; lng: number } | null> {
  const fullQuery = [address, neighborhood, city, 'Brasil'].filter(Boolean).join(', ');
  if (!fullQuery.trim()) return null;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1`,
      { headers: { 'User-Agent': 'AFETO-App/1.0' } }
    );
    if (res.ok) {
      const data = await res.json();
      if (data && data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    }
  } catch (err) {
    console.warn('Geocoding error:', err);
  }

  // Fallback to neighborhood search
  if (neighborhood) {
    try {
      const nbQuery = [neighborhood, city, 'Brasil'].filter(Boolean).join(', ');
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(nbQuery)}&limit=1`,
        { headers: { 'User-Agent': 'AFETO-App/1.0' } }
      );
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          const jitterLat = (Math.random() - 0.5) * 0.006;
          const jitterLng = (Math.random() - 0.5) * 0.006;
          return {
            lat: parseFloat(data[0].lat) + jitterLat,
            lng: parseFloat(data[0].lon) + jitterLng
          };
        }
      }
    } catch (e) {
      // ignore
    }
  }

  return null;
}

export const ClientsMap: React.FC<ClientsMapProps> = ({ clients, orders, onSelectClient }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const [isGeocodingBatch, setIsGeocodingBatch] = useState(false);
  const [geocodedProgress, setGeocodedProgress] = useState({ current: 0, total: 0 });

  // Calculate neighborhood concentration
  const neighborhoodCounts = clients.reduce((acc, c) => {
    const nb = (c.neighborhood || 'Não informado').trim();
    acc[nb] = (acc[nb] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const sortedNeighborhoods = Object.entries(neighborhoodCounts)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 6);

  const mappedClients = clients.filter((c) => c.latitude && c.longitude);
  const unmappedClients = clients.filter((c) => !c.latitude || !c.longitude);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Manaus or first mapped client
      const initialCenter: [number, number] =
        mappedClients.length > 0 && mappedClients[0].latitude && mappedClients[0].longitude
          ? [mappedClients[0].latitude, mappedClients[0].longitude]
          : [-3.1190, -60.0217]; // Manaus, AM default

      const map = L.map(mapContainerRef.current, {
        center: initialCenter,
        zoom: 12,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    // Refresh markers
    if (markersLayerRef.current && mapInstanceRef.current) {
      markersLayerRef.current.clearLayers();

      const bounds = L.latLngBounds([]);

      mappedClients.forEach((client) => {
        if (!client.latitude || !client.longitude) return;

        const clientOrders = orders.filter((o) => o.clientId === client.id);
        const totalSpent = clientOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

        const popupContent = `
          <div style="font-family: sans-serif; padding: 4px; min-width: 180px;">
            <div style="font-weight: bold; font-size: 14px; color: #111827; margin-bottom: 2px;">
              ${client.name}
            </div>
            <div style="font-size: 11px; color: #e11d48; font-weight: 600; margin-bottom: 6px;">
              📍 ${client.address} ${client.neighborhood ? `(${client.neighborhood})` : ''}
            </div>
            <div style="font-size: 11px; color: #4b5563; border-top: 1px solid #f3f4f6; pt: 4px; margin-top: 4px;">
              🛍️ Pedidos: <strong>${clientOrders.length}</strong> | Gasto: <strong style="color:#059669;">R$ ${totalSpent.toFixed(2)}</strong>
            </div>
          </div>
        `;

        const marker = L.marker([client.latitude, client.longitude], { icon: roseIcon })
          .bindPopup(popupContent);

        markersLayerRef.current?.addLayer(marker);
        bounds.extend([client.latitude, client.longitude]);
      });

      if (mappedClients.length > 0 && bounds.isValid()) {
        mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
      }
    }
  }, [clients, orders]);

  // Batch Geocode Unmapped Clients
  const handleBatchGeocode = async () => {
    if (unmappedClients.length === 0 || isGeocodingBatch) return;

    setIsGeocodingBatch(true);
    setGeocodedProgress({ current: 0, total: unmappedClients.length });

    let count = 0;
    for (const client of unmappedClients) {
      if (client.address) {
        const coords = await geocodeClientAddress(client.address, client.neighborhood, client.city);
        if (coords) {
          const updated: Client = {
            ...client,
            latitude: coords.lat,
            longitude: coords.lng,
          };
          await db.clientes.put(updated);
          await db.clients.put(updated);
        }
      }
      count++;
      setGeocodedProgress({ current: count, total: unmappedClients.length });
      // Small delay to respect Nominatim rate limits (1 sec per req)
      await new Promise((r) => setTimeout(r, 1000));
    }

    setIsGeocodingBatch(false);
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden p-6 space-y-6">
      {/* Top Title & Info Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-rose-600 mb-1">
            <Navigation className="w-5 h-5" />
            <span className="text-xs font-bold uppercase tracking-wider">Inteligência Geográfica</span>
          </div>
          <h2 className="text-xl font-black text-stone-900 tracking-tight">Mapa de Concentração dos Clientes</h2>
          <p className="text-xs text-stone-500 mt-1">
            Visualize a localização de entrega dos seus clientes para planejar rotas de entrega e ações de marketing locais.
          </p>
        </div>

        {/* Action button for auto-geocoding */}
        <div className="flex items-center space-x-3">
          <div className="text-right hidden sm:block">
            <span className="text-xs font-bold text-stone-800 block">
              {mappedClients.length} de {clients.length} Mapeados
            </span>
            <span className="text-[10px] text-stone-400">
              {unmappedClients.length} pendentes de coordenadas
            </span>
          </div>

          {unmappedClients.length > 0 && (
            <button
              onClick={handleBatchGeocode}
              disabled={isGeocodingBatch}
              className="px-4 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-2xl transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 text-rose-400 ${isGeocodingBatch ? 'animate-spin' : ''}`} />
              <span>
                {isGeocodingBatch
                  ? `Mapeando (${geocodedProgress.current}/${geocodedProgress.total})...`
                  : 'Mapear Endereços Pendentes'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Map + Neighborhood Concentration Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Leaflet Map Canvas */}
        <div className="lg:col-span-3 bg-stone-100 rounded-2xl overflow-hidden border border-stone-200 relative shadow-inner">
          <div ref={mapContainerRef} className="w-full h-[450px] z-10" />

          {mappedClients.length === 0 && (
            <div className="absolute inset-0 bg-stone-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center text-white z-20">
              <MapPin className="w-12 h-12 text-rose-500 mb-2 animate-bounce" />
              <h3 className="text-lg font-bold">Nenhum cliente mapeado no momento</h3>
              <p className="text-xs text-stone-300 max-w-md mt-1 mb-4">
                Clique no botão acima para mapear automaticamente os endereços cadastrados dos seus clientes no mapa.
              </p>
              <button
                onClick={handleBatchGeocode}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-lg flex items-center space-x-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Mapear Endereços dos Clientes</span>
              </button>
            </div>
          )}
        </div>

        {/* Sidebar: Concentration Stats */}
        <div className="bg-stone-50 rounded-2xl p-5 border border-stone-200/80 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center space-x-2 text-stone-800 mb-3 border-b border-stone-200 pb-2">
              <Layers className="w-4 h-4 text-rose-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Top Bairros / Regiões</h3>
            </div>

            <div className="space-y-3">
              {sortedNeighborhoods.map(([neighborhood, count]) => {
                const numCount = Number(count);
                const percentage = clients.length > 0 ? Math.round((numCount / clients.length) * 100) : 0;
                return (
                  <div key={neighborhood} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-stone-800 truncate max-w-[140px]">
                        {neighborhood}
                      </span>
                      <span className="font-mono text-stone-500 font-semibold">
                        {count} ({percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-rose-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-[11px] text-stone-500 space-y-1">
            <div className="font-bold text-stone-800 flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-rose-600" />
              <span>Dica de Logística</span>
            </div>
            <p className="leading-relaxed">
              Bairros com maior densidade de clientes podem ter taxas de entrega agrupadas ou rotas dedicadas nos fins de semana.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
