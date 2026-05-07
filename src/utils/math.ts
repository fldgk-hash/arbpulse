// ============================================
// Mathematical Utilities for Liquidity Analysis
// ============================================

/**
 * Calculate Gini coefficient from an array of values
 * 0 = perfect equality, 1 = maximum inequality
 * Used to measure LP concentration in a pool
 */
export function calculateGini(values: number[]): number {
  if (values.length === 0) return 0;
  if (values.length === 1) return 1;

  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);

  if (sum === 0) return 0;

  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += sorted[i] * (2 * (i + 1) - n - 1);
  }

  return numerator / (n * sum);
}

/**
 * Calculate Herfindahl-Hirschman Index (HHI)
 * Alternative concentration measure, more sensitive to large holders
 */
export function calculateHHI(shares: number[]): number {
  return shares.reduce((sum, share) => sum + share * share, 0);
}

/**
 * Exponential decay weighting for time-based metrics
 * Recent data weighted more heavily
 */
export function timeDecayWeight(hoursAgo: number, halfLifeHours: number = 24): number {
  return Math.exp(-(Math.LN2 * hoursAgo) / halfLifeHours);
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Scale a value from one range to another
 */
export function scaleRange(
  value: number,
  fromMin: number,
  fromMax: number,
  toMin: number,
  toMax: number
): number {
  const clamped = clamp(value, fromMin, fromMax);
  const ratio = (clamped - fromMin) / (fromMax - fromMin);
  return toMin + ratio * (toMax - toMin);
}

/**
 * Calculate percentiles from an array
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Detect outliers using IQR method
 */
export function detectOutliers(values: number[]): { inliers: number[]; outliers: number[] } {
  if (values.length < 4) return { inliers: values, outliers: [] };

  const sorted = [...values].sort((a, b) => a - b);
  const q1 = percentile(sorted, 25);
  const q3 = percentile(sorted, 75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  return {
    inliers: values.filter(v => v >= lowerBound && v <= upperBound),
    outliers: values.filter(v => v < lowerBound || v > upperBound),
  };
}

/**
 * Calculate volume velocity score
 * Compares recent volume to historical average
 */
export function volumeVelocity(
  volume1h: number,
  volume6h: number,
  volume24h: number
): { score: number; anomaly: boolean } {
  // Expected 1h = 24h / 24, expected 6h = 24h / 4
  const expected1h = volume24h / 24;
  const expected6h = volume24h / 4;

  const ratio1h = expected1h > 0 ? volume1h / expected1h : 0;
  const ratio6h = expected6h > 0 ? volume6h / expected6h : 0;

  // Weighted score: recent activity matters more
  const score = (ratio1h * 0.6 + ratio6h * 0.4) * 100;

  // Anomaly if 1h volume is >3x expected without proportional price move
  const anomaly = ratio1h > 3 && volume1h > 10000;

  return { score: clamp(score, 0, 500), anomaly };
}

/**
 * Estimate time to liquidate a position based on volume flow
 */
export function estimateLiquidationTime(
  positionSize: number,
  volume24h: number,
  slippageTolerance: number = 0.02
): number {
  if (volume24h === 0) return Infinity;

  // Assume we can capture ~5% of daily volume without major impact
  const dailyAbsorbable = volume24h * 0.05 * (1 - slippageTolerance * 10);
  const daysNeeded = positionSize / dailyAbsorbable;

  return daysNeeded * 24 * 60; // Convert to minutes
}
