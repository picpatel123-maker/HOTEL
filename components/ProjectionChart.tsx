'use client';

import { YearlyProjection } from '@/lib/types';
import { fmt } from '@/lib/calculations';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';

const formatCurrency = (val: number) => {
  if (Math.abs(val) >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (Math.abs(val) >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
};

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div style={{
      background: '#0e1629',
      border: '1px solid #1e2d4a',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 12,
    }}>
      <div style={{ color: '#f59e0b', fontWeight: 700, marginBottom: 6 }}>Year {label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 3, color: '#94a3b8' }}>
          <span style={{ color: p.color }}>{p.name}</span>
          <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ProjectionChart({ projections }: { projections: YearlyProjection[] }) {
  const data = projections.map(p => ({
    year: p.year,
    'Revenue': p.revenue,
    'NOI': p.noi,
    'Cash Flow': p.cashFlow,
    'Property Value': p.propertyValue,
    'Equity Value': p.equityValue,
    'Loan Balance': p.loanBalance,
  }));

  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{ height: 1, flex: 1, background: '#1e2d4a' }} />
        10-Year Performance Projection
        <div style={{ height: 1, flex: 1, background: '#1e2d4a' }} />
      </div>

      {/* Revenue & NOI chart */}
      <div style={{ background: '#0e1629', border: '1px solid #1e2d4a', borderRadius: 10, padding: '16px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 12 }}>Revenue, NOI & Cash Flow</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="noiGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
            <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCurrency} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            <Area type="monotone" dataKey="Revenue" stroke="#10b981" fill="url(#revGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="NOI" stroke="#f59e0b" fill="url(#noiGrad)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Cash Flow" stroke="#3b82f6" strokeWidth={2} dot={false} strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Equity build chart */}
      <div style={{ background: '#0e1629', border: '1px solid #1e2d4a', borderRadius: 10, padding: '16px', marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600, marginBottom: 12 }}>Property Value & Equity Build</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="propGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="eqGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d4a" />
            <XAxis dataKey="year" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={formatCurrency} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={60} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: '#94a3b8' }} />
            <Area type="monotone" dataKey="Property Value" stroke="#8b5cf6" fill="url(#propGrad)" strokeWidth={2} dot={false} />
            <Area type="monotone" dataKey="Equity Value" stroke="#10b981" fill="url(#eqGrad)" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Loan Balance" stroke="#ef4444" strokeWidth={1.5} dot={false} strokeDasharray="3 2" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Annual table */}
      <div style={{ background: '#0e1629', border: '1px solid #1e2d4a', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: '#0b1220' }}>
                {['Year', 'Revenue', 'NOI', 'NOI %', 'Debt Svc', 'Cash Flow', 'Prop Value', 'Equity'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', fontSize: 10, letterSpacing: 0.5, borderBottom: '1px solid #1e2d4a', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projections.map((p, i) => (
                <tr key={p.year} style={{ borderBottom: i < projections.length - 1 ? '1px solid #1e2d4a' : undefined, background: i % 2 === 0 ? 'rgba(0,0,0,0.15)' : undefined }}>
                  <td style={{ padding: '8px 12px', color: '#f59e0b', fontWeight: 700 }}>Yr {p.year}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8' }}>{formatCurrency(p.revenue)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: p.noi > 0 ? '#e2e8f0' : '#ef4444' }}>{formatCurrency(p.noi)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#64748b' }}>{(p.noi / p.revenue * 100).toFixed(1)}%</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#94a3b8' }}>{formatCurrency(p.debtService)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: p.cashFlow >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{formatCurrency(p.cashFlow)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#8b5cf6' }}>{formatCurrency(p.propertyValue)}</td>
                  <td style={{ padding: '8px 12px', textAlign: 'right', color: '#10b981', fontWeight: 600 }}>{formatCurrency(p.equityValue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
