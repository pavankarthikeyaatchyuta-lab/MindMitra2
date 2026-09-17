// MindMitra Offline Behavioral Memory Verification Script
import assert from 'assert';

// 1. Mock LocalStorage and performance for Node.js
global.performance = { now: () => Date.now() };
const storage = new Map();
global.localStorage = {
  getItem: (k) => storage.get(k) || null,
  setItem: (k, v) => storage.set(k, String(v)),
  removeItem: (k) => storage.delete(k),
  clear: () => storage.clear()
};

// 2. Test Robust Statistics (Median & MAD)
function calculateMedian(values) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function calculateMAD(values, median) {
  if (values.length <= 1) return 0.05;
  const absDeviations = values.map(v => Math.abs(v - median));
  const mad = calculateMedian(absDeviations);
  return Math.max(0.01, Math.round(mad * 1.4826 * 100) / 100);
}

console.log('--- Test 1: Robust MAD & Outlier Resistance ---');
const cleanAccuracies = [0.88, 0.90, 0.85, 0.92, 0.87, 0.89];
const medianClean = calculateMedian(cleanAccuracies);
const madClean = calculateMAD(cleanAccuracies, medianClean);
console.log('Clean Median:', medianClean, 'MAD:', madClean);
assert.strictEqual(medianClean, 0.885);

// Add an extreme outlier session (e.g. phone was put down during interruption)
const withOutlier = [...cleanAccuracies, 0.20];
const medianWithOutlier = calculateMedian(withOutlier);
const madWithOutlier = calculateMAD(withOutlier, medianWithOutlier);
console.log('With Outlier Median:', medianWithOutlier, 'MAD:', madWithOutlier);
// The median shifts only slightly from 0.885 to 0.88 despite a 0.20 disaster session
assert(Math.abs(medianWithOutlier - 0.88) < 0.02, 'Median should resist single outlier');
console.log('✓ Test 1 Passed: Outlier resistance verified.');

// 3. Multi-Signal Deviation Logic Verification
console.log('\n--- Test 2: Multi-Signal Deviation Rules ---');
function evaluateBaseline(history, currentSession) {
  if (history.length < 3) return { status: 'CALIBRATING' };
  const medianAcc = calculateMedian(history.map(s => s.accuracy));
  const medianLat = calculateMedian(history.map(s => s.mean_response_time_ms));
  const medianCorr = calculateMedian(history.map(s => s.corrections));

  const accDelta = currentSession.accuracy - medianAcc;
  const latencyPctChange = (currentSession.mean_response_time_ms - medianLat) / Math.max(medianLat, 1);
  const corrDelta = currentSession.corrections - medianCorr;
  const hesCount = currentSession.hesitation_count || 0;

  const isMeaningful = (
    accDelta <= -0.15 &&
    (latencyPctChange >= 0.35 || corrDelta >= 2 || currentSession.corrections >= 4 || hesCount >= 3)
  );

  const isMinor = (
    (accDelta <= -0.08 && accDelta > -0.15) ||
    (latencyPctChange >= 0.25 && latencyPctChange < 0.35) ||
    (hesCount >= 2 && !isMeaningful)
  );

  if (isMeaningful) return { status: 'MEANINGFUL_DEVIATION', accDelta, latencyPctChange };
  if (isMinor) return { status: 'MINOR_DEVIATION', accDelta, latencyPctChange };
  return { status: 'NORMAL', accDelta, latencyPctChange };
}

const baselineHistory = [
  { accuracy: 0.88, mean_response_time_ms: 2000, corrections: 1 },
  { accuracy: 0.90, mean_response_time_ms: 1900, corrections: 1 },
  { accuracy: 0.86, mean_response_time_ms: 2100, corrections: 1 },
  { accuracy: 0.92, mean_response_time_ms: 1850, corrections: 0 },
  { accuracy: 0.89, mean_response_time_ms: 1950, corrections: 1 },
];

// Case A: Isolated single mistake (accuracy 72% - drop of 17%, but fast 1900ms and 1 correction)
const isolatedDrop = { accuracy: 0.72, mean_response_time_ms: 1900, corrections: 1, hesitation_count: 0 };
const evalA = evaluateBaseline(baselineHistory, isolatedDrop);
console.log('Case A (Isolated drop):', evalA.status);
assert(evalA.status !== 'MEANINGFUL_DEVIATION', 'Isolated drop should NOT trigger meaningful deviation');
console.log('✓ Case A Passed: Single mistake does not flag false deviation.');

// Case B: Multi-signal fatigue/divergence (accuracy 70% + latency 2800ms (+43%) + 3 corrections)
const fatigueSession = { accuracy: 0.70, mean_response_time_ms: 2800, corrections: 3, hesitation_count: 3 };
const evalB = evaluateBaseline(baselineHistory, fatigueSession);
console.log('Case B (Multi-signal divergence):', evalB.status);
assert.strictEqual(evalB.status, 'MEANINGFUL_DEVIATION', 'Multi-signal must trigger meaningful deviation');
console.log('✓ Case B Passed: Multi-signal divergence reliably detected.');

// 4. Single-Mistake Protection Guard on Adaptation
console.log('\n--- Test 3: Single-Mistake Protection Guard ---');
function decideAdaptation(recommendation, sessionAcc, isMeaningfulDev, currentDiff) {
  let nextDiff = currentDiff;
  if (recommendation === 'DECREASE' || isMeaningfulDev) {
    if (sessionAcc < 0.60 || isMeaningfulDev) {
      nextDiff = Math.max(1, currentDiff - 1);
    }
  } else if (recommendation === 'INCREASE' && !isMeaningfulDev) {
    nextDiff = Math.min(5, currentDiff + 1);
  }
  return nextDiff;
}

// Player at level 3 has 65% accuracy (one slip up, not meaningful deviation)
const diffAfterSlip = decideAdaptation('DECREASE', 0.65, false, 3);
console.log('Level after respectable accuracy (65%):', diffAfterSlip);
assert.strictEqual(diffAfterSlip, 3, 'Level should be maintained, NOT dropped');
console.log('✓ Test 3 Passed: Single-mistake protection guard sustained level.');

console.log('\n========================================');
console.log('ALL OFFLINE BEHAVIORAL TESTS PASSED (100%)');
console.log('========================================');
