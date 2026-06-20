'use client';

import dynamic from 'next/dynamic';

const CompetitorMapInner = dynamic(() => import('./CompetitorMapInner'), {
  ssr: false,
  loading: () => (
    <div style={{
      height: 420,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#0e1629',
      border: '1px solid #1e2d4a',
      borderRadius: 10,
      color: '#64748b',
      fontSize: 13,
    }}>
      Loading map…
    </div>
  ),
});

export function CompetitorMap({ address }: { address: string }) {
  return <CompetitorMapInner address={address} />;
}
