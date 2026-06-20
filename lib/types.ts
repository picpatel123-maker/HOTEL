export type ChainScale =
  | 'economy'
  | 'midscale'
  | 'upper_midscale'
  | 'upscale'
  | 'upper_upscale'
  | 'luxury';

export type MarketType = 'primary' | 'secondary' | 'tertiary';
export type PIPScope = 'cosmetic' | 'moderate' | 'comprehensive';
export type LoanType = 'sba_7a' | 'sba_504' | 'pari_passu' | 'conventional';

export interface AnalyzerState {
  // Property
  address: string;
  rooms: number;
  chainScale: ChainScale;
  franchise: string;
  marketType: MarketType;

  // Acquisition
  purchasePrice: number;
  ltvPct: number;
  closingCostsPct: number;
  workingCapital: number;

  // PIP
  pipScope: PIPScope;
  pipHardCostPerKey: number;
  pipTimelineMonths: number;
  pipSoftCostPct: number;
  pipContingencyPct: number;

  // Operating
  adr: number;
  occupancy: number;
  otherRevenuePct: number;
  roomsExpensePct: number;
  undistributedExpensePct: number;
  managementFeePct: number;
  propertyTaxRate: number;
  insurancePerKey: number;
  ffeReservePct: number;
  adrGrowthPct: number;
  occupancyGrowthPct: number;

  // Loan
  loanType: LoanType;
  conventionalRate: number;
  conventionalTermYears: number;
  sba7aRate: number;
  sba7aTermYears: number;
  sba504BankRate: number;
  sba504BankLTV: number;
  sba504SBARate: number;
  sba504SBALTV: number;
  sba504TermYears: number;
  pariPassuRate1: number;
  pariPassuPct1: number;
  pariPassuRate2: number;
  pariPassuTermYears: number;

  // Analysis
  holdingPeriod: 5 | 10;
  exitCapRateDelta: number;
}

export interface YearlyProjection {
  year: number;
  revenue: number;
  noi: number;
  debtService: number;
  cashFlow: number;
  propertyValue: number;
  loanBalance: number;
  equityValue: number;
}

export interface LoanDetail {
  label: string;
  amount: number;
  rate: number;
  termYears: number;
  monthlyPayment: number;
  annualPayment: number;
  note?: string;
}

export interface CalculationResults {
  // Capital stack
  purchasePrice: number;
  loanAmount: number;
  downPayment: number;
  closingCosts: number;

  // PIP
  pipHardCosts: number;
  pipSoftCosts: number;
  pipContingency: number;
  pipDisplacement: number;
  pipTotal: number;
  pipPctOfPrice: number;

  // Total equity required
  totalEquityRequired: number;
  trueCostPerKey: number;

  // Revenue
  grossRoomRevenue: number;
  totalRevenue: number;

  // Expense breakdown
  franchiseFees: number;
  franchiseFeePct: number;
  roomsExpense: number;
  undistributedExpense: number;
  managementFee: number;
  propertyTax: number;
  insurance: number;
  ffeReserve: number;
  totalOperatingExpenses: number;

  // Profitability
  gop: number;
  gopMargin: number;
  noi: number;
  noiMargin: number;
  noiBefore: number;

  // Debt service
  annualDebtService: number;
  monthlyPayment: number;
  dscr: number;
  loanDetails: LoanDetail[];

  // Returns
  cashFlow: number;
  cashOnCash: number;
  capRate: number;
  goingInCapRate: number;

  // Break-even
  breakEvenOccupancy: number;

  // Multi-year
  projections: YearlyProjection[];
  irr5yr: number;
  irr10yr: number;
  equityMultiple5yr: number;
  equityMultiple10yr: number;

  // Valuation triangulation
  incomeApproachValue: number;
  ppkRangeLow: number;
  ppkRangeHigh: number;
  revMultLow: number;
  revMultHigh: number;
  valuationAssessment: 'below_market' | 'fair' | 'above_market';

  // Metrics
  revPAR: number;
  goppar: number;
  pricePerKey: number;
  replacementCostPerKey: number;
  belowReplacementCost: boolean;
}
