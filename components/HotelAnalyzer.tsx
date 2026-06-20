'use client';

import { useState, useMemo } from 'react';
import { AnalyzerState } from '@/lib/types';
import { calculate, getDefaultPIPCostPerKey, fmt } from '@/lib/calculations';
import { FRANCHISE_BRANDS, CHAIN_SCALE_LABELS } from '@/lib/franchise-data';
import { ResultsDashboard } from './ResultsDashboard';
import { ProjectionChart } from './ProjectionChart';
import { CompetitorMap } from './CompetitorMap';

const INITIAL_STATE: AnalyzerState = {
  address: '',
  rooms: 100,
  chainScale: 'upper_midscale',
  franchise: 'hampton_inn',
  marketType: 'secondary',
  purchasePrice: 5_000_000,
  ltvPct: 0.80,
  closingCostsPct: 0.02,
  workingCapital: 150_000,
  pipScope: 'moderate',
  pipHardCostPerKey: 45_000,
  pipTimelineMonths: 18,
  pipSoftCostPct: 0.12,
  pipContingencyPct: 0.15,
  adr: 145,
  occupancy: 0.70,
  otherRevenuePct: 0.05,
  roomsExpensePct: 0.25,
  undistributedExpensePct: 0.28,
  managementFeePct: 0.03,
  propertyTaxRate: 0.012,
  insurancePerKey: 350,
  ffeReservePct: 0.04,
  adrGrowthPct: 0.03,
  occupancyGrowthPct: 0.005,
  loanType: 'sba_7a',
  conventionalRate: 0.075,
  conventionalTermYears: 25,
  sba7aRate: 0.105,
  sba7aTermYears: 25,
  sba504BankRate: 0.075,
  sba504BankLTV: 0.50,
  sba504SBARate: 0.065,
  sba504SBALTV: 0.40,
  sba504TermYears: 25,
  pariPassuRate1: 0.075,
  pariPassuPct1: 0.50,
  pariPassuRate2: 0.085,
  pariPassuTermYears: 25,
  holdingPeriod: 10,
  exitCapRateDelta: 0.25,
};

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (v: number) => void;
  hint?: string;
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>{label}</label>
        <span style={{
          fontSize: 14,
          fontWeight: 700,
          color: '#f59e0b',
          background: 'rgba(245,158,11,0.1)',
          padding: '2px 10px',
          borderRadius: 6,
          minWidth: 100,
          textAlign: 'right',
        }}>{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%' }}
      />
      {hint && <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function SectionCard({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div style={{
      background: '#0e1629',
      border: '1px solid #1e2d4a',
      borderRadius: 12,
      marginBottom: 16,
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '14px 20px',
        borderBottom: '1px solid #1e2d4a',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: '#0b1220',
      }}>
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0', letterSpacing: 0.3, textTransform: 'uppercase' }}>{title}</span>
      </div>
      <div style={{ padding: '16px 20px' }}>
        {children}
      </div>
    </div>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ width: '100%' }}
      >
        {options.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function NumberInput({ label, value, onChange, prefix = '$', suffix = '', step = 1 }: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  prefix?: string;
  suffix?: string;
  step?: number;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {prefix && (
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>{prefix}</span>
        )}
        <input
          type="number"
          value={value}
          step={step}
          onChange={e => onChange(Number(e.target.value))}
          style={{ paddingLeft: prefix ? 24 : 12, paddingRight: suffix ? 32 : 12 }}
        />
        {suffix && (
          <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 14 }}>{suffix}</span>
        )}
      </div>
    </div>
  );
}

const HILTON_BRANDS = Object.entries(FRANCHISE_BRANDS)
  .filter(([, b]) => b.family === 'Hilton')
  .map(([k, b]) => ({ value: k, label: `${b.label} (${(b.totalPct * 100).toFixed(1)}% fees)` }));

const CHOICE_BRANDS = Object.entries(FRANCHISE_BRANDS)
  .filter(([, b]) => b.family === 'Choice Hotels')
  .map(([k, b]) => ({ value: k, label: `${b.label} (${(b.totalPct * 100).toFixed(1)}% fees)` }));

const INDEPENDENT = [{ value: 'independent', label: 'Independent / Boutique (0% fees)' }];

const ALL_BRANDS = [
  { label: '── Hilton Portfolio ──', options: HILTON_BRANDS },
  { label: '── Choice Hotels ──', options: CHOICE_BRANDS },
  { label: '── No Franchise ──', options: INDEPENDENT },
];

export function HotelAnalyzer() {
  const [state, setState] = useState<AnalyzerState>(INITIAL_STATE);
  const [activeTab, setActiveTab] = useState<'acquisition' | 'pip' | 'operating' | 'loan'>('acquisition');

  const set = <K extends keyof AnalyzerState>(key: K) => (value: AnalyzerState[K]) =>
    setState(prev => ({ ...prev, [key]: value }));

  const results = useMemo(() => calculate(state), [state]);

  const brand = FRANCHISE_BRANDS[state.franchise] ?? FRANCHISE_BRANDS['hampton_inn'];

  // Auto-update PIP cost when scale/scope changes
  const autoUpdatePIP = (chainScale: string, scope: string) => {
    const newCost = getDefaultPIPCostPerKey(chainScale, scope);
    setState(prev => ({ ...prev, chainScale: chainScale as AnalyzerState['chainScale'], pipScope: scope as AnalyzerState['pipScope'], pipHardCostPerKey: newCost }));
  };

  return (
    <div style={{ minHeight: '100vh', background: '#080d1a', color: '#e2e8f0' }}>
      {/* Header */}
      <header style={{
        background: '#0b1220',
        borderBottom: '1px solid #1e2d4a',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 64,
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 36,
            height: 36,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
          }}>🏨</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#f8fafc', letterSpacing: -0.3 }}>HotelValue.ai</div>
            <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Hotel Investment Profitability Analyzer</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>Going-In Cap Rate</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: results.capRate >= 0.07 ? '#10b981' : results.capRate >= 0.05 ? '#f59e0b' : '#ef4444' }}>
              {fmt.pct(results.capRate)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>Cash-on-Cash</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: results.cashOnCash >= 0.08 ? '#10b981' : results.cashOnCash >= 0.04 ? '#f59e0b' : '#ef4444' }}>
              {fmt.pct(results.cashOnCash)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>IRR (10yr)</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: isNaN(results.irr10yr) ? '#ef4444' : results.irr10yr >= 0.15 ? '#10b981' : results.irr10yr >= 0.10 ? '#f59e0b' : '#ef4444' }}>
              {isNaN(results.irr10yr) ? 'N/M' : fmt.pct(results.irr10yr)}
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: '#64748b' }}>DSCR</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: results.dscr >= 1.25 ? '#10b981' : results.dscr >= 1.0 ? '#f59e0b' : '#ef4444' }}>
              {results.dscr.toFixed(2)}x
            </div>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', minHeight: 'calc(100vh - 64px)' }}>
        {/* ── LEFT PANEL (Inputs) ─────────────────────────────────────── */}
        <div style={{
          borderRight: '1px solid #1e2d4a',
          overflowY: 'auto',
          height: 'calc(100vh - 64px)',
          position: 'sticky',
          top: 64,
          padding: '20px 16px',
        }}>
          {/* Property Details */}
          <SectionCard title="Property Details" icon="📍">
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Property Address
              </label>
              <input
                type="text"
                placeholder="123 Main St, Austin, TX 78701"
                value={state.address}
                onChange={e => set('address')(e.target.value)}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Keys / Rooms
                </label>
                <input
                  type="number"
                  value={state.rooms}
                  min={10} max={1000} step={5}
                  onChange={e => set('rooms')(Number(e.target.value))}
                />
              </div>
              <SelectField
                label="Market Type"
                value={state.marketType}
                onChange={v => set('marketType')(v as AnalyzerState['marketType'])}
                options={[
                  { value: 'primary', label: 'Primary' },
                  { value: 'secondary', label: 'Secondary' },
                  { value: 'tertiary', label: 'Tertiary / Rural' },
                ]}
              />
            </div>

            <SelectField
              label="Chain Scale"
              value={state.chainScale}
              onChange={v => autoUpdatePIP(v, state.pipScope)}
              options={Object.entries(CHAIN_SCALE_LABELS).map(([k, l]) => ({ value: k, label: l }))}
            />

            <div>
              <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Franchise Brand
              </label>
              <select
                value={state.franchise}
                onChange={e => set('franchise')(e.target.value)}
                style={{ width: '100%' }}
              >
                {ALL_BRANDS.map(group => (
                  <optgroup key={group.label} label={group.label}>
                    {group.options.map(o => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
              {brand && (
                <div style={{ marginTop: 8, padding: '8px 12px', background: 'rgba(245,158,11,0.08)', borderRadius: 6, border: '1px solid rgba(245,158,11,0.2)' }}>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 4 }}>Annual Franchise Fee Breakdown</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, fontSize: 11 }}>
                    {[
                      ['Royalty', brand.royalty],
                      ['Marketing', brand.marketing],
                      ['Reservations', brand.reservations],
                      ['Loyalty', brand.loyalty],
                      ['Technology', brand.technology],
                      ['TOTAL', brand.totalPct],
                    ].map(([k, v]) => (
                      <div key={String(k)} style={{ color: k === 'TOTAL' ? '#f59e0b' : '#94a3b8', fontWeight: k === 'TOTAL' ? 700 : 400 }}>
                        {k}: {fmt.pct(Number(v))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </SectionCard>

          {/* Tabs for input sections */}
          <div style={{ display: 'flex', gap: 0, marginBottom: 16, background: '#0b1220', borderRadius: 10, padding: 4, border: '1px solid #1e2d4a' }}>
            {([
              ['acquisition', '💰', 'Acquisition'],
              ['pip', '🔨', 'PIP'],
              ['operating', '📊', 'Operating'],
              ['loan', '🏦', 'Loan'],
            ] as const).map(([tab, icon, label]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '8px 4px',
                  background: activeTab === tab ? '#1e2d4a' : 'transparent',
                  border: 'none',
                  borderRadius: 7,
                  color: activeTab === tab ? '#f59e0b' : '#64748b',
                  fontSize: 11,
                  fontWeight: activeTab === tab ? 700 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                }}
              >
                <span style={{ fontSize: 14 }}>{icon}</span>
                {label}
              </button>
            ))}
          </div>

          {/* Acquisition Tab */}
          {activeTab === 'acquisition' && (
            <SectionCard title="Acquisition" icon="💰">
              <SliderRow
                label="Purchase Price"
                value={state.purchasePrice}
                min={500_000} max={50_000_000} step={100_000}
                display={fmt.currency(state.purchasePrice, true)}
                onChange={set('purchasePrice')}
                hint={`$${fmt.number(Math.round(state.purchasePrice / state.rooms))} / key`}
              />
              <SliderRow
                label="Loan-to-Value (LTV)"
                value={state.ltvPct * 100}
                min={50} max={90} step={5}
                display={`${(state.ltvPct * 100).toFixed(0)}% / ${(100 - state.ltvPct * 100).toFixed(0)}%`}
                onChange={v => set('ltvPct')(v / 100)}
                hint={`Down: ${fmt.currency(results.downPayment, true)} · Loan: ${fmt.currency(results.loanAmount, true)}`}
              />
              <SliderRow
                label="Closing Costs"
                value={state.closingCostsPct * 100}
                min={1} max={5} step={0.25}
                display={`${(state.closingCostsPct * 100).toFixed(2)}% (${fmt.currency(results.closingCosts, true)})`}
                onChange={v => set('closingCostsPct')(v / 100)}
              />
              <NumberInput
                label="Working Capital Reserve"
                value={state.workingCapital}
                onChange={set('workingCapital')}
              />
              <div style={{
                marginTop: 8,
                padding: '12px',
                background: '#0b1220',
                borderRadius: 8,
                border: '1px solid #1e2d4a',
              }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>TOTAL EQUITY REQUIRED</div>
                {[
                  ['Down Payment (20%)', results.downPayment],
                  ['Closing Costs', results.closingCosts],
                  ['PIP Investment', results.pipTotal],
                  ['Working Capital', state.workingCapital],
                ].map(([label, val]) => (
                  <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#94a3b8' }}>
                    <span>{label}</span>
                    <span style={{ color: '#e2e8f0' }}>{fmt.currency(Number(val), true)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #1e2d4a', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#f59e0b', fontSize: 14 }}>
                  <span>Total Cash Needed</span>
                  <span>{fmt.currency(results.totalEquityRequired, true)}</span>
                </div>
              </div>
            </SectionCard>
          )}

          {/* PIP Tab */}
          {activeTab === 'pip' && (
            <SectionCard title="PIP — Property Improvement Plan" icon="🔨">
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  PIP Scope
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                  {(['cosmetic', 'moderate', 'comprehensive'] as const).map(scope => (
                    <button
                      key={scope}
                      onClick={() => autoUpdatePIP(state.chainScale, scope)}
                      style={{
                        padding: '8px 4px',
                        background: state.pipScope === scope ? 'rgba(245,158,11,0.15)' : '#0b1220',
                        border: `1px solid ${state.pipScope === scope ? '#f59e0b' : '#1e2d4a'}`,
                        borderRadius: 6,
                        color: state.pipScope === scope ? '#f59e0b' : '#64748b',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textTransform: 'capitalize',
                        transition: 'all 0.15s',
                      }}
                    >
                      {scope}
                    </button>
                  ))}
                </div>
              </div>

              <SliderRow
                label="PIP Hard Cost Per Key"
                value={state.pipHardCostPerKey}
                min={5000} max={250_000} step={1000}
                display={fmt.currency(state.pipHardCostPerKey, true)}
                onChange={set('pipHardCostPerKey')}
                hint={`Total hard costs: ${fmt.currency(results.pipHardCosts, true)}`}
              />
              <SliderRow
                label="PIP Timeline"
                value={state.pipTimelineMonths}
                min={6} max={48} step={1}
                display={`${state.pipTimelineMonths} months`}
                onChange={set('pipTimelineMonths')}
                hint="Renovation duration affects revenue displacement"
              />
              <SliderRow
                label="Soft Costs"
                value={state.pipSoftCostPct * 100}
                min={8} max={20} step={0.5}
                display={`${(state.pipSoftCostPct * 100).toFixed(1)}% (${fmt.currency(results.pipSoftCosts, true)})`}
                onChange={v => set('pipSoftCostPct')(v / 100)}
                hint="Architect, PM, design review, permits"
              />
              <SliderRow
                label="Contingency"
                value={state.pipContingencyPct * 100}
                min={5} max={25} step={0.5}
                display={`${(state.pipContingencyPct * 100).toFixed(1)}% (${fmt.currency(results.pipContingency, true)})`}
                onChange={v => set('pipContingencyPct')(v / 100)}
                hint="Budget for scope changes; brand can add items"
              />

              <div style={{ marginTop: 8, padding: '12px', background: '#0b1220', borderRadius: 8, border: '1px solid #1e2d4a' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>TRUE PIP INVESTMENT</div>
                {[
                  ['Hard Costs', results.pipHardCosts],
                  ['Soft Costs (12%)', results.pipSoftCosts],
                  ['Contingency (15%)', results.pipContingency],
                  ['Revenue Displacement', results.pipDisplacement],
                ].map(([label, val]) => (
                  <div key={String(label)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#94a3b8' }}>
                    <span>{label}</span>
                    <span style={{ color: '#e2e8f0' }}>{fmt.currency(Number(val), true)}</span>
                  </div>
                ))}
                <div style={{ borderTop: '1px solid #1e2d4a', marginTop: 8, paddingTop: 8, display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#f59e0b', fontSize: 14 }}>
                  <span>Total PIP Cost</span>
                  <span>{fmt.currency(results.pipTotal, true)}</span>
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: '#64748b' }}>
                  True Cost/Key: {fmt.currency(results.trueCostPerKey, true)} ·
                  Replacement: {fmt.currency(results.replacementCostPerKey, true)}/key
                </div>
                {results.belowReplacementCost && (
                  <div style={{ marginTop: 6, padding: '4px 8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 4, fontSize: 11, color: '#10b981' }}>
                    ✓ Buying below replacement cost — structural value opportunity
                  </div>
                )}
              </div>
            </SectionCard>
          )}

          {/* Operating Tab */}
          {activeTab === 'operating' && (
            <SectionCard title="Operating Assumptions" icon="📊">
              <SliderRow
                label="Average Daily Rate (ADR)"
                value={state.adr}
                min={50} max={600} step={5}
                display={`$${state.adr}`}
                onChange={set('adr')}
                hint={`RevPAR: $${(state.adr * state.occupancy).toFixed(2)} · GRR: ${fmt.currency(results.grossRoomRevenue, true)}`}
              />
              <SliderRow
                label="Occupancy"
                value={state.occupancy * 100}
                min={30} max={95} step={1}
                display={`${(state.occupancy * 100).toFixed(0)}%`}
                onChange={v => set('occupancy')(v / 100)}
                hint="Stabilized occupancy (year 1-3 average)"
              />
              <SliderRow
                label="ADR Growth (Annual)"
                value={state.adrGrowthPct * 100}
                min={0} max={8} step={0.25}
                display={`${(state.adrGrowthPct * 100).toFixed(2)}%`}
                onChange={v => set('adrGrowthPct')(v / 100)}
              />
              <SliderRow
                label="Rooms Dept Expense"
                value={state.roomsExpensePct * 100}
                min={15} max={65} step={0.5}
                display={`${(state.roomsExpensePct * 100).toFixed(1)}% (${fmt.currency(results.roomsExpense, true)})`}
                onChange={v => set('roomsExpensePct')(v / 100)}
                hint="Wages, laundry, guest supplies, OTA commissions"
              />
              <SliderRow
                label="Undistributed Expenses"
                value={state.undistributedExpensePct * 100}
                min={15} max={60} step={0.5}
                display={`${(state.undistributedExpensePct * 100).toFixed(1)}% (${fmt.currency(results.undistributedExpense, true)})`}
                onChange={v => set('undistributedExpensePct')(v / 100)}
                hint="A&G, Sales & Marketing, Maintenance, Utilities"
              />
              <SliderRow
                label="Management Fee"
                value={state.managementFeePct * 100}
                min={2} max={12} step={0.25}
                display={`${(state.managementFeePct * 100).toFixed(2)}% (${fmt.currency(results.managementFee, true)})`}
                onChange={v => set('managementFeePct')(v / 100)}
                hint="Third-party operator base fee"
              />
              <SliderRow
                label="FF&E Reserve"
                value={state.ffeReservePct * 100}
                min={2} max={10} step={0.25}
                display={`${(state.ffeReservePct * 100).toFixed(2)}% (${fmt.currency(results.ffeReserve, true)})`}
                onChange={v => set('ffeReservePct')(v / 100)}
                hint="Critical — omitting this inflates NOI by 3-5%"
              />
              <NumberInput
                label="Property Tax (% of Value)"
                value={state.propertyTaxRate * 100}
                onChange={v => set('propertyTaxRate')(v / 100)}
                prefix=""
                suffix="%"
                step={0.05}
              />
              <NumberInput
                label="Insurance ($ per key/year)"
                value={state.insurancePerKey}
                onChange={set('insurancePerKey')}
                step={25}
              />
            </SectionCard>
          )}

          {/* Loan Tab */}
          {activeTab === 'loan' && (
            <SectionCard title="Loan Structure" icon="🏦">
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Loan Type
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginBottom: 12 }}>
                  {([
                    ['sba_7a', 'SBA 7(a)', 'Up to $5M, flexible use'],
                    ['sba_504', 'SBA 504', '50/40/10 structure, fixed rate'],
                    ['pari_passu', 'Pari Passu', 'Equal-priority co-lenders'],
                    ['conventional', 'Conventional', 'Standard commercial loan'],
                  ] as const).map(([type, label, desc]) => (
                    <button
                      key={type}
                      onClick={() => set('loanType')(type)}
                      style={{
                        padding: '10px 8px',
                        background: state.loanType === type ? 'rgba(245,158,11,0.12)' : '#0b1220',
                        border: `1px solid ${state.loanType === type ? '#f59e0b' : '#1e2d4a'}`,
                        borderRadius: 8,
                        color: state.loanType === type ? '#f59e0b' : '#64748b',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s',
                      }}
                    >
                      <div>{label}</div>
                      <div style={{ fontSize: 10, fontWeight: 400, color: state.loanType === type ? '#d97706' : '#475569', marginTop: 2 }}>{desc}</div>
                    </button>
                  ))}
                </div>

                {state.loanType === 'sba_7a' && (
                  <>
                    <SliderRow
                      label="SBA 7(a) Interest Rate"
                      value={state.sba7aRate * 100}
                      min={7} max={15} step={0.25}
                      display={`${(state.sba7aRate * 100).toFixed(2)}%`}
                      onChange={v => set('sba7aRate')(v / 100)}
                      hint="Currently Prime (~8.5%) + 2.75% spread = ~11.25%"
                    />
                    <SliderRow
                      label="Loan Term"
                      value={state.sba7aTermYears}
                      min={10} max={25} step={5}
                      display={`${state.sba7aTermYears} years`}
                      onChange={set('sba7aTermYears')}
                      hint="25 years for real estate; 10 years for equipment/WC"
                    />
                  </>
                )}

                {state.loanType === 'sba_504' && (
                  <>
                    <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 10, fontWeight: 600 }}>
                      Bank (50%) + SBA CDC (40%) + Borrower (10%)
                    </div>
                    <SliderRow
                      label="Bank Rate (First Mortgage, 50%)"
                      value={state.sba504BankRate * 100}
                      min={5} max={12} step={0.25}
                      display={`${(state.sba504BankRate * 100).toFixed(2)}%`}
                      onChange={v => set('sba504BankRate')(v / 100)}
                    />
                    <SliderRow
                      label="SBA CDC Rate (Debenture, 40%)"
                      value={state.sba504SBARate * 100}
                      min={4} max={10} step={0.25}
                      display={`${(state.sba504SBARate * 100).toFixed(2)}% (Fixed)`}
                      onChange={v => set('sba504SBARate')(v / 100)}
                      hint="Fixed rate debenture via Certified Development Company"
                    />
                    <SliderRow
                      label="Loan Term"
                      value={state.sba504TermYears}
                      min={10} max={25} step={5}
                      display={`${state.sba504TermYears} years`}
                      onChange={set('sba504TermYears')}
                    />
                  </>
                )}

                {state.loanType === 'pari_passu' && (
                  <>
                    <div style={{ fontSize: 12, color: '#f59e0b', marginBottom: 10, fontWeight: 600 }}>
                      Two lenders share equal priority on collateral
                    </div>
                    <SliderRow
                      label="Lender A Portion"
                      value={state.pariPassuPct1 * 100}
                      min={30} max={70} step={5}
                      display={`${(state.pariPassuPct1 * 100).toFixed(0)}% / ${(100 - state.pariPassuPct1 * 100).toFixed(0)}%`}
                      onChange={v => set('pariPassuPct1')(v / 100)}
                    />
                    <SliderRow
                      label="Lender A Rate"
                      value={state.pariPassuRate1 * 100}
                      min={5} max={12} step={0.25}
                      display={`${(state.pariPassuRate1 * 100).toFixed(2)}%`}
                      onChange={v => set('pariPassuRate1')(v / 100)}
                    />
                    <SliderRow
                      label="Lender B Rate"
                      value={state.pariPassuRate2 * 100}
                      min={5} max={15} step={0.25}
                      display={`${(state.pariPassuRate2 * 100).toFixed(2)}%`}
                      onChange={v => set('pariPassuRate2')(v / 100)}
                    />
                    <SliderRow
                      label="Loan Term"
                      value={state.pariPassuTermYears}
                      min={10} max={25} step={5}
                      display={`${state.pariPassuTermYears} years`}
                      onChange={set('pariPassuTermYears')}
                    />
                  </>
                )}

                {state.loanType === 'conventional' && (
                  <>
                    <SliderRow
                      label="Interest Rate"
                      value={state.conventionalRate * 100}
                      min={5} max={12} step={0.25}
                      display={`${(state.conventionalRate * 100).toFixed(2)}%`}
                      onChange={v => set('conventionalRate')(v / 100)}
                    />
                    <SliderRow
                      label="Loan Term"
                      value={state.conventionalTermYears}
                      min={10} max={30} step={5}
                      display={`${state.conventionalTermYears} years`}
                      onChange={set('conventionalTermYears')}
                    />
                  </>
                )}
              </div>

              {/* Loan details summary */}
              <div style={{ marginTop: 8, padding: '12px', background: '#0b1220', borderRadius: 8, border: '1px solid #1e2d4a' }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600 }}>LOAN BREAKDOWN</div>
                {results.loanDetails.map((l) => (
                  <div key={l.label} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: '1px solid #1e2d4a' }}>
                    <div style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600, marginBottom: 4 }}>{l.label}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, fontSize: 11, color: '#94a3b8' }}>
                      <span>Amount: {fmt.currency(l.amount, true)}</span>
                      <span>Rate: {fmt.pct(l.rate)}</span>
                      <span>Term: {l.termYears}yr</span>
                      <span>Mo. Pmt: {fmt.currency(l.monthlyPayment, true)}</span>
                    </div>
                    {l.note && <div style={{ fontSize: 10, color: '#475569', marginTop: 3 }}>{l.note}</div>}
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: '#f59e0b', fontSize: 13, marginTop: 4 }}>
                  <span>Annual Debt Service</span>
                  <span>{fmt.currency(results.annualDebtService, true)}</span>
                </div>
              </div>

              {/* Exit assumptions */}
              <div style={{ marginTop: 12 }}>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Exit Assumptions</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Hold Period</label>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([5, 10] as const).map(y => (
                        <button
                          key={y}
                          onClick={() => set('holdingPeriod')(y)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            background: state.holdingPeriod === y ? 'rgba(245,158,11,0.15)' : '#0b1220',
                            border: `1px solid ${state.holdingPeriod === y ? '#f59e0b' : '#1e2d4a'}`,
                            borderRadius: 6,
                            color: state.holdingPeriod === y ? '#f59e0b' : '#64748b',
                            fontSize: 12,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          {y}yr
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, color: '#64748b', marginBottom: 4 }}>Exit Cap Rate Δ</label>
                    <input
                      type="number"
                      value={state.exitCapRateDelta}
                      step={0.05}
                      onChange={e => set('exitCapRateDelta')(Number(e.target.value))}
                      style={{ padding: '6px 10px', fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>
            </SectionCard>
          )}
        </div>

        {/* ── RIGHT PANEL (Results) ────────────────────────────────────── */}
        <div style={{ overflowY: 'auto', height: 'calc(100vh - 64px)', padding: '20px 24px' }}>
          <ResultsDashboard results={results} state={state} />
          <ProjectionChart projections={results.projections} />

          {/* Competitor Map */}
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
              Competitive Landscape Map
              <div style={{ height: 1, flex: 1, background: '#1e2d4a' }} />
            </div>
            <div style={{ background: '#0e1629', border: '1px solid #1e2d4a', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>
                Showing hotels near: <span style={{ color: '#f59e0b', fontWeight: 600 }}>{state.address || 'enter an address above to search'}</span>
                <span style={{ color: '#475569', marginLeft: 8 }}>· Data via OpenStreetMap</span>
              </div>
              <CompetitorMap address={state.address} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
