'use client';

import { useEffect, useRef, useState } from 'react';
import type L from 'leaflet';

interface NearbyHotel {
  id: number;
  lat: number;
  lon: number;
  name: string;
  brand?: string;
  stars?: string;
  distance?: number;
  type?: string;
}

interface MapProps {
  address: string;
}

function getBrandFamily(name: string, brand?: string): { family: string; color: string; letter: string } {
  const text = ((name ?? '') + ' ' + (brand ?? '')).toLowerCase();
  if (/hilton|hampton|home2|homewood|doubletree|hgi|hilton garden|curio|tapestry/.test(text))
    return { family: 'Hilton', color: '#002B5C', letter: 'H' };
  if (/marriott|courtyard|fairfield|residence inn|springhill|westin|sheraton|autograph/.test(text))
    return { family: 'Marriott', color: '#8B1D2C', letter: 'M' };
  if (/ihg|holiday inn|crowne plaza|staybridge|avid|kimpton|intercontinental/.test(text))
    return { family: 'IHG', color: '#006241', letter: 'I' };
  if (/hyatt|place|house|regency|andaz/.test(text))
    return { family: 'Hyatt', color: '#003459', letter: 'Y' };
  if (/wyndham|days inn|super 8|la quinta|baymont|wingate/.test(text))
    return { family: 'Wyndham', color: '#2563EB', letter: 'W' };
  if (/choice|comfort|quality|sleep inn|cambria|woodspring|econo/.test(text))
    return { family: 'Choice', color: '#EA580C', letter: 'C' };
  if (/best western/.test(text))
    return { family: 'BW', color: '#1D4ED8', letter: 'B' };
  return { family: 'Other', color: '#6B7280', letter: '★' };
}

function calcDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CompetitorMapInner({ address }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [status, setStatus] = useState<'idle' | 'geocoding' | 'fetching' | 'done' | 'error'>('idle');
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [hotels, setHotels] = useState<NearbyHotel[]>([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [radiusMi, setRadiusMi] = useState(3);
  const [selected, setSelected] = useState<NearbyHotel | null>(null);

  const searchAddress = address.trim() || 'Austin, TX';
  const radiusM = radiusMi * 1609.34;

  // Geocode address whenever it changes
  useEffect(() => {
    if (!searchAddress) return;
    setStatus('geocoding');
    setErrorMsg('');
    setHotels([]);

    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}&limit=1`;

    fetch(url, {
      headers: { 'Accept-Language': 'en', 'User-Agent': 'HotelValueAnalyzer/1.0' },
    })
      .then(r => r.json())
      .then((data: Array<{ lat: string; lon: string }>) => {
        if (!data.length) {
          setStatus('error');
          setErrorMsg('Address not found. Try a city + state (e.g. "Austin, TX").');
          return;
        }
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        setCoords({ lat, lon });
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Geocoding failed. Check your connection.');
      });
  }, [searchAddress]);

  // Fetch hotels when coords or radius changes
  useEffect(() => {
    if (!coords) return;
    setStatus('fetching');
    const { lat, lon } = coords;

    const overpassQuery = `[out:json][timeout:20];
(
  node["tourism"="hotel"](around:${Math.round(radiusM)},${lat},${lon});
  node["tourism"="motel"](around:${Math.round(radiusM)},${lat},${lon});
  node["amenity"="hotel"](around:${Math.round(radiusM)},${lat},${lon});
  way["tourism"="hotel"](around:${Math.round(radiusM)},${lat},${lon});
  way["amenity"="hotel"](around:${Math.round(radiusM)},${lat},${lon});
);
out center body;`;

    fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body: overpassQuery,
    })
      .then(r => r.json())
      .then((data: { elements: Array<{ id: number; type: string; lat?: number; lon?: number; center?: { lat: number; lon: number }; tags?: Record<string, string> }> }) => {
        const elements = data.elements ?? [];
        const parsed: NearbyHotel[] = elements
          .map(el => {
            const elLat = el.lat ?? el.center?.lat;
            const elLon = el.lon ?? el.center?.lon;
            if (!elLat || !elLon) return null;
            const name = el.tags?.name ?? el.tags?.['name:en'] ?? 'Unnamed Hotel';
            const brand = el.tags?.brand ?? el.tags?.operator ?? undefined;
            const stars = el.tags?.stars ?? el.tags?.['tourism:stars'] ?? undefined;
            const dist = calcDistance(lat, lon, elLat, elLon);
            return { id: el.id, lat: elLat, lon: elLon, name, brand, stars, distance: dist, type: el.tags?.tourism ?? el.tags?.amenity };
          })
          .filter(Boolean)
          .sort((a, b) => (a!.distance ?? 0) - (b!.distance ?? 0)) as NearbyHotel[];
        setHotels(parsed);
        setStatus('done');
      })
      .catch(() => {
        setStatus('error');
        setErrorMsg('Failed to load nearby hotels. Try again.');
      });
  }, [coords, radiusM]);

  // Initialize / update map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    import('leaflet').then(Leaflet => {
      import('leaflet/dist/leaflet.css');

      const Lmap = Leaflet.default ?? Leaflet;

      if (!mapRef.current) {
        const center: [number, number] = coords ? [coords.lat, coords.lon] : [30.2672, -97.7431];
        mapRef.current = Lmap.map(mapContainerRef.current!, { zoomControl: true, scrollWheelZoom: true });
        Lmap.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }).addTo(mapRef.current);
        mapRef.current.setView(center, 13);
      }

      if (!coords) return;

      const map = mapRef.current;
      map.eachLayer((layer: L.Layer) => { if ((layer as L.Marker).getLatLng) map.removeLayer(layer); });

      Lmap.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);

      // Radius circle
      Lmap.circle([coords.lat, coords.lon], {
        radius: radiusM,
        color: '#f59e0b',
        fillColor: '#f59e0b',
        fillOpacity: 0.05,
        weight: 1.5,
        dashArray: '6 4',
      }).addTo(map);

      // Subject property marker
      const subjectIcon = Lmap.divIcon({
        html: `<div style="width:40px;height:40px;border-radius:50%;background:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:18px;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.5)">🏨</div>`,
        className: '',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24],
      });

      Lmap.marker([coords.lat, coords.lon], { icon: subjectIcon })
        .addTo(map)
        .bindPopup(`<div style="font-family:sans-serif;font-size:13px"><strong style="color:#f59e0b">📍 Subject Property</strong><br/>${searchAddress}</div>`)
        .openPopup();

      // Competitor markers
      hotels.forEach(hotel => {
        const bf = getBrandFamily(hotel.name, hotel.brand);
        const icon = Lmap.divIcon({
          html: `<div style="width:30px;height:30px;border-radius:50%;background:${bf.color};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;color:white;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.4)">${bf.letter}</div>`,
          className: '',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -18],
        });

        const starsHtml = hotel.stars ? ` · ${'★'.repeat(Number(hotel.stars))}` : '';
        Lmap.marker([hotel.lat, hotel.lon], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;font-size:12px;min-width:160px">
              <strong style="font-size:13px;color:${bf.color}">${hotel.name}</strong>
              ${starsHtml ? `<div style="color:#f59e0b">${starsHtml}</div>` : ''}
              ${hotel.brand ? `<div style="color:#666">Brand: ${hotel.brand}</div>` : ''}
              <div style="color:#888">Family: ${bf.family}</div>
              <div style="color:#555;margin-top:4px">📏 ${hotel.distance?.toFixed(2)} mi away</div>
            </div>
          `);
      });

      map.setView([coords.lat, coords.lon], radiusMi <= 2 ? 15 : radiusMi <= 5 ? 13 : 11);
    });
  }, [coords, hotels, radiusM, radiusMi, searchAddress]);

  // Cleanup on unmount
  useEffect(() => {
    return () => { mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  const brandGroups = hotels.reduce<Record<string, number>>((acc, h) => {
    const bf = getBrandFamily(h.name, h.brand);
    acc[bf.family] = (acc[bf.family] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 12, color: '#64748b' }}>Search radius:</div>
        {[1, 2, 3, 5, 10].map(r => (
          <button
            key={r}
            onClick={() => setRadiusMi(r)}
            style={{
              padding: '5px 12px',
              background: radiusMi === r ? 'rgba(245,158,11,0.15)' : '#0b1220',
              border: `1px solid ${radiusMi === r ? '#f59e0b' : '#1e2d4a'}`,
              borderRadius: 6,
              color: radiusMi === r ? '#f59e0b' : '#64748b',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {r} mi
          </button>
        ))}
        {status === 'geocoding' && <span style={{ fontSize: 12, color: '#64748b' }}>📍 Geocoding address…</span>}
        {status === 'fetching' && <span style={{ fontSize: 12, color: '#64748b' }}>🔍 Finding nearby hotels…</span>}
        {status === 'done' && <span style={{ fontSize: 12, color: '#10b981' }}>✓ {hotels.length} hotels within {radiusMi} mi</span>}
        {status === 'error' && <span style={{ fontSize: 12, color: '#ef4444' }}>⚠ {errorMsg}</span>}
      </div>

      {/* Map container */}
      <div
        ref={mapContainerRef}
        style={{
          height: 420,
          borderRadius: 10,
          border: '1px solid #1e2d4a',
          overflow: 'hidden',
          background: '#0b1220',
        }}
      />

      {/* Brand summary */}
      {hotels.length > 0 && (
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 8 }}>
          {Object.entries(brandGroups).sort((a, b) => b[1] - a[1]).map(([family, count]) => {
            const colors: Record<string, string> = {
              Hilton: '#002B5C', Marriott: '#8B1D2C', IHG: '#006241',
              Hyatt: '#003459', Wyndham: '#2563EB', Choice: '#EA580C',
              BW: '#1D4ED8', Other: '#6B7280',
            };
            return (
              <div key={family} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 10px',
                background: '#0e1629',
                border: '1px solid #1e2d4a',
                borderRadius: 6,
                fontSize: 12,
              }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: colors[family] ?? '#6B7280', flexShrink: 0 }} />
                <span style={{ color: '#94a3b8' }}>{family}</span>
                <span style={{ color: '#f59e0b', fontWeight: 700, marginLeft: 'auto' }}>{count}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Nearby hotel list */}
      {hotels.length > 0 && (
        <div style={{ marginTop: 12, maxHeight: 220, overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#0b1220' }}>
                {['Hotel', 'Brand Family', 'Stars', 'Distance'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #1e2d4a', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hotels.slice(0, 30).map((hotel, i) => {
                const bf = getBrandFamily(hotel.name, hotel.brand);
                return (
                  <tr
                    key={hotel.id}
                    onClick={() => setSelected(hotel === selected ? null : hotel)}
                    style={{
                      borderBottom: '1px solid #1e2d4a',
                      cursor: 'pointer',
                      background: selected?.id === hotel.id ? 'rgba(245,158,11,0.08)' : i % 2 === 0 ? 'rgba(0,0,0,0.1)' : undefined,
                    }}
                  >
                    <td style={{ padding: '7px 10px', color: '#e2e8f0', fontWeight: 500 }}>{hotel.name}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{ color: bf.color, background: `${bf.color}22`, padding: '2px 7px', borderRadius: 4, fontWeight: 600, fontSize: 11 }}>{bf.family}</span>
                    </td>
                    <td style={{ padding: '7px 10px', color: '#f59e0b' }}>{hotel.stars ? '★'.repeat(Number(hotel.stars)) : '—'}</td>
                    <td style={{ padding: '7px 10px', color: '#94a3b8' }}>{hotel.distance?.toFixed(2)} mi</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
