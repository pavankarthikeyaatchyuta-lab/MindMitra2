import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load on-device model JSON
const modelPath = path.join(__dirname, 'services', 'onDeviceModel.json');
const rawModel = JSON.parse(fs.readFileSync(modelPath, 'utf8'));

console.log('=== IQOO ON-DEVICE ML BENCHMARK & ACCURACY AUDIT ===');
console.log(`Loaded model: ${rawModel.n_estimators} estimators, ${rawModel.features.length} features.`);

// JS Implementation of predictOnDevice
function predictOnDevice(features, currentDifficulty = 2) {
  const startTime = performance.now();

  const featureVector = [
    features.accuracy ?? 0.75,
    features.mean_response_time_ms ?? 2500,
    features.response_time_variance ?? 0.15,
    features.repeat_error_rate ?? 0.05,
    features.correction_rate ?? 0.05,
    features.completion_time_ms ?? 30000,
    features.current_difficulty ?? currentDifficulty,
    features.previous_session_accuracy ?? (features.accuracy ?? 0.75),
    features.recent_trend ?? 0.0,
  ];

  // 1. Feature normalization with StandardScaler
  const scaledVector = featureVector.map((val, idx) => {
    const mean = rawModel.scaler.mean[idx] ?? 0;
    const scale = rawModel.scaler.scale[idx] ?? 1;
    return (val - mean) / (scale === 0 ? 1 : scale);
  });

  // 2. Ensemble tree traversal
  const nTrees = rawModel.trees.length;
  const aggregatedProbs = [0, 0, 0];

  for (let i = 0; i < nTrees; i++) {
    const tree = rawModel.trees[i];
    let node = 0;

    while (tree.children_left[node] !== -1) {
      const featIdx = tree.feature[node];
      const threshold = tree.threshold[node];
      if (scaledVector[featIdx] <= threshold) {
        node = tree.children_left[node];
      } else {
        node = tree.children_right[node];
      }
    }

    const leafProbs = tree.value[node];
    aggregatedProbs[0] += leafProbs[0];
    aggregatedProbs[1] += leafProbs[1];
    aggregatedProbs[2] += leafProbs[2];
  }

  const pDecrease = aggregatedProbs[0] / nTrees;
  const pMaintain = aggregatedProbs[1] / nTrees;
  const pIncrease = aggregatedProbs[2] / nTrees;

  let recommendation = 'MAINTAIN';
  let confidence = pMaintain;

  if (pDecrease >= pMaintain && pDecrease >= pIncrease) {
    recommendation = 'DECREASE';
    confidence = pDecrease;
  } else if (pIncrease >= pMaintain && pIncrease >= pDecrease) {
    recommendation = 'INCREASE';
    confidence = pIncrease;
  }

  const endTime = performance.now();
  const latencyMs = endTime - startTime;

  return {
    recommendation,
    confidence,
    probabilities: { DECREASE: pDecrease, MAINTAIN: pMaintain, INCREASE: pIncrease },
    latencyMs,
    scaledVector
  };
}

// 1. Latency Benchmark across 1,000 runs
console.log('\n--- 1. Latency Benchmark (1,000 Iterations) ---');
const latencies = [];
const sampleFeat = {
  accuracy: 0.91,
  mean_response_time_ms: 1850,
  response_time_variance: 0.12,
  repeat_error_rate: 0.02,
  correction_rate: 0.04,
  completion_time_ms: 24000,
  current_difficulty: 3,
  previous_session_accuracy: 0.88,
  recent_trend: 0.1
};

// Warmup
for (let i = 0; i < 50; i++) predictOnDevice(sampleFeat);

for (let i = 0; i < 1000; i++) {
  const res = predictOnDevice(sampleFeat);
  latencies.push(res.latencyMs);
}

latencies.sort((a, b) => a - b);
const medianLatency = latencies[Math.floor(latencies.length * 0.5)];
const p95Latency = latencies[Math.floor(latencies.length * 0.95)];
const p99Latency = latencies[Math.floor(latencies.length * 0.99)];

console.log(`Median Latency: ${medianLatency.toFixed(3)} ms`);
console.log(`P95 Latency:    ${p95Latency.toFixed(3)} ms`);
console.log(`P99 Latency:    ${p99Latency.toFixed(3)} ms`);

// 2. Normalization Verification
console.log('\n--- 2. Normalization Formula Check ---');
const testVal = 0.91;
const expectedScaled = (testVal - rawModel.scaler.mean[0]) / rawModel.scaler.scale[0];
const actualScaled = predictOnDevice(sampleFeat).scaledVector[0];
const diff = Math.abs(expectedScaled - actualScaled);
console.log(`Feature 0: Val=${testVal}, Scaled=${actualScaled.toFixed(5)}, Expected=${expectedScaled.toFixed(5)}, Delta=${diff.toExponential(2)}`);
if (diff < 1e-4) {
  console.log('✓ Normalization matches Python StandardScaler formula exactly.');
} else {
  console.error('✗ Normalization mismatch!');
}

// Output summary as JSON for python audit comparison
const benchmarkSummary = {
  n_estimators: rawModel.n_estimators,
  median_latency_ms: medianLatency,
  p95_latency_ms: p95Latency,
  p99_latency_ms: p99Latency,
  test_scaled_delta: diff
};

fs.writeFileSync(path.join(__dirname, 'benchmark_result.json'), JSON.stringify(benchmarkSummary, null, 2));
console.log('Benchmark completed successfully.');
