import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://127.0.0.1:3000';

async function runMemoryMatchStudyPhaseQA() {
  console.log('===========================================================');
  console.log('  MINDMITRA MEMORY MATCH TWO-PHASE (STUDY & RECALL) QA     ');
  console.log('===========================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  let testsPassed = 0;
  let testsFailed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      testsPassed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      testsFailed++;
    }
  }

  try {
    // 1. User Login
    console.log('\n--- 1. LOGIN ---');
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    await page.type('input[type="email"]', 'pavan@mindmitra.com');
    await page.type('input[type="password"]', 'mindmitra123');
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
    assert(page.url().includes('/caregiver') || page.url().includes('/home'), 'Logged in successfully');

    // 2. Open Memory Match
    console.log('\n--- 2. LAUNCH MEMORY MATCH (PHASE 1: STUDY) ---');
    await page.goto(`${BASE_URL}/activity/memory`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.grid button', { timeout: 6000 });

    const cards = await page.$$('.grid button');
    assert(cards.length >= 6, `Memory Match rendered ${cards.length} cards`);

    // Verify all cards are face-up in Phase 1 (Study Phase)
    const cardTexts = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.grid button'));
      return btns.map(b => b.textContent.trim());
    });

    const nonQuestionCards = cardTexts.filter(t => t !== '?');
    assert(nonQuestionCards.length === cards.length, `All ${cards.length} cards are face-up showing symbols during Study Phase`);

    // Verify Phase 1 banner and "I'm Ready" CTA
    const bodyTextStudy = await page.evaluate(() => document.body.innerText);
    assert(
      bodyTextStudy.toUpperCase().includes('PHASE 1') || bodyTextStudy.toUpperCase().includes('STUDY') || bodyTextStudy.includes('గమనించే'),
      'Study Phase banner is rendered'
    );
    assert(
      bodyTextStudy.includes("Take a moment to remember") || bodyTextStudy.includes("గుర్తుంచుకోవడానికి") || bodyTextStudy.includes("ध्यान से देखें"),
      'Spoken/written Study instruction displayed'
    );

    const imReadyBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes("I'm Ready") || b.textContent.includes("సిద్ధంగా") || b.textContent.includes("तैयार"));
    });
    assert(imReadyBtn, "Found 'I'm Ready' button in Study Phase");

    // Click card during study phase — should not complete match or change cards
    await cards[0].click();
    await new Promise(r => setTimeout(r, 200));
    const stillInStudy = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.grid button'));
      return btns.every(b => b.textContent.trim() !== '?');
    });
    assert(stillInStudy, 'Tapping cards during Study Phase does not complete matches or trigger premature gameplay');

    // 3. Transition to Phase 2: Recall
    console.log('\n--- 3. TRANSITION TO PHASE 2 (RECALL) ---');
    const clickedReady = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const ready = btns.find(b => b.textContent.includes("I'm Ready") || b.textContent.includes("సిద్ధంగా") || b.textContent.includes("तैयार"));
      if (ready) {
        ready.click();
        return true;
      }
      return false;
    });
    assert(clickedReady, "Clicked 'I'm Ready' button to enter Recall Phase");

    await new Promise(r => setTimeout(r, 600));

    // Verify all cards are flipped face-down ('?')
    const recallCardTexts = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.grid button'));
      return btns.map(b => b.textContent.trim());
    });
    const questionCards = recallCardTexts.filter(t => t === '?');
    assert(questionCards.length === cards.length, `All ${cards.length} cards flipped face-down for Recall Phase`);

    // Verify Phase 2 banner
    const bodyTextRecall = await page.evaluate(() => document.body.innerText);
    assert(
      bodyTextRecall.includes('Phase 2') || bodyTextRecall.includes("matching pairs") || bodyTextRecall.includes("సరిపోలే"),
      'Recall Phase instruction banner rendered'
    );

    // 4. Interactive Matching in Recall Phase
    console.log('\n--- 4. INTERACTIVE MATCHING IN RECALL PHASE ---');
    // Click first card
    await cards[0].click();
    await new Promise(r => setTimeout(r, 300));

    const card0Text = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('.grid button'));
      return btns[0].textContent.trim();
    });
    assert(card0Text !== '?', `Card 0 flipped face-up: ${card0Text}`);

    // Click second card
    await cards[1].click();
    await new Promise(r => setTimeout(r, 800));

    // 5. Verify Session Result Screen Data Integrity
    console.log('\n--- 5. SESSION RESULT DATA INTEGRITY VERIFICATION ---');

    // Test A: Access /session-result with empty session storage (must NOT fake 88% or fake 1.8s)
    await page.evaluate(() => {
      sessionStorage.removeItem('mindmitra_last_metrics');
      sessionStorage.removeItem('mindmitra_last_adaptive');
    });

    await page.goto(`${BASE_URL}/session-result/latest`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));

    const emptyResultText = await page.evaluate(() => document.body.innerText);
    assert(
      emptyResultText.includes('No Recent Activity Session') || emptyResultText.includes('Choose an Activity'),
      'Session Result displays clean empty state with ZERO fake metrics when no session has been played'
    );
    assert(!emptyResultText.includes('88%'), 'Zero fake 88% placeholder on unplayed session');

    // Test B: Store strictly measured telemetry and verify real-time display
    await page.evaluate(() => {
      sessionStorage.setItem('mindmitra_last_metrics', JSON.stringify({
        accuracy: 0.75,
        avg_response_time_ms: 2340,
        corrections: 2,
        repeat_errors: 1,
        completion_time_ms: 18400,
        total_events: 8,
        study_duration_ms: 5400,
        first_interaction_latency_ms: 1620,
        mismatches: 2,
        difficulty: 3,
        game_type: 'memory_match',
        id: 9999
      }));
      sessionStorage.setItem('mindmitra_last_adaptive', JSON.stringify({
        recommended_difficulty: 3,
        recommendation: 'MAINTAIN',
        inference_latency_ms: 1.1,
        reason: 'Measured cadence steady and aligned with comfort level.'
      }));
    });

    await page.goto(`${BASE_URL}/session-result/9999`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 500));

    const measuredResultText = await page.evaluate(() => document.body.innerText);
    assert(measuredResultText.includes('75%'), 'Displays strictly measured real-time accuracy: 75%');
    assert(measuredResultText.includes('2.3s'), 'Displays strictly measured real-time response latency: 2.3s');
    assert(measuredResultText.includes('5.4s'), 'Displays strictly measured study duration: 5.4s');
    assert(measuredResultText.includes('1.6s'), 'Displays measured first card latency: 1.6s');
    assert(measuredResultText.includes('1.1ms'), 'Displays measured on-device ML latency: 1.1ms');
    assert(measuredResultText.includes('Memory Match'), 'Correctly identifies activity title as Memory Match');

    console.log('\n===========================================================');
    console.log(`TOTAL TESTS: ${testsPassed + testsFailed} | PASSED: ${testsPassed} | FAILED: ${testsFailed}`);
    console.log('===========================================================');

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runMemoryMatchStudyPhaseQA();
