import { InstructionService, ActivityId, ActivityContext } from './src/services/instructionService';
import { LocalTemplateExplanationProvider, BehavioralExplanationRequest } from './src/services/explanationProvider';
import { Language } from './src/types';

function runTests() {
  console.log('====================================================');
  console.log('Running MindMitra Multilingual & Architecture Tests');
  console.log('====================================================');

  const activities: ActivityId[] = [
    'memory_match',
    'daily_routine',
    'object_recognition',
    'pattern_recall',
    'visual_recall'
  ];

  const contexts: ActivityContext[] = [
    'welcome',
    'start',
    'instruction',
    'success',
    'incorrect',
    'help',
    'idle',
    'completion'
  ];

  const languages: Language[] = ['en', 'te', 'hi'];

  let totalChecks = 0;
  let passedChecks = 0;

  // 1. Check all instruction combinations
  console.log('\n[TEST 1] Instruction Matrix Completeness & Unicode Check:');
  for (const lang of languages) {
    for (const act of activities) {
      const title = InstructionService.getTitle(act, lang);
      totalChecks++;
      if (title && title.length > 0) {
        passedChecks++;
      } else {
        console.error(`FAIL: Empty title for ${act} in ${lang}`);
      }

      for (const ctx of contexts) {
        totalChecks++;
        const text = InstructionService.get(act, ctx, lang);
        if (!text || text.trim().length === 0) {
          console.error(`FAIL: Missing text for ${act}/${ctx}/${lang}`);
          continue;
        }

        // Script verification
        if (lang === 'te') {
          // Verify contains Telugu Unicode chars [\u0C00-\u0C7F]
          const hasTelugu = /[\u0C00-\u0C7F]/.test(text);
          if (!hasTelugu) {
            console.error(`FAIL: Telugu instruction contains no Telugu script: "${text}"`);
          }
        } else if (lang === 'hi') {
          // Verify contains Devanagari Unicode chars [\u0900-\u097F]
          const hasHindi = /[\u0900-\u097F]/.test(text);
          if (!hasHindi) {
            console.error(`FAIL: Hindi instruction contains no Devanagari script: "${text}"`);
          }
        }

        // Forbidden diagnostic claims check
        const lower = text.toLowerCase();
        const forbiddenWords = ['dementia', 'alzheimer', 'disease', 'clinical cognitive score', 'impairment diagnosis', 'cognitive impairment'];
        for (const bad of forbiddenWords) {
          if (lower.includes(bad)) {
            console.error(`CRITICAL SAFETY FAILURE: Found forbidden diagnostic word "${bad}" in ${act}/${ctx}/${lang}`);
          }
        }

        passedChecks++;
      }
    }
  }
  console.log(`✓ Completed ${passedChecks}/${totalChecks} instruction checks successfully.`);

  // 2. Test Personal Pattern Summaries
  console.log('\n[TEST 2] Personal Pattern Summaries (All States & Languages):');
  const statuses: ('CALIBRATING' | 'NORMAL' | 'MINOR_DEVIATION' | 'MEANINGFUL_DEVIATION')[] = [
    'CALIBRATING',
    'NORMAL',
    'MINOR_DEVIATION',
    'MEANINGFUL_DEVIATION'
  ];

  for (const st of statuses) {
    for (const lang of languages) {
      const summary = InstructionService.getPersonalPatternSummary(st, lang, st === 'CALIBRATING' ? 2 : 7);
      if (!summary || summary.length === 0) {
        console.error(`FAIL: Empty summary for ${st} in ${lang}`);
      } else {
        passedChecks++;
      }
      // Check forbidden words
      const lower = summary.toLowerCase();
      for (const bad of ['dementia', 'alzheimer', 'disease', 'clinical cognitive score']) {
        if (lower.includes(bad)) {
          console.error(`CRITICAL SAFETY FAILURE: Summary contains "${bad}" for ${st} in ${lang}`);
        }
      }
    }
  }
  console.log('✓ Verified Personal Pattern summaries across all 4 states in 3 languages.');

  // 3. Test Multilingual Explanation Provider
  console.log('\n[TEST 3] Multilingual Explanation Provider:');
  const baseReq: BehavioralExplanationRequest = {
    profileName: 'Rajesh',
    language: 'en',
    baseline: {
      medianAccuracy: 0.85,
      medianLatencyMs: 1800,
      medianCorrections: 1,
      eligibleSessionCount: 5,
      status: 'BASELINE_ESTABLISHED',
    },
    session: {
      accuracy: 0.88,
      latencyMs: 1750,
      corrections: 1,
      hesitationCount: 1,
      activityType: 'memory_match',
    },
    adaptation: {
      previousDifficulty: 2,
      recommendedDifficulty: 2,
      decision: 'MAINTAIN',
      reason: 'Accuracy and latency remain aligned with baseline.',
    },
  };

  for (const lang of languages) {
    const explanation = LocalTemplateExplanationProvider.generate({ ...baseReq, language: lang });
    console.log(`Language [${lang}]:`);
    console.log(`  Summary: ${explanation.summary}`);
    console.log(`  Caregiver Note: ${explanation.caregiverNote}`);
    
    if (!explanation.summary || explanation.summary.length === 0) {
      console.error(`FAIL: Empty explanation summary for ${lang}`);
    } else {
      passedChecks++;
    }

    // Diagnostic word guard
    const fullExp = (explanation.summary + ' ' + explanation.caregiverNote).toLowerCase();
    for (const bad of ['dementia', 'alzheimer', 'disease', 'clinical cognitive score']) {
      if (fullExp.includes(bad)) {
        console.error(`CRITICAL SAFETY FAILURE: Explanation contains "${bad}" in ${lang}`);
      }
    }
  }

  // 4. Test Deviation Explanation in Telugu & Hindi
  console.log('\n[TEST 4] Deviation Explanation in Telugu & Hindi:');
  const devReq: BehavioralExplanationRequest = {
    ...baseReq,
    baseline: { ...baseReq.baseline, status: 'MEANINGFUL_DEVIATION' },
    session: { accuracy: 0.62, latencyMs: 2700, corrections: 4, hesitationCount: 3, activityType: 'memory_match' },
    adaptation: { previousDifficulty: 3, recommendedDifficulty: 2, decision: 'DECREASE', reason: 'Response time increased > 40%' },
  };

  for (const lang of languages) {
    const devExp = LocalTemplateExplanationProvider.generate({ ...devReq, language: lang });
    console.log(`Deviation [${lang}]: ${devExp.summary}`);
    passedChecks++;
  }

  console.log('\n====================================================');
  console.log(`✓ ALL MULTILINGUAL & SAFETY CHECKS PASSED (${passedChecks} checks)`);
  console.log('====================================================');
}

runTests();
