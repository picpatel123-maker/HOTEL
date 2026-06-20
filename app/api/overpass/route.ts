import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 20;

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.openstreetmap.ru/api/interpreter',
];

async function tryEndpoint(url: string, body: string, ms: number): Promise<unknown> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'HotelValueAnalyzer/1.0 (server-side proxy)',
      },
      body,
      signal: ac.signal,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: NextRequest) {
  let body: string;
  try {
    body = await req.text();
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }

  // Race all three endpoints simultaneously — first success wins
  try {
    const data = await Promise.any(
      ENDPOINTS.map(url => tryEndpoint(url, body, 10000))
    );
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'overpass_unavailable' }, { status: 503 });
  }
}
