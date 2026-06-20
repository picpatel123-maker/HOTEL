import { AnalyzerState, CalculationResults, YearlyProjection, LoanDetail } from './types';
import {
  FRANCHISE_BRANDS,
  CAP_RATES,
  PRICE_PER_KEY,
  REV_MULTIPLIERS,
  REPLACEMENT_COST,
  PIP_COSTS,
} from './franchise-data';

// PMT — annual payment on a loan
function pmt(annualRate: number, termYears: number, principal: number): number {
  if (principal === 0) return 0;
  if (annualRate === 0) return principal / termYears;
  const r = annualRate / 12;
  const n = termYears * 12;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) * 12;
}

// Remaining loan balance after N years
function remainingBalance(annualRate: number, termYears: number, principal: number, yearsElapsed: number): number {
  if (principal === 0) return 0;
  if (annualRate === 0) return principal - (principal / termYears) * yearsElapsed;
  const r = annualRate / 12;
  const n = termYears * 12;
  const k = yearsElapsed * 12;
  return principal * (Math.pow(1 + r, n) - Math.pow(1 + r, k)) / (Math.pow(1 + r, n) - 1);
}

// NPV helper
function npv(rate: number, cashFlows: number[]): number {
  return cashFlows.reduce((sum, cf, t) => sum + cf / Math.pow(1 + rate, t), 0);
}

// IRR via Newton-Raphson
function irr(cashFlows: number[]): number {
  // Check feasibility: need at least one negative and one positive
  const hasNeg = cashFlows.some(c => c < 0);
  const hasPos = cashFlows.some(c => c > 0);
  if (!hasNeg || !hasPos) return 0;

  let rate = 0.10;
  for (let i = 0; i < 200; i++) {
    let f = 0;
    let df = 0;
    for (let t = 0; t < cashFlows.length; t++) {
      const v = Math.pow(1 + rate, t);
      f += cashFlows[t] / v;
      if (t > 0) df -= t * cashFlows[t] / (v * (1 + rate));
    }
    if (df === 0) break;
    const r1 = rate - f / df;
    if (Math.abs(r1 - rate) < 1e-9) return r1;
    rate = r1;
    if (rate < -0.999) rate = 0.01;
  }
  return rate;
}

export function calculate(s: AnalyzerState): CalculationResults {
  const brand = FRANCHISE_BRANDS[s.franchise] ?? FRANCHISE_BRANDS['hampton_inn'];

  // ── Capital Stack ──────────────────────────────────────────────────────────
  const loanAmount = s.purchasePrice * s.ltvPct;
  const downPayment = s.purchasePrice * (1 - s.ltvPct);
  const closingCosts = s.purchasePrice * s.closingCostsPct;

  // ── PIP ────────────────────────────────────────────────────────────────────
  const pipHardCosts = s.pipHardCostPerKey * s.rooms;
  const pipSoftCosts = pipHardCosts * s.pipSoftCostPct;
  const pipContingency = pipHardCosts * s.pipContingencyPct;
  // Displacement: 15% OOS rolling, ADR × occupancy × 30 days/month × months
  const pipDisplacement =
    s.rooms * 0.15 * s.pipTimelineMonths * 30 * s.adr * s.occupancy;
  const pipTotal = pipHardCosts + pipSoftCosts + pipContingency + pipDisplacement;
  const pipPctOfPrice = pipTotal / s.purchasePrice;

  // Total equity required
  const totalEquityRequired = downPayment + closingCosts + pipTotal + s.workingCapital;
  const trueCostPerKey = (s.purchasePrice + closingCosts + pipTotal) / s.rooms;

  // ── Revenue ────────────────────────────────────────────────────────────────
  const grossRoomRevenue = s.rooms * s.adr * s.occupancy * 365;
  const totalRevenue = grossRoomRevenue * (1 + s.otherRevenuePct);

  // ── Franchise Fees ─────────────────────────────────────────────────────────
  const franchiseFeePct = brand.totalPct;
  const franchiseFees = grossRoomRevenue * franchiseFeePct;

  // ── Operating Expenses (USALI) ─────────────────────────────────────────────
  const roomsExpense = grossRoomRevenue * s.roomsExpensePct;
  const undistributedExpense = totalRevenue * s.undistributedExpensePct;
  const managementFee = totalRevenue * s.managementFeePct;
  const propertyTax = s.purchasePrice * s.propertyTaxRate;
  const insurance = s.rooms * s.insurancePerKey;
  const ffeReserve = totalRevenue * s.ffeReservePct;

  const totalOperatingExpenses =
    franchiseFees +
    roomsExpense +
    undistributedExpense +
    managementFee +
    propertyTax +
    insurance +
    ffeReserve;

  const gop = totalRevenue - roomsExpense - undistributedExpense - managementFee;
  const gopMargin = gop / totalRevenue;
  const noi = totalRevenue - totalOperatingExpenses;
  const noiMargin = noi / totalRevenue;
  // NOI before franchise fees (for comparison)
  const noiBefore = noi + franchiseFees;

  // ── Loan Structure ─────────────────────────────────────────────────────────
  let annualDebtService = 0;
  const loanDetails: LoanDetail[] = [];

  if (s.loanType === 'sba_7a') {
    const annual = pmt(s.sba7aRate, s.sba7aTermYears, loanAmount);
    annualDebtService = annual;
    loanDetails.push({
      label: 'SBA 7(a)',
      amount: loanAmount,
      rate: s.sba7aRate,
      termYears: s.sba7aTermYears,
      monthlyPayment: annual / 12,
      annualPayment: annual,
      note: 'Government-guaranteed, floating rate (Prime + spread)',
    });
  } else if (s.loanType === 'sba_504') {
    // 50% bank, 40% SBA CDC, 10% borrower → effective LTV 90% but user controls
    const bankAmt = s.purchasePrice * s.sba504BankLTV;
    const sbaAmt = s.purchasePrice * s.sba504SBALTV;
    const bankPayment = pmt(s.sba504BankRate, s.sba504TermYears, bankAmt);
    const sbaPayment = pmt(s.sba504SBARate, s.sba504TermYears, sbaAmt);
    annualDebtService = bankPayment + sbaPayment;
    loanDetails.push({
      label: 'SBA 504 — Bank First (50%)',
      amount: bankAmt,
      rate: s.sba504BankRate,
      termYears: s.sba504TermYears,
      monthlyPayment: bankPayment / 12,
      annualPayment: bankPayment,
      note: 'Senior bank mortgage, adjustable rate',
    });
    loanDetails.push({
      label: 'SBA 504 — CDC Debenture (40%)',
      amount: sbaAmt,
      rate: s.sba504SBARate,
      termYears: s.sba504TermYears,
      monthlyPayment: sbaPayment / 12,
      annualPayment: sbaPayment,
      note: 'Fixed-rate SBA debenture through Certified Development Company',
    });
  } else if (s.loanType === 'pari_passu') {
    // Two lenders at same priority, share collateral proportionally
    const lender1Amt = loanAmount * s.pariPassuPct1;
    const lender2Amt = loanAmount * (1 - s.pariPassuPct1);
    const payment1 = pmt(s.pariPassuRate1, s.pariPassuTermYears, lender1Amt);
    const payment2 = pmt(s.pariPassuRate2, s.pariPassuTermYears, lender2Amt);
    annualDebtService = payment1 + payment2;
    loanDetails.push({
      label: `Pari Passu — Lender A (${Math.round(s.pariPassuPct1 * 100)}%)`,
      amount: lender1Amt,
      rate: s.pariPassuRate1,
      termYears: s.pariPassuTermYears,
      monthlyPayment: payment1 / 12,
      annualPayment: payment1,
      note: 'Equal-priority co-lender — same seniority on collateral',
    });
    loanDetails.push({
      label: `Pari Passu — Lender B (${Math.round((1 - s.pariPassuPct1) * 100)}%)`,
      amount: lender2Amt,
      rate: s.pariPassuRate2,
      termYears: s.pariPassuTermYears,
      monthlyPayment: payment2 / 12,
      annualPayment: payment2,
      note: 'Equal-priority co-lender — same seniority on collateral',
    });
  } else {
    // Conventional
    const annual = pmt(s.conventionalRate, s.conventionalTermYears, loanAmount);
    annualDebtService = annual;
    loanDetails.push({
      label: 'Conventional',
      amount: loanAmount,
      rate: s.conventionalRate,
      termYears: s.conventionalTermYears,
      monthlyPayment: annual / 12,
      annualPayment: annual,
    });
  }

  const monthlyPayment = annualDebtService / 12;
  const dscr = annualDebtService > 0 ? noi / annualDebtService : 0;
  const cashFlow = noi - annualDebtService;
  const cashOnCash = totalEquityRequired > 0 ? cashFlow / totalEquityRequired : 0;
  const capRate = s.purchasePrice > 0 ? noi / s.purchasePrice : 0;
  const goingInCapRate = s.purchasePrice > 0 ? noi / (s.purchasePrice + closingCosts + pipTotal) : 0;

  // ── Break-Even Occupancy ───────────────────────────────────────────────────
  // Fixed costs per available room night
  const fixedCostsAnnual = managementFee + propertyTax + insurance + ffeReserve + undistributedExpense;
  const variableCostPerRoomNight = s.adr * s.roomsExpensePct;
  const franchiseCostPerRoomNight = s.adr * franchiseFeePct;
  const netRevenuePerRoomNight = s.adr - variableCostPerRoomNight - franchiseCostPerRoomNight;
  const breakEvenOccupancy =
    netRevenuePerRoomNight > 0
      ? (fixedCostsAnnual + annualDebtService) / (netRevenuePerRoomNight * s.rooms * 365)
      : 0;

  // ── 10-Year Projections ────────────────────────────────────────────────────
  const projections: YearlyProjection[] = [];

  // Determine loan term for balance calc
  const loanTermYears =
    s.loanType === 'sba_7a' ? s.sba7aTermYears :
    s.loanType === 'sba_504' ? s.sba504TermYears :
    s.loanType === 'pari_passu' ? s.pariPassuTermYears :
    s.conventionalTermYears;

  for (let year = 1; year <= 10; year++) {
    const adrY = s.adr * Math.pow(1 + s.adrGrowthPct, year - 1);
    const occY = Math.min(0.95, s.occupancy + s.occupancyGrowthPct * (year - 1));
    const grrY = s.rooms * adrY * occY * 365;
    const revY = grrY * (1 + s.otherRevenuePct);

    const franchiseY = grrY * franchiseFeePct;
    const roomsExpY = grrY * s.roomsExpensePct;
    const undistY = revY * s.undistributedExpensePct;
    const mgmtY = revY * s.managementFeePct;
    const taxY = propertyTax * Math.pow(1.025, year - 1);
    const insY = insurance * Math.pow(1.03, year - 1);
    const ffeY = revY * s.ffeReservePct;

    const noiY = revY - franchiseY - roomsExpY - undistY - mgmtY - taxY - insY - ffeY;
    const cfY = noiY - annualDebtService;

    // Property value = NOI / cap rate (going-in cap rate stays constant for simplicity)
    const exitCapY = capRate + s.exitCapRateDelta / 100;
    const propValY = exitCapY > 0 ? noiY / exitCapY : s.purchasePrice;

    // Loan balance
    let balanceY = 0;
    if (s.loanType === 'sba_7a') {
      balanceY = remainingBalance(s.sba7aRate, s.sba7aTermYears, loanAmount, year);
    } else if (s.loanType === 'sba_504') {
      balanceY =
        remainingBalance(s.sba504BankRate, s.sba504TermYears, s.purchasePrice * s.sba504BankLTV, year) +
        remainingBalance(s.sba504SBARate, s.sba504TermYears, s.purchasePrice * s.sba504SBALTV, year);
    } else if (s.loanType === 'pari_passu') {
      const l1 = loanAmount * s.pariPassuPct1;
      const l2 = loanAmount * (1 - s.pariPassuPct1);
      balanceY =
        remainingBalance(s.pariPassuRate1, s.pariPassuTermYears, l1, year) +
        remainingBalance(s.pariPassuRate2, s.pariPassuTermYears, l2, year);
    } else {
      balanceY = remainingBalance(s.conventionalRate, s.conventionalTermYears, loanAmount, year);
    }

    const equityY = propValY - balanceY;

    projections.push({
      year,
      revenue: revY,
      noi: noiY,
      debtService: annualDebtService,
      cashFlow: cfY,
      propertyValue: propValY,
      loanBalance: balanceY,
      equityValue: equityY,
    });
  }

  // ── IRR Calculations ───────────────────────────────────────────────────────
  const initialOutflow = -(totalEquityRequired);

  function irrForPeriod(years: number): number {
    const cfs = [initialOutflow];
    for (let y = 1; y <= years; y++) {
      const proj = projections[y - 1];
      if (y < years) {
        cfs.push(proj.cashFlow);
      } else {
        // Exit year: operating cash flow + net sale proceeds
        const exitCap = capRate + s.exitCapRateDelta / 100;
        const salePrice = exitCap > 0 ? proj.noi / exitCap : proj.propertyValue;
        const sellingCosts = salePrice * 0.03;
        const netProceeds = salePrice - sellingCosts - proj.loanBalance;
        cfs.push(proj.cashFlow + netProceeds);
      }
    }
    return irr(cfs);
  }

  function equityMultipleForPeriod(years: number): number {
    const cfs = [Math.abs(initialOutflow)];
    for (let y = 1; y <= years; y++) {
      const proj = projections[y - 1];
      if (y < years) {
        cfs.push(proj.cashFlow > 0 ? proj.cashFlow : 0);
      } else {
        const exitCap = capRate + s.exitCapRateDelta / 100;
        const salePrice = exitCap > 0 ? proj.noi / exitCap : proj.propertyValue;
        const sellingCosts = salePrice * 0.03;
        const netProceeds = salePrice - sellingCosts - proj.loanBalance;
        cfs.push((proj.cashFlow > 0 ? proj.cashFlow : 0) + netProceeds);
      }
    }
    const totalDist = cfs.slice(1).reduce((a, b) => a + b, 0);
    return totalDist / cfs[0];
  }

  const irr5yr = irrForPeriod(5);
  const irr10yr = irrForPeriod(10);
  const equityMultiple5yr = equityMultipleForPeriod(5);
  const equityMultiple10yr = equityMultipleForPeriod(10);

  // ── Valuation Triangulation ───────────────────────────────────────────────
  const [capLow, capHigh] = CAP_RATES[s.chainScale]?.[s.marketType] ?? [0.08, 0.10];
  const midCap = (capLow + capHigh) / 2;
  const incomeApproachValue = midCap > 0 ? noi / midCap : 0;

  const [ppkLow, ppkHigh] = PRICE_PER_KEY[s.chainScale]?.[s.marketType] ?? [50000, 150000];
  const ppkRangeLow = ppkLow * s.rooms;
  const ppkRangeHigh = ppkHigh * s.rooms;

  const [rmLow, rmHigh] = REV_MULTIPLIERS[s.chainScale] ?? [3, 5];
  const revMultLow = totalRevenue * rmLow;
  const revMultHigh = totalRevenue * rmHigh;

  let valuationAssessment: 'below_market' | 'fair' | 'above_market' = 'fair';
  const avgMarketValue = (incomeApproachValue + (ppkRangeLow + ppkRangeHigh) / 2 + (revMultLow + revMultHigh) / 2) / 3;
  if (s.purchasePrice < avgMarketValue * 0.92) valuationAssessment = 'below_market';
  else if (s.purchasePrice > avgMarketValue * 1.08) valuationAssessment = 'above_market';

  const pricePerKey = s.purchasePrice / s.rooms;
  const replacementCostPerKey = REPLACEMENT_COST[s.chainScale] ?? 150000;
  const belowReplacementCost = pricePerKey < replacementCostPerKey;

  const revPAR = s.adr * s.occupancy;
  const goppar = gop / (s.rooms * 365);

  return {
    purchasePrice: s.purchasePrice,
    loanAmount,
    downPayment,
    closingCosts,
    pipHardCosts,
    pipSoftCosts,
    pipContingency,
    pipDisplacement,
    pipTotal,
    pipPctOfPrice,
    totalEquityRequired,
    trueCostPerKey,
    grossRoomRevenue,
    totalRevenue,
    franchiseFees,
    franchiseFeePct,
    roomsExpense,
    undistributedExpense,
    managementFee,
    propertyTax,
    insurance,
    ffeReserve,
    totalOperatingExpenses,
    gop,
    gopMargin,
    noi,
    noiMargin,
    noiBefore,
    annualDebtService,
    monthlyPayment,
    dscr,
    loanDetails,
    cashFlow,
    cashOnCash,
    capRate,
    goingInCapRate,
    breakEvenOccupancy,
    projections,
    irr5yr,
    irr10yr,
    equityMultiple5yr,
    equityMultiple10yr,
    incomeApproachValue,
    ppkRangeLow,
    ppkRangeHigh,
    revMultLow,
    revMultHigh,
    valuationAssessment,
    revPAR,
    goppar,
    pricePerKey,
    replacementCostPerKey,
    belowReplacementCost,
  };
}

export function getDefaultPIPCostPerKey(chainScale: string, scope: string): number {
  const costs = PIP_COSTS[chainScale as keyof typeof PIP_COSTS];
  if (!costs) return 35000;
  const [low, high] = costs[scope as keyof typeof costs] ?? [25000, 50000];
  return Math.round((low + high) / 2);
}

export const fmt = {
  currency: (n: number, compact = false): string => {
    if (compact && Math.abs(n) >= 1_000_000) {
      return `$${(n / 1_000_000).toFixed(2)}M`;
    }
    if (compact && Math.abs(n) >= 1_000) {
      return `$${(n / 1_000).toFixed(0)}K`;
    }
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
  },
  pct: (n: number, decimals = 1): string => `${(n * 100).toFixed(decimals)}%`,
  multiple: (n: number): string => `${n.toFixed(2)}x`,
  number: (n: number): string => new Intl.NumberFormat('en-US').format(Math.round(n)),
};
