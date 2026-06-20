'use client';

// Static imports — works because this file is only ever loaded client-side
// (parent CompetitorMap.tsx wraps this in `dynamic(..., { ssr: false })`)
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';

// Fix the broken default icon paths that Webpack/Turbopack cause
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// ── Types ────────────────────────────────────────────────────────────────────

interface NearbyHotel {
  id: number;
  lat: number;
  lon: number;
  name: string;
  brand?: string;
  stars?: string;
  distance: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBrand(name: string, brand?: string) {
  const t = `${name} ${brand ?? ''}`.toLowerCase();
  if (/hampton|home2|homewood|doubletree|hilton garden|curio|tapestry|hilton/.test(t))  return { family: 'Hilton',   color: '#1D4ED8', letter: 'H' };
  if (/courtyard|fairfield|residence inn|springhill|westin|sheraton|marriott/.test(t))  return { family: 'Marriott', color: '#9B1C1C', letter: 'M' };
  if (/holiday inn|crowne plaza|staybridge|avid|kimpton|intercontinental|ihg/.test(t)) return { family: 'IHG',      color: '#065F46', letter: 'I' };
  if (/hyatt place|hyatt house|hyatt regency|andaz|hyatt/.test(t))                     return { family: 'Hyatt',    color: '#1E3A5F', letter: 'Y' };
  if (/days inn|super 8|la quinta|baymont|wingate|wyndham/.test(t))                    return { family: 'Wyndham',  color: '#6D28D9', letter: 'W' };
  if (/comfort|quality inn|sleep inn|cambria|woodspring|econo|choice/.test(t))         return { family: 'Choice',   color: '#C2410C', letter: 'C' };
  if (/best western/.test(t))                                                           return { family: 'BW',       color: '#1E40AF', letter: 'B' };
  return { family: 'Other', color: '#4B5563', letter: '◆' };
}

function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CompetitorMapInner({ address }: { address: string }) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<L.Map | null>(null);
  const markersRef    = useRef<L.LayerGroup | null>(null);  // only markers, never the tile layer
  const circleRef     = useRef<L.Circle | null>(null);
  const subjectRef    = useRef<L.Marker | null>(null);

  const [status, setStatus] = useState<'idle' | 'geocoding' | 'fetching' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg]   = useState('');
  const [coords, setCoords]       = useState<{ lat: number; lon: number } | null>(null);
  const [hotels, setHotels]       = useState<NearbyHotel[]>([]);
  const [radiusMi, setRadiusMi]   = useState(3);
  const [selected, setSelected]   = useState<NearbyHotel | null>(null);
  const [retryKey, setRetryKey]   = useState(0);

  const searchAddr = address.trim() || 'Austin, TX';
  const radiusM    = radiusMi * 1609.34;

  // ── 1. Initialize map ONCE ────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center:           [30.2672, -97.7431],
      zoom:             12,
      zoomControl:      true,
      scrollWheelZoom:  true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    markersRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current   = null;
      markersRef.current = null;
    };
  }, []);

  // ── 2. Geocode address (with 600 ms debounce) ─────────────────────────────
  useEffect(() => {
    setStatus('geocoding');
    setErrorMsg('');
    setHotels([]);
    setCoords(null);

    const timer = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(searchAddr)}`;
        const res  = await fetch(url, { headers: { 'Accept': 'application/json' } });
        const data = await res.json() as Array<{ lat: string; lon: string }>;

        if (!data.length) {
          setStatus('error');
          setErrorMsg('Address not found — try "Hampton Inn, Austin TX" or just a city.');
          return;
        }
        setCoords({ lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) });
      } catch {
        setStatus('error');
        setErrorMsg('Geocoding failed — check your network connection.');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [searchAddr]);

  // ── 3. Fetch nearby hotels when coords or radius changes ──────────────────
  useEffect(() => {
    if (!coords) return;

    setStatus('fetching');
    const { lat, lon } = coords;

    const overpassQuery = `[out:json][timeout:18];
(
  node["tourism"="hotel"](around:${Math.round(radiusM)},${lat},${lon});
  node["tourism"="motel"](around:${Math.round(radiusM)},${lat},${lon});
  node["amenity"="hotel"](around:${Math.round(radiusM)},${lat},${lon});
  way["tourism"="hotel"](around:${Math.round(radiusM)},${lat},${lon});
  way["amenity"="hotel"](around:${Math.round(radiusM)},${lat},${lon});
  relation["tourism"="hotel"](around:${Math.round(radiusM)},${lat},${lon});
);
out center tags;`;

    type OverpassEl = {
      id: number; lat?: number; lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    };

    function parseOverpass(elements: OverpassEl[]): NearbyHotel[] {
      const results: NearbyHotel[] = [];
      for (const el of elements) {
        const elLat = el.lat ?? el.center?.lat;
        const elLon = el.lon ?? el.center?.lon;
        if (elLat == null || elLon == null) continue;
        results.push({
          id:       el.id,
          lat:      elLat,
          lon:      elLon,
          name:     el.tags?.name ?? el.tags?.['name:en'] ?? 'Unnamed Hotel',
          brand:    el.tags?.brand ?? el.tags?.operator,
          stars:    el.tags?.stars,
          distance: haversine(lat, lon, elLat, elLon),
        });
      }
      return results.sort((a, b) => a.distance - b.distance);
    }

    // Fallback: Nominatim bounded hotel search (client-side, already in CSP)
    async function nominatimFallback(): Promise<NearbyHotel[]> {
      const deg = (radiusM / 111320) * 1.5; // slightly larger box for coverage
      const viewbox = `${lon - deg},${lat + deg},${lon + deg},${lat - deg}`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=hotel&viewbox=${viewbox}&bounded=1&limit=50&accept-language=en`;
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) throw new Error(`Nominatim ${r.status}`);
      const data = await r.json() as Array<{
        place_id: number; lat: string; lon: string; display_name: string;
        class?: string; type?: string;
      }>;
      return data
        .map(p => ({
          id:       p.place_id,
          lat:      parseFloat(p.lat),
          lon:      parseFloat(p.lon),
          name:     p.display_name.split(',')[0].trim() || 'Hotel',
          brand:    undefined as string | undefined,
          stars:    undefined as string | undefined,
          distance: haversine(lat, lon, parseFloat(p.lat), parseFloat(p.lon)),
        }))
        .filter(h => h.distance <= radiusM / 1609.34)
        .sort((a, b) => a.distance - b.distance);
    }

    const controller = new AbortController();

    // Primary: server-side proxy races 3 Overpass mirrors in parallel
    fetch('/api/overpass', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `data=${encodeURIComponent(overpassQuery)}`,
      signal:  controller.signal,
    })
      .then(r => {
        if (!r.ok) throw new Error(`proxy ${r.status}`);
        return r.json() as Promise<{ elements?: OverpassEl[]; error?: string }>;
      })
      .then(data => {
        if (data.error) throw new Error(data.error);
        setHotels(parseOverpass(data.elements ?? []));
        setStatus('done');
      })
      .catch(async err => {
        if (err.name === 'AbortError') return;
        // Fallback: Nominatim hotel search (different API, better availability)
        try {
          const results = await nominatimFallback();
          setHotels(results);
          setStatus('done');
        } catch {
          setStatus('error');
          setErrorMsg('Hotel data unavailable for this area — try a different radius or address.');
        }
      });

    return () => controller.abort();
  }, [coords, radiusM, retryKey]);

  // ── 4. Update map when coords change ─────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !coords) return;
    const map = mapRef.current;

    map.setView([coords.lat, coords.lon], radiusMi <= 2 ? 15 : radiusMi <= 5 ? 13 : 11, { animate: true });

    // Update / recreate radius circle
    circleRef.current?.remove();
    circleRef.current = L.circle([coords.lat, coords.lon], {
      radius:      radiusM,
      color:       '#f59e0b',
      fillColor:   '#f59e0b',
      fillOpacity: 0.06,
      weight:      1.5,
      dashArray:   '6 5',
    }).addTo(map);

    // Update subject marker
    subjectRef.current?.remove();
    const subjectIcon = L.divIcon({
      html: `<div style="width:42px;height:42px;border-radius:50%;background:#f59e0b;display:flex;align-items:center;justify-content:center;font-size:20px;border:3px solid white;box-shadow:0 3px 14px rgba(0,0,0,0.55)">🏨</div>`,
      className:   '',
      iconSize:    [42, 42],
      iconAnchor:  [21, 21],
      popupAnchor: [0, -26],
    });
    subjectRef.current = L.marker([coords.lat, coords.lon], { icon: subjectIcon, zIndexOffset: 1000 })
      .addTo(map)
      .bindPopup(`<b style="color:#b45309">📍 Subject Property</b><br/><span style="font-size:12px">${searchAddr}</span>`)
      .openPopup();
  }, [coords, radiusM, radiusMi, searchAddr]);

  // ── 5. Redraw competitor markers when hotels list changes ─────────────────
  useEffect(() => {
    if (!markersRef.current) return;

    markersRef.current.clearLayers();

    hotels.forEach(hotel => {
      const bf = getBrand(hotel.name, hotel.brand);
      const icon = L.divIcon({
        html: `<div style="width:32px;height:32px;border-radius:50%;background:${bf.color};display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:white;border:2.5px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.45)">${bf.letter}</div>`,
        className:   '',
        iconSize:    [32, 32],
        iconAnchor:  [16, 16],
        popupAnchor: [0, -20],
      });

      const starsStr = hotel.stars ? '★'.repeat(Math.min(Number(hotel.stars), 5)) : '';
      L.marker([hotel.lat, hotel.lon], { icon })
        .addTo(markersRef.current!)
        .bindPopup(`
          <div style="font-family:system-ui,sans-serif;min-width:170px">
            <div style="font-weight:700;font-size:13px;color:${bf.color};margin-bottom:3px">${hotel.name}</div>
            ${starsStr ? `<div style="color:#b45309;font-size:12px">${starsStr}</div>` : ''}
            ${hotel.brand ? `<div style="color:#555;font-size:12px">Brand: ${hotel.brand}</div>` : ''}
            <div style="color:#777;font-size:11px">${bf.family}</div>
            <div style="color:#444;font-size:11px;margin-top:4px;border-top:1px solid #eee;padding-top:4px">📏 ${hotel.distance.toFixed(2)} mi from subject</div>
          </div>
        `);
    });
  }, [hotels]);

  // ── Derived data for the sidebar table ───────────────────────────────────
  const brandGroups = hotels.reduce<Record<string, number>>((acc, h) => {
    const { family } = getBrand(h.name, h.brand);
    acc[family] = (acc[family] ?? 0) + 1;
    return acc;
  }, {});

  const BRAND_COLORS: Record<string, string> = {
    Hilton: '#1D4ED8', Marriott: '#9B1C1C', IHG: '#065F46',
    Hyatt: '#1E3A5F', Wyndham: '#6D28D9', Choice: '#C2410C', BW: '#1E40AF', Other: '#4B5563',
  };

  return (
    <div>
      {/* Radius controls + status */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>Radius:</span>
        {[1, 2, 3, 5, 10].map(r => (
          <button
            key={r}
            onClick={() => setRadiusMi(r)}
            style={{
              padding: '5px 12px',
              background: radiusMi === r ? 'rgba(245,158,11,0.15)' : '#0b1220',
              border:     `1px solid ${radiusMi === r ? '#f59e0b' : '#1e2d4a'}`,
              borderRadius: 6,
              color:  radiusMi === r ? '#f59e0b' : '#64748b',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}
          >{r} mi</button>
        ))}

        <span style={{ marginLeft: 4, fontSize: 12 }}>
          {status === 'geocoding' && <span style={{ color: '#94a3b8' }}>📍 Locating address…</span>}
          {status === 'fetching'  && <span style={{ color: '#94a3b8' }}>🔍 Scanning for nearby hotels…</span>}
          {status === 'done'      && <span style={{ color: '#10b981' }}>✓ {hotels.length} hotel{hotels.length !== 1 ? 's' : ''} found within {radiusMi} mi</span>}
          {status === 'error'     && (
            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 8 }}>
              ⚠ {errorMsg}
              <button
                onClick={() => { setStatus('fetching'); setRetryKey(k => k + 1); }}
                style={{ padding: '3px 10px', fontSize: 11, background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: 5, color: '#ef4444', cursor: 'pointer', fontWeight: 600 }}
              >Retry</button>
            </span>
          )}
        </span>
      </div>

      {/* Map */}
      <div
        ref={containerRef}
        style={{
          height: 420, borderRadius: 10,
          border: '1px solid #1e2d4a', overflow: 'hidden',
        }}
      />

      {/* Brand legend */}
      {Object.keys(brandGroups).length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {Object.entries(brandGroups).sort((a, b) => b[1] - a[1]).map(([family, count]) => (
            <div key={family} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 6,
              background: '#0e1629', border: '1px solid #1e2d4a', fontSize: 12,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: BRAND_COLORS[family] ?? '#4B5563', flexShrink: 0 }} />
              <span style={{ color: '#94a3b8' }}>{family}</span>
              <span style={{ color: '#f59e0b', fontWeight: 700 }}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {/* Hotel list table */}
      {hotels.length > 0 && (
        <div style={{ marginTop: 12, maxHeight: 240, overflowY: 'auto', borderRadius: 8, border: '1px solid #1e2d4a' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#0b1220', position: 'sticky', top: 0 }}>
                {['Hotel', 'Family', 'Stars', 'Distance'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', color: '#64748b', fontWeight: 600, borderBottom: '1px solid #1e2d4a', textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hotels.slice(0, 40).map((hotel, i) => {
                const bf = getBrand(hotel.name, hotel.brand);
                const isSelected = selected?.id === hotel.id;
                return (
                  <tr
                    key={hotel.id}
                    onClick={() => setSelected(isSelected ? null : hotel)}
                    style={{
                      borderBottom: '1px solid #1e2d4a',
                      cursor: 'pointer',
                      background: isSelected ? 'rgba(245,158,11,0.08)' : i % 2 === 0 ? 'rgba(0,0,0,0.12)' : undefined,
                      transition: 'background 0.1s',
                    }}
                  >
                    <td style={{ padding: '7px 10px', color: '#e2e8f0', fontWeight: 500 }}>{hotel.name}</td>
                    <td style={{ padding: '7px 10px' }}>
                      <span style={{ color: bf.color, background: `${bf.color}20`, padding: '2px 7px', borderRadius: 4, fontWeight: 600, fontSize: 11 }}>{bf.family}</span>
                    </td>
                    <td style={{ padding: '7px 10px', color: '#f59e0b' }}>
                      {hotel.stars ? '★'.repeat(Math.min(Number(hotel.stars), 5)) : '—'}
                    </td>
                    <td style={{ padding: '7px 10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>{hotel.distance.toFixed(2)} mi</td>
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
