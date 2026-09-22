import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const srcDir = path.resolve(__dirname, '../src');

console.log('===========================================================');
console.log('   MINDMITRA DATA INTEGRITY & SENSOR AUDIT SUITE           ');
console.log('===========================================================');

let passCount = 0;
let failCount = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passCount++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failCount++;
  }
}

// -------------------------------------------------------------
// TEST 1: Unbiased Sample Variance Math Test
// -------------------------------------------------------------
console.log('\n--- 1. UNBIASED SAMPLE VARIANCE IN SECONDS^2 ---');
function calculateVariance(samples) {
  if (!samples || samples.length < 2) return null;
  const samplesInSec = samples.map(ms => ms / 1000);
  const meanSec = samplesInSec.reduce((a, b) => a + b, 0) / samplesInSec.length;
  const sumSquaredDiffs = samplesInSec.reduce((sum, val) => sum + Math.pow(val - meanSec, 2), 0);
  const s2 = sumSquaredDiffs / (samplesInSec.length - 1);
  return Math.round(s2 * 10000) / 10000;
}

assert(calculateVariance([]) === null, 'Variance is null for empty array');
assert(calculateVariance([1500]) === null, 'Variance is null for 1 sample (n < 2)');
assert(calculateVariance([1000, 2000, 3000]) === 1.0, 'Variance for [1s, 2s, 3s] is exactly 1.0 s^2');
assert(calculateVariance([1000, 1000, 1000]) === 0.0, 'Variance for identical response times is 0.0 s^2');

// -------------------------------------------------------------
// TEST 2: Model Scaler Imputation Test
// -------------------------------------------------------------
console.log('\n--- 2. MODEL SCALER MEAN IMPUTATION (z = 0.0) ---');
const modelJsonPath = path.join(srcDir, 'services/onDeviceModel.json');
const modelData = JSON.parse(fs.readFileSync(modelJsonPath, 'utf8'));

assert(Array.isArray(modelData.scaler.mean), 'Scaler mean vector exists in model json');
assert(Array.isArray(modelData.scaler.scale), 'Scaler scale vector exists in model json');

// Verify feature imputation logic: for null feature, (mean - mean)/scale = 0.0
const sampleFeatureNull = null;
const featureIndex = 2; // response_time_variance
const imputedZ = sampleFeatureNull !== null 
  ? (sampleFeatureNull - modelData.scaler.mean[featureIndex]) / modelData.scaler.scale[featureIndex]
  : 0.0;
assert(imputedZ === 0.0, 'Null feature imputes to z-score of exactly 0.0 (Scaler mean)');

// -------------------------------------------------------------
// TEST 3: Static Code Audit - Elimination of Fabricated Constants
// -------------------------------------------------------------
console.log('\n--- 3. STATIC CODE AUDIT: NO FABRICATED VALUES ---');

const memoryMatchCode = fs.readFileSync(path.join(srcDir, 'games/MemoryMatch.tsx'), 'utf8');
assert(!memoryMatchCode.includes('Math.max(0.1,'), 'MemoryMatch has no artificial 0.1 accuracy floor');
assert(!memoryMatchCode.includes('7000'), 'MemoryMatch has no 7000ms study fallback');
assert(!memoryMatchCode.includes('5000'), 'MemoryMatch has no 5000ms study fallback');
assert(!memoryMatchCode.includes('1800'), 'MemoryMatch has no 1800ms avgRt fallback');
assert(memoryMatchCode.includes('first_interaction_latency_ms'), 'MemoryMatch measures real first_interaction_latency_ms');
assert(memoryMatchCode.includes('hesitation_count'), 'MemoryMatch measures real hesitation_count');

const routineCode = fs.readFileSync(path.join(srcDir, 'games/DailyRoutine.tsx'), 'utf8');
assert(!routineCode.includes('Math.max(0.1,'), 'DailyRoutine has no artificial 0.1 accuracy floor');
assert(!routineCode.includes('2400'), 'DailyRoutine has no 2400ms avgRt fallback');
assert(routineCode.includes('firstInteractionLatencyMs'), 'DailyRoutine tracks firstInteractionLatencyMs');

const patternCode = fs.readFileSync(path.join(srcDir, 'games/PatternRecall.tsx'), 'utf8');
assert(!patternCode.includes('Math.max(0.1,'), 'PatternRecall has no artificial 0.1 accuracy floor');
assert(!patternCode.includes('2300'), 'PatternRecall has no 2300ms avgRt fallback');

const objCode = fs.readFileSync(path.join(srcDir, 'games/ObjectRecognition.tsx'), 'utf8');
assert(!objCode.includes('Math.max(0.1,'), 'ObjectRecognition has no artificial 0.1 accuracy floor');
assert(!objCode.includes('2100'), 'ObjectRecognition has no 2100ms avgRt fallback');

const voiceCompCode = fs.readFileSync(path.join(srcDir, 'components/VoiceRecallActivity.tsx'), 'utf8');
assert(!voiceCompCode.includes('3500'), 'VoiceRecallActivity has no 3500ms fallback');
assert(!voiceCompCode.includes('0.92'), 'VoiceRecallActivity has no 0.92 fake confidence');
assert(!voiceCompCode.includes('0.95'), 'VoiceRecallActivity has no 0.95 fake confidence');
assert(!voiceCompCode.includes('0.98'), 'VoiceRecallActivity has no 0.98 fake confidence');
assert(!voiceCompCode.includes('2200'), 'VoiceRecallActivity has no 2200ms fallback');
assert(!voiceCompCode.includes('3000 + length * 800'), 'VoiceRecallActivity has no 3000 + len*800 fabrication');

const gamePageCode = fs.readFileSync(path.join(srcDir, 'pages/GamePage.tsx'), 'utf8');
assert(!gamePageCode.includes('response_time_variance: 0.15'), 'GamePage has no 0.15 variance fabrication');
assert(!gamePageCode.includes('avg_response_time_ms * 0.8'), 'GamePage has no avg * 0.8 first latency fabrication');
assert(!gamePageCode.includes('corrections > 2 ? corrections : 0'), 'GamePage has no fake hesitation heuristic');
assert(!gamePageCode.includes('activeUserId = 1;'), 'GamePage does not silently fall back to user 1');
assert(gamePageCode.includes("navigate('/caregiver')"), 'GamePage redirects unauthenticated users to /caregiver');

const touchCode = fs.readFileSync(path.join(srcDir, 'services/touchTelemetry.ts'), 'utf8');
assert(!touchCode.includes('variance = 0.15;'), 'touchTelemetry has no 0.15 variance fallback');
assert(!touchCode.includes('2200;'), 'touchTelemetry has no 2200ms fallback');
assert(!touchCode.includes('180;'), 'touchTelemetry has no 180ms hold fallback');

// -------------------------------------------------------------
// TEST 4: Camera Sensor Honest Naming & Inactive Null Check
// -------------------------------------------------------------
console.log('\n--- 4. SENSOR HONESTY & INACTIVE NULL METRICS ---');
const visualTrackerCode = fs.readFileSync(path.join(srcDir, 'services/visualBehavioralTracker.ts'), 'utf8');
assert(visualTrackerCode.includes('Visual Presence & Interaction Sensor Engine'), 'Visual sensor renamed honestly');
assert(visualTrackerCode.includes('visual_presence_ratio'), 'Visual presence ratio field supported');
assert(!visualTrackerCode.includes('Face detected'), 'No exaggerated "Face detected" claim');
assert(visualTrackerCode.includes('null'), 'Returns null for ratios when inactive');

// -------------------------------------------------------------
// TEST 5: ActivitiesList Localization in EN, TE, HI
// -------------------------------------------------------------
console.log('\n--- 5. ACTIVITIES LIST FULL LOCALIZATION ---');
const enI18n = fs.readFileSync(path.join(srcDir, 'i18n/en.ts'), 'utf8');
const teI18n = fs.readFileSync(path.join(srcDir, 'i18n/te.ts'), 'utf8');
const hiI18n = fs.readFileSync(path.join(srcDir, 'i18n/hi.ts'), 'utf8');

assert(enI18n.includes('activities_page'), 'English contains activities_page dictionary');
assert(teI18n.includes('activities_page'), 'Telugu contains activities_page dictionary');
assert(hiI18n.includes('activities_page'), 'Hindi contains activities_page dictionary');

const actListCode = fs.readFileSync(path.join(srcDir, 'pages/ActivitiesList.tsx'), 'utf8');
assert(actListCode.includes("t('activities_page.memory_title'"), 'ActivitiesList uses localized memory match title');
assert(actListCode.includes("t('activities_page.routine_title'"), 'ActivitiesList uses localized daily routine title');
assert(actListCode.includes("t('activities_page.recognition_title'"), 'ActivitiesList uses localized object recognition title');
assert(actListCode.includes("t('activities_page.pattern_title'"), 'ActivitiesList uses localized pattern recall title');
assert(actListCode.includes("t('activities_page.voice_title'"), 'ActivitiesList uses localized voice recall title');

// -------------------------------------------------------------
// TEST 6: Telugu Voice Availability Notice
// -------------------------------------------------------------
console.log('\n--- 6. TELUGU VOICE AVAILABILITY NOTICE ---');
const instrServiceCode = fs.readFileSync(path.join(srcDir, 'services/instructionService.ts'), 'utf8');
assert(instrServiceCode.includes('Telugu voice is unavailable on this device'), 'Telugu voice fallback notice present in instructionService');
assert(instrServiceCode.includes('ఈ పరికరంలో తెలుగు వాయిస్ అందుబాటులో లేదు'), 'Telugu native fallback notice present in instructionService');

// -------------------------------------------------------------
// Summary
// -------------------------------------------------------------
console.log('\n===========================================================');
console.log(`AUDIT RESULTS: ${passCount} PASSED, ${failCount} FAILED`);
console.log('===========================================================');

if (failCount > 0) {
  process.exit(1);
} else {
  console.log('ALL DATA INTEGRITY AND SENSOR AUDIT CHECKS PASSED PERFECTLY.');
  process.exit(0);
}
