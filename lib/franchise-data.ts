import { ChainScale } from './types';

export interface FranchiseBrand {
  label: string;
  family: string;
  chainScale: ChainScale;
  royalty: number;
  marketing: number;
  reservations: number;
  loyalty: number;
  technology: number;
  get totalPct(): number;
}

export const FRANCHISE_BRANDS: Record<string, FranchiseBrand> = {
  // Hilton brands
  hampton_inn: {
    label: 'Hampton Inn',
    family: 'Hilton',
    chainScale: 'upper_midscale',
    royalty: 0.060,
    marketing: 0.020,
    reservations: 0.020,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  home2_suites: {
    label: 'Home2 Suites',
    family: 'Hilton',
    chainScale: 'upper_midscale',
    royalty: 0.050,
    marketing: 0.020,
    reservations: 0.015,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  hilton_garden_inn: {
    label: 'Hilton Garden Inn',
    family: 'Hilton',
    chainScale: 'upscale',
    royalty: 0.055,
    marketing: 0.025,
    reservations: 0.020,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  homewood_suites: {
    label: 'Homewood Suites',
    family: 'Hilton',
    chainScale: 'upscale',
    royalty: 0.055,
    marketing: 0.020,
    reservations: 0.020,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  doubletree: {
    label: 'DoubleTree',
    family: 'Hilton',
    chainScale: 'upscale',
    royalty: 0.055,
    marketing: 0.025,
    reservations: 0.020,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  tapestry: {
    label: 'Tapestry Collection',
    family: 'Hilton',
    chainScale: 'upscale',
    royalty: 0.050,
    marketing: 0.020,
    reservations: 0.015,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  curio: {
    label: 'Curio Collection',
    family: 'Hilton',
    chainScale: 'upper_upscale',
    royalty: 0.050,
    marketing: 0.030,
    reservations: 0.020,
    loyalty: 0.0125,
    technology: 0.0075,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  // Choice Hotels brands
  comfort_inn: {
    label: 'Comfort Inn',
    family: 'Choice Hotels',
    chainScale: 'midscale',
    royalty: 0.055,
    marketing: 0.0175,
    reservations: 0.015,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  comfort_suites: {
    label: 'Comfort Suites',
    family: 'Choice Hotels',
    chainScale: 'midscale',
    royalty: 0.055,
    marketing: 0.0175,
    reservations: 0.015,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  quality_inn: {
    label: 'Quality Inn',
    family: 'Choice Hotels',
    chainScale: 'midscale',
    royalty: 0.045,
    marketing: 0.0175,
    reservations: 0.015,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  sleep_inn: {
    label: 'Sleep Inn',
    family: 'Choice Hotels',
    chainScale: 'midscale',
    royalty: 0.045,
    marketing: 0.0175,
    reservations: 0.015,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  cambria: {
    label: 'Cambria Hotels',
    family: 'Choice Hotels',
    chainScale: 'upscale',
    royalty: 0.060,
    marketing: 0.020,
    reservations: 0.020,
    loyalty: 0.015,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  woodspring: {
    label: 'WoodSpring Suites',
    family: 'Choice Hotels',
    chainScale: 'economy',
    royalty: 0.055,
    marketing: 0.020,
    reservations: 0.015,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  econo_lodge: {
    label: 'Econo Lodge',
    family: 'Choice Hotels',
    chainScale: 'economy',
    royalty: 0.045,
    marketing: 0.015,
    reservations: 0.010,
    loyalty: 0.010,
    technology: 0.005,
    get totalPct() { return this.royalty + this.marketing + this.reservations + this.loyalty + this.technology; },
  },
  independent: {
    label: 'Independent / Boutique',
    family: 'Independent',
    chainScale: 'upper_midscale',
    royalty: 0,
    marketing: 0,
    reservations: 0,
    loyalty: 0,
    technology: 0,
    get totalPct() { return 0; },
  },
};

// Cap rate benchmarks by chain scale and market
export const CAP_RATES: Record<ChainScale, Record<string, [number, number]>> = {
  economy: {
    primary: [0.095, 0.125],
    secondary: [0.105, 0.140],
    tertiary: [0.120, 0.160],
  },
  midscale: {
    primary: [0.085, 0.105],
    secondary: [0.095, 0.120],
    tertiary: [0.110, 0.140],
  },
  upper_midscale: {
    primary: [0.075, 0.095],
    secondary: [0.085, 0.110],
    tertiary: [0.095, 0.125],
  },
  upscale: {
    primary: [0.065, 0.085],
    secondary: [0.075, 0.095],
    tertiary: [0.085, 0.110],
  },
  upper_upscale: {
    primary: [0.055, 0.075],
    secondary: [0.065, 0.085],
    tertiary: [0.075, 0.100],
  },
  luxury: {
    primary: [0.045, 0.065],
    secondary: [0.055, 0.075],
    tertiary: [0.065, 0.090],
  },
};

// Price per key benchmarks
export const PRICE_PER_KEY: Record<ChainScale, Record<string, [number, number]>> = {
  economy: {
    primary: [35000, 80000],
    secondary: [25000, 55000],
    tertiary: [15000, 40000],
  },
  midscale: {
    primary: [60000, 120000],
    secondary: [45000, 90000],
    tertiary: [30000, 65000],
  },
  upper_midscale: {
    primary: [90000, 180000],
    secondary: [70000, 140000],
    tertiary: [50000, 100000],
  },
  upscale: {
    primary: [150000, 300000],
    secondary: [120000, 220000],
    tertiary: [90000, 160000],
  },
  upper_upscale: {
    primary: [250000, 500000],
    secondary: [200000, 380000],
    tertiary: [150000, 280000],
  },
  luxury: {
    primary: [500000, 1500000],
    secondary: [350000, 750000],
    tertiary: [350000, 600000],
  },
};

// Revenue multiplier benchmarks
export const REV_MULTIPLIERS: Record<ChainScale, [number, number]> = {
  economy: [2.5, 3.5],
  midscale: [3.0, 4.0],
  upper_midscale: [3.5, 5.0],
  upscale: [4.5, 6.0],
  upper_upscale: [6.0, 8.0],
  luxury: [8.0, 12.0],
};

// Replacement cost per key (2024-2026)
export const REPLACEMENT_COST: Record<ChainScale, number> = {
  economy: 100000,
  midscale: 135000,
  upper_midscale: 170000,
  upscale: 230000,
  upper_upscale: 325000,
  luxury: 600000,
};

// GOP margin benchmarks
export const GOP_MARGINS: Record<ChainScale, [number, number]> = {
  economy: [0.40, 0.58],
  midscale: [0.42, 0.60],
  upper_midscale: [0.44, 0.62],
  upscale: [0.42, 0.58],
  upper_upscale: [0.28, 0.45],
  luxury: [0.22, 0.40],
};

// PIP cost per key benchmarks
export const PIP_COSTS: Record<ChainScale, Record<string, [number, number]>> = {
  economy: {
    cosmetic: [8000, 15000],
    moderate: [15000, 25000],
    comprehensive: [20000, 35000],
  },
  midscale: {
    cosmetic: [15000, 25000],
    moderate: [25000, 40000],
    comprehensive: [35000, 55000],
  },
  upper_midscale: {
    cosmetic: [20000, 35000],
    moderate: [35000, 55000],
    comprehensive: [50000, 80000],
  },
  upscale: {
    cosmetic: [30000, 50000],
    moderate: [50000, 80000],
    comprehensive: [75000, 120000],
  },
  upper_upscale: {
    cosmetic: [50000, 100000],
    moderate: [100000, 175000],
    comprehensive: [150000, 250000],
  },
  luxury: {
    cosmetic: [80000, 150000],
    moderate: [150000, 250000],
    comprehensive: [200000, 400000],
  },
};

export const CHAIN_SCALE_LABELS: Record<ChainScale, string> = {
  economy: 'Economy',
  midscale: 'Midscale',
  upper_midscale: 'Upper Midscale',
  upscale: 'Upscale',
  upper_upscale: 'Upper Upscale',
  luxury: 'Luxury',
};
