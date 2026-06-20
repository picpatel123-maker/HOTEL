'use client';

import { CalculationResults, AnalyzerState } from '@/lib/types';
import { FRANCHISE_BRANDS, CHAIN_SCALE_LABELS } from '@/lib/franchise-data';
import { fmt } from '@/lib/calculations';

function MetricCard({
  label,
  value,
  sub,
  color = 'neutral',
  large = false,
  benchmark,
}: {
  label: string;
  value: string;
  sub?: string;
  color?: 'good' | 'warn' | 'bad' | 'neutral' | 'amber';
  large?: boolean;
  benchmark?: string;
}) {
  const colors = {
    good: '#10b981',
    warn: '#f59e0b',
    bad: '#ef4444',
    neutral: '#e2e8f0',
    amber: '#f59e0b',
  };

  return (
    <div style={{
      background: '#0e1629',
      border: '1px solid #1e2d4a',
      borderRadius: 10,
      padding: large ? '16px 18px' : '12px 14px',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      transition: 'border-color 0.2s',
    }}>
      <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: large ? 26 : 20, fontWeight: 800, color: colors[color], lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>}
      {benchmark && <div style={{ fontSize: 10, color: '#475569', borderTop: '1px solid #1e2d4a', paddingTop: 4, marginTop: 2 }}>{benchmark}</div>}
    </div>
  );
}

function ExpenseBar({ label, amount, total, color }: { label: string; amount: number; total: number; color: string }) {
  const pct = total > 0 ? (amount / total) * 100 : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: '#94a3b8' }}>
        <span>{label}</span>
        <span style={{ color: '#e2e8f0' }}>{fmt.currency(amount, true)} ({pct.toFixed(1)}%)</span>
      </div>
      <div style={{ height: 4, background: '#1e2d4a', borderRadius: 2 }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 0.3s' }} />
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        fontSize: 12,
        fontWeight: 700,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <div style={{ height: 1, flex: 1, background: '#1e2d4a' }} />
        {title}
        <div style={{ height: 1, flex: 1, background: '#1e2d4a' }} />
      </div>
      {children}
    </div>
  );
}

function ScenarioTable({ results }: { results: CalculationResults }) {
  const scenarios = [
    {
      name: 'Bear',
      icon: '🐻',
      color: '#ef4444',
      adrMult: 0.85,
      occMult: 0.90,
      capMult: 1.10,
    },
    {
      name: 'Base',
      icon: '📊',
      color: '#f59e0b',
      adrMult: 1.00,
      occMult: 1.00,
      capMult: 1.00,
    },
    {
      name: 'Bull',
      icon: '🐂',
      color: '#10b981',
      adrMult: 1.12,
      occMult: 1.08,
      capMult: 0.92,
    },
  ];

  return (
    <div style={{
      background: '#0e1629',
      border: '1px solid #1e2d4a',
      borderRadius: 10,
      overflow: 'hidden',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(3, 1fr)', borderBottom: '1px solid #1e2d4a' }}>
        <div style={{ padding: '10px 14px', fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Metric</div>
        {scenarios.map(s => (
          <div key={s.name} style={{ padding: '10px 14px', fontSize: 12, color: s.color, fontWeight: 700, textAlign: 'center', borderLeft: '1px solid #1e2d4a' }}>
            {s.icon} {s.name}
          </div>
        ))}
      </div>
      {[
        { label: 'ADR', fn: (m: typeof scenarios[0]) => `$${(results.grossRoomRevenue / 365 / (results.grossRoomRevenue / (results.revPAR * results.grossRoomRevenue / results.revPAR)) * m.adrMult).toFixed(0)}` },
      ].length === 0 && null}
      {[
        { label: 'RevPAR', fn: (m: typeof scenarios[0]) => `$${(results.revPAR * m.adrMult * m.occMult).toFixed(0)}` },
        { label: 'NOI', fn: (m: typeof scenarios[0]) => fmt.currency(results.noi * m.adrMult * m.occMult, true) },
        { label: 'Cap Rate', fn: (m: typeof scenarios[0]) => fmt.pct(results.capRate * m.adrMult * m.occMult / m.capMult) },
        { label: 'Cash Flow', fn: (m: typeof scenarios[0]) => fmt.currency(results.cashFlow * m.adrMult * m.occMult, true) },
        { label: 'Cash-on-Cash', fn: (m: typeof scenarios[0]) => fmt.pct(results.cashOnCash * m.adrMult * m.occMult) },
        { label: 'DSCR', fn: (m: typeof scenarios[0]) => `${(results.dscr * m.adrMult * m.occMult).toFixed(2)}x` },
      ].map((row, i) => (
        <div key={row.label} style={{
          display: 'grid',
          gridTemplateColumns: '1.5fr repeat(3, 1fr)',
          borderBottom: i < 5 ? '1px solid #1e2d4a' : undefined,
          background: i % 2 === 0 ? 'rgba(0,0,0,0.2)' : undefined,
        }}>
          <div style={{ padding: '9px 14px', fontSize: 12, color: '#94a3b8' }}>{row.label}</div>
          {scenarios.map(s => (
            <div key={s.name} style={{ padding: '9px 14px', fontSize: 12, color: s.color, fontWeight: 600, textAlign: 'center', borderLeft: '1px solid #1e2d4a' }}>
              {row.fn(s)}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ValuationGauge({ results, purchasePrice }: { results: CalculationResults; purchasePrice: number }) {
  const items = [
    { label: 'Income Approach (NOI/Cap)', value: results.incomeApproachValue, color: '#3b82f6' },
    { label: 'Price Per Key (Market Range)', value: (results.ppkRangeLow + results.ppkRangeHigh) / 2, color: '#8b5cf6' },
    { label: 'Revenue Multiplier', value: (results.revMultLow + results.revMultHigh) / 2, color: '#10b981' },
    { label: 'Ask Price', value: purchasePrice, color: '#f59e0b' },
  ];

  const maxVal = Math.max(...items.map(i => i.value)) * 1.1;

  return (
    <div style={{ background: '#0e1629', border: '1px solid #1e2d4a', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>
        Valuation Triangulation
      </div>
      {items.map(item => (
        <div key={item.label} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, color: '#94a3b8' }}>
            <span>{item.label}</span>
            <span style={{ color: item.color, fontWeight: 600 }}>{fmt.currency(item.value, true)}</span>
          </div>
          <div style={{ height: 6, background: '#1e2d4a', borderRadius: 3 }}>
            <div style={{
              width: `${(item.value / maxVal) * 100}%`,
              height: '100%',
              background: item.color,
              borderRadius: 3,
              transition: 'width 0.4s',
              opacity: 0.85,
            }} />
          </div>
        </div>
      ))}
      <div style={{
        marginTop: 12,
        padding: '8px 12px',
        borderRadius: 6,
        background: results.valuationAssessment === 'below_market'
          ? 'rgba(16,185,129,0.1)'
          : results.valuationAssessment === 'above_market'
          ? 'rgba(239,68,68,0.1)'
          : 'rgba(245,158,11,0.1)',
        border: `1px solid ${
          results.valuationAssessment === 'below_market' ? 'rgba(16,185,129,0.3)'
          : results.valuationAssessment === 'above_market' ? 'rgba(239,68,68,0.3)'
          : 'rgba(245,158,11,0.3)'
        }`,
        fontSize: 12,
        color: results.valuationAssessment === 'below_market' ? '#10b981'
          : results.valuationAssessment === 'above_market' ? '#ef4444'
          : '#f59e0b',
        fontWeight: 600,
        textAlign: 'center',
      }}>
        {results.valuationAssessment === 'below_market'
          ? '✓ Below Market — Potential Value-Add Opportunity'
          : results.valuationAssessment === 'above_market'
          ? '⚠ Above Market — Negotiate Price or Verify NOI'
          : '~ Fair Market Value'}
      </div>
    </div>
  );
}

export function ResultsDashboard({ results, state }: { results: CalculationResults; state: AnalyzerState }) {
  const brand = FRANCHISE_BRANDS[state.franchise];

  return (
    <div>
      {/* Key Returns Row */}
      <Section title="Investment Returns">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 10 }}>
          <MetricCard
            label="Going-In Cap Rate"
            value={fmt.pct(results.capRate)}
            sub={`NOI: ${fmt.currency(results.noi, true)}`}
            color={results.capRate >= 0.08 ? 'good' : results.capRate >= 0.06 ? 'warn' : 'bad'}
            benchmark="Good: >7% | Fair: 5-7% | Weak: <5%"
            large
          />
          <MetricCard
            label="Cash-on-Cash Return"
            value={fmt.pct(results.cashOnCash)}
            sub={`Annual CF: ${fmt.currency(results.cashFlow, true)}`}
            color={results.cashOnCash >= 0.08 ? 'good' : results.cashOnCash >= 0.04 ? 'warn' : 'bad'}
            benchmark="Good: >8% | Fair: 4-8% | Weak: <4%"
            large
          />
          <MetricCard
            label="IRR (5-Year)"
            value={fmt.pct(results.irr5yr)}
            sub={`${fmt.multiple(results.equityMultiple5yr)} equity multiple`}
            color={results.irr5yr >= 0.15 ? 'good' : results.irr5yr >= 0.10 ? 'warn' : 'bad'}
            benchmark="Good: >15% | Fair: 10-15% | Weak: <10%"
            large
          />
          <MetricCard
            label="IRR (10-Year)"
            value={fmt.pct(results.irr10yr)}
            sub={`${fmt.multiple(results.equityMultiple10yr)} equity multiple`}
            color={results.irr10yr >= 0.15 ? 'good' : results.irr10yr >= 0.10 ? 'warn' : 'bad'}
            benchmark="Good: >15% | Fair: 10-15% | Weak: <10%"
            large
          />
        </div>
      </Section>

      {/* Debt & Coverage */}
      <Section title="Debt Service & Coverage">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          <MetricCard
            label="DSCR"
            value={`${results.dscr.toFixed(2)}x`}
            sub={`Debt Svc: ${fmt.currency(results.annualDebtService, true)}/yr`}
            color={results.dscr >= 1.25 ? 'good' : results.dscr >= 1.0 ? 'warn' : 'bad'}
            benchmark="Min lender req: 1.20x | Healthy: 1.40x+"
          />
          <MetricCard
            label="Break-Even Occ."
            value={fmt.pct(results.breakEvenOccupancy)}
            sub={`Current occ: ${fmt.pct(state.occupancy)}`}
            color={results.breakEvenOccupancy < state.occupancy * 0.85 ? 'good' : results.breakEvenOccupancy < state.occupancy ? 'warn' : 'bad'}
            benchmark="Lender pref: <85% of max capacity"
          />
          <MetricCard
            label="Monthly Pmt"
            value={fmt.currency(results.monthlyPayment, true)}
            sub={`Annual: ${fmt.currency(results.annualDebtService, true)}`}
            color="neutral"
          />
          <MetricCard
            label="Loan Amount"
            value={fmt.currency(results.loanAmount, true)}
            sub={`${(state.ltvPct * 100).toFixed(0)}% LTV · ${fmt.currency(results.downPayment, true)} down`}
            color="neutral"
          />
        </div>
      </Section>

      {/* Operating Performance */}
      <Section title="Operating Performance">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
              <MetricCard
                label="RevPAR"
                value={`$${results.revPAR.toFixed(0)}`}
                sub={`ADR $${state.adr} × ${fmt.pct(state.occupancy, 0)}`}
                color="neutral"
              />
              <MetricCard
                label="GOPPAR"
                value={`$${results.goppar.toFixed(0)}`}
                sub="GOP / available room"
                color="neutral"
              />
              <MetricCard
                label="GOP Margin"
                value={fmt.pct(results.gopMargin)}
                sub={fmt.currency(results.gop, true)}
                color={results.gopMargin >= 0.50 ? 'good' : results.gopMargin >= 0.40 ? 'warn' : 'bad'}
              />
            </div>

            {/* Revenue waterfall */}
            <div style={{ background: '#0e1629', border: '1px solid #1e2d4a', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                NOI Build (USALI)
              </div>
              {[
                { label: 'Gross Room Revenue', value: results.grossRoomRevenue, color: '#10b981', bold: false },
                { label: 'Other Revenue', value: results.totalRevenue - results.grossRoomRevenue, color: '#34d399', bold: false },
                { label: 'Total Revenue', value: results.totalRevenue, color: '#10b981', bold: true },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: '#94a3b8', fontWeight: r.bold ? 700 : 400 }}>
                  <span style={{ color: r.bold ? '#e2e8f0' : '#94a3b8' }}>{r.label}</span>
                  <span style={{ color: r.color }}>{fmt.currency(r.value)}</span>
                </div>
              ))}
              <div style={{ height: 1, background: '#1e2d4a', margin: '8px 0' }} />
              {[
                { label: `(–) Franchise Fees (${fmt.pct(results.franchiseFeePct)})`, value: results.franchiseFees, color: '#ef4444' },
                { label: '(–) Rooms Expense', value: results.roomsExpense, color: '#f87171' },
                { label: '(–) Undistributed Exp.', value: results.undistributedExpense, color: '#f87171' },
                { label: '(–) Management Fee', value: results.managementFee, color: '#f87171' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: '#94a3b8' }}>
                  <span>{r.label}</span>
                  <span style={{ color: r.color }}>({fmt.currency(r.value)})</span>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, fontWeight: 700, color: '#e2e8f0', borderTop: '1px solid #1e2d4a', paddingTop: 6, marginTop: 3 }}>
                <span>GOP</span>
                <span style={{ color: '#10b981' }}>{fmt.currency(results.gop)} ({fmt.pct(results.gopMargin)})</span>
              </div>
              {[
                { label: '(–) Property Tax', value: results.propertyTax, color: '#f87171' },
                { label: '(–) Insurance', value: results.insurance, color: '#f87171' },
                { label: `(–) FF&E Reserve (${fmt.pct(state.ffeReservePct, 0)})`, value: results.ffeReserve, color: '#f87171' },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3, color: '#94a3b8' }}>
                  <span>{r.label}</span>
                  <span style={{ color: r.color }}>({fmt.currency(r.value)})</span>
                </div>
              ))}
              <div style={{ height: 1, background: '#1e2d4a', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800 }}>
                <span style={{ color: '#f59e0b' }}>NOI</span>
                <span style={{ color: results.noi > 0 ? '#10b981' : '#ef4444' }}>{fmt.currency(results.noi)} ({fmt.pct(results.noiMargin)})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginTop: 6, color: '#94a3b8' }}>
                <span>(–) Debt Service</span>
                <span style={{ color: '#ef4444' }}>({fmt.currency(results.annualDebtService)})</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, marginTop: 4 }}>
                <span style={{ color: '#f59e0b' }}>Cash Flow</span>
                <span style={{ color: results.cashFlow > 0 ? '#10b981' : '#ef4444' }}>{fmt.currency(results.cashFlow)}</span>
              </div>
            </div>
          </div>

          <div>
            {/* Expense breakdown chart */}
            <div style={{ background: '#0e1629', border: '1px solid #1e2d4a', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Expense Breakdown (of Revenue)
              </div>
              <ExpenseBar label={`Franchise Fees (${brand?.label})`} amount={results.franchiseFees} total={results.totalRevenue} color="#3b82f6" />
              <ExpenseBar label="Rooms Department" amount={results.roomsExpense} total={results.totalRevenue} color="#8b5cf6" />
              <ExpenseBar label="Undistributed Expenses" amount={results.undistributedExpense} total={results.totalRevenue} color="#6366f1" />
              <ExpenseBar label="Management Fee" amount={results.managementFee} total={results.totalRevenue} color="#a855f7" />
              <ExpenseBar label="Property Tax" amount={results.propertyTax} total={results.totalRevenue} color="#ec4899" />
              <ExpenseBar label="Insurance" amount={results.insurance} total={results.totalRevenue} color="#f97316" />
              <ExpenseBar label="FF&E Reserve" amount={results.ffeReserve} total={results.totalRevenue} color="#eab308" />
              <div style={{ borderTop: '1px solid #1e2d4a', paddingTop: 8, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: '#64748b' }}>Total OpEx / Revenue</span>
                <span style={{ color: '#ef4444', fontWeight: 700 }}>
                  {fmt.pct(results.totalOperatingExpenses / results.totalRevenue)}
                </span>
              </div>
            </div>

            {/* Capital stack */}
            <div style={{ background: '#0e1629', border: '1px solid #1e2d4a', borderRadius: 10, padding: '14px 16px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Capital Stack
              </div>
              {[
                { label: 'Debt (Financed)', value: results.loanAmount, pct: state.ltvPct, color: '#3b82f6' },
                { label: 'Down Payment', value: results.downPayment, pct: 1 - state.ltvPct, color: '#f59e0b' },
                { label: 'Closing Costs', value: results.closingCosts, pct: state.closingCostsPct, color: '#8b5cf6' },
                { label: 'PIP Investment', value: results.pipTotal, pct: results.pipTotal / results.purchasePrice, color: '#10b981' },
              ].map(item => (
                <div key={item.label} style={{ marginBottom: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                    <span style={{ color: '#94a3b8' }}>{item.label}</span>
                    <span style={{ color: item.color, fontWeight: 600 }}>{fmt.currency(item.value, true)}</span>
                  </div>
                  <div style={{ height: 5, background: '#1e2d4a', borderRadius: 2 }}>
                    <div style={{
                      width: `${Math.min(item.pct * 100, 100)}%`,
                      height: '100%',
                      background: item.color,
                      borderRadius: 2,
                      opacity: 0.8,
                      transition: 'width 0.3s',
                    }} />
                  </div>
                </div>
              ))}
              <div style={{ borderTop: '1px solid #1e2d4a', paddingTop: 8, marginTop: 6, display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                <span style={{ color: '#64748b' }}>Total Equity Required</span>
                <span style={{ color: '#f59e0b' }}>{fmt.currency(results.totalEquityRequired, true)}</span>
              </div>
              <div style={{ fontSize: 11, color: '#475569', marginTop: 4 }}>
                True Cost/Key: {fmt.currency(results.trueCostPerKey, true)} · Replacement: {fmt.currency(results.replacementCostPerKey, true)}/key
              </div>
              {results.belowReplacementCost && (
                <div style={{ marginTop: 6, fontSize: 11, color: '#10b981' }}>✓ Below replacement cost — structural value opportunity</div>
              )}
            </div>
          </div>
        </div>
      </Section>

      {/* Scenario Analysis */}
      <Section title="Bear / Base / Bull Scenario Analysis">
        <ScenarioTable results={results} />
      </Section>

      {/* Valuation */}
      <Section title="Valuation Triangulation">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <ValuationGauge results={results} purchasePrice={state.purchasePrice} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <MetricCard
              label="Price Per Key (Ask)"
              value={fmt.currency(results.pricePerKey, true)}
              sub={`Market range: ${fmt.currency(results.ppkRangeLow / state.rooms, true)} – ${fmt.currency(results.ppkRangeHigh / state.rooms, true)}/key`}
              color={results.pricePerKey < (results.ppkRangeLow + results.ppkRangeHigh) / 2 / state.rooms ? 'good' : 'neutral'}
            />
            <MetricCard
              label="True Cost Per Key (w/ PIP)"
              value={fmt.currency(results.trueCostPerKey, true)}
              sub={`Replacement cost: ${fmt.currency(results.replacementCostPerKey, true)}/key`}
              color={results.belowReplacementCost ? 'good' : 'warn'}
            />
            <MetricCard
              label="Income Approach Value"
              value={fmt.currency(results.incomeApproachValue, true)}
              sub={`At market mid-cap rate`}
              color="neutral"
            />
            <MetricCard
              label="Revenue Multiplier"
              value={`${(state.purchasePrice / results.totalRevenue).toFixed(1)}x`}
              sub={`Market range: ${((results.revMultLow + results.revMultHigh) / 2 / results.totalRevenue).toFixed(1)}x avg`}
              color={state.purchasePrice / results.totalRevenue < (results.revMultLow + results.revMultHigh) / 2 / results.totalRevenue ? 'good' : 'warn'}
            />
          </div>
        </div>
      </Section>
    </div>
  );
}
