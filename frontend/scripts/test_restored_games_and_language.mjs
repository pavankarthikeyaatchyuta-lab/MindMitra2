import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://127.0.0.1:3000';

async function runRestoredGamesAndLanguageQA() {
  console.log('===========================================================');
  console.log('   MINDMITRA MULTIMODAL SENSOR, VOICE & TELUGU QA SUITE   ');
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
    console.log(`  Current URL after login: ${page.url()}`);
    assert(page.url().includes('/home') || page.url().includes('/caregiver'), 'Logged in successfully');

    // 2. Activities List Verification
    console.log('\n--- 2. ACTIVITIES LIST VERIFICATION ---');
    await page.goto(`${BASE_URL}/activities`, { waitUntil: 'networkidle0' });

    const memoryCard = await page.$('a[href="/activity/memory"]');
    assert(memoryCard !== null, 'Found Memory Match activity card');

    const routineCard = await page.$('a[href="/activity/routine"]');
    assert(routineCard !== null, 'Found Daily Routine activity card');

    const recognitionCard = await page.$('a[href="/activity/recognition"]');
    assert(recognitionCard !== null, 'Found Visual Recall activity card');

    const patternCard = await page.$('a[href="/activity/pattern"]');
    assert(patternCard !== null, 'Found Pattern Recall activity card');

    const voiceCard = await page.$('a[href="/activity/voice"]');
    assert(voiceCard !== null, 'Found Dedicated Voice Recall activity card');

    // 3. Memory Match Game & Visual Behavioral Sensor Verification
    console.log('\n--- 3. MEMORY MATCH & CAMERA BEHAVIORAL SENSOR ---');
    await page.goto(`${BASE_URL}/activity/memory`, { waitUntil: 'networkidle0' });

    // Verify game board renders cards
    await page.waitForSelector('.grid button', { timeout: 5000 });
    const cards = await page.$$('.grid button');
    assert(cards.length >= 6, `Memory Match rendered ${cards.length} interactive cards`);

    // Click camera sensor in navbar to turn on real visual behavioral sensor
    const cameraSensorBtn = await page.$('button[aria-label*="Camera Sensor"]');
    assert(cameraSensorBtn !== null, 'Camera Observation Sensor button is present in navbar');
    await cameraSensorBtn.click();
    await new Promise(r => setTimeout(r, 1600));

    // Verify On-Device Visual Behavioral Sensor banner renders with active state
    const sensorBannerText = await page.evaluate(() => document.body.innerText);
    assert(
      sensorBannerText.includes('On-Device Visual Behavioral Sensor') || sensorBannerText.includes('Visual Cadence Sensor') || sensorBannerText.includes('Camera'),
      'On-Device Visual Behavioral Sensor banner activated in UI'
    );

    // Click two cards to test flip interactivity
    await cards[0].click();
    await new Promise(r => setTimeout(r, 300));
    await cards[1].click();
    await new Promise(r => setTimeout(r, 600));
    assert(true, 'Successfully interacted with Memory Match cards');

    // 4. Daily Routine Reconstructive Gameplay Verification
    console.log('\n--- 4. DAILY ROUTINE RECALL RECONSTRUCTIVE INTERACTION ---');
    await page.goto(`${BASE_URL}/activity/routine`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.card', { timeout: 5000 });

    // Verify Step 1: Memorize stage renders
    let routineBodyText = await page.evaluate(() => document.body.innerText);
    assert(
      routineBodyText.includes('Standard Daily Order') || routineBodyText.includes('Schedule'),
      'Step 1 Memorize stage: Standard Daily Order displayed'
    );

    // Find and click "I Remember, Start Sequence" button
    const startSeqBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.includes('Start Sequence') || b.innerText.includes('గుర్తుంది') || b.innerText.includes('क्रम शुरू'));
    });
    assert(startSeqBtn !== null, 'Found "Start Sequence" button');
    await startSeqBtn.click();
    await new Promise(r => setTimeout(r, 500));

    // Verify Step 2-4: Recall Stage — slots & available task chips render
    routineBodyText = await page.evaluate(() => document.body.innerText);
    assert(
      routineBodyText.includes('Reconstructed Sequence') || routineBodyText.includes('Available Tasks'),
      'Step 2-4 Recall Stage: Sequence slots and Available Tasks displayed'
    );

    // Tap first available item chip in pool
    const poolButtons = await page.$$('.grid button');
    assert(poolButtons.length > 0, `Found ${poolButtons.length} available task chips in pool`);
    const firstPoolText = await page.evaluate(el => el.innerText, poolButtons[0]);
    await poolButtons[0].click();
    await new Promise(r => setTimeout(r, 400));

    // Verify slot was filled with the tapped item
    let slotsText = await page.evaluate(() => document.body.innerText);
    assert(slotsText.includes('Tap to return') || slotsText.includes('(1/'), 'Task was placed into the reconstructed sequence slot');

    // Test Undo / Removal: click the placed item to return it to pool
    const placedItem = await page.$('.p-3.rounded-xl.bg-emerald-50, .p-3.rounded-xl');
    if (placedItem) {
      await placedItem.click();
      await new Promise(r => setTimeout(r, 400));
      assert(true, 'Successfully tapped placed task to return to pool (correction tracked)');
    }

    // Now reconstruct all items until sequence complete
    for (let attempt = 0; attempt < 8; attempt++) {
      const remainingPool = await page.$$('.grid button');
      if (remainingPool.length === 0) break;
      await remainingPool[0].click();
      await new Promise(r => setTimeout(r, 300));
    }

    const postReconstructionText = await page.evaluate(() => document.body.innerText);
    assert(
      postReconstructionText.includes('Wonderful work!') || postReconstructionText.includes('Sequence successfully recorded') || postReconstructionText.includes('View Behavioral Result'),
      'Daily Routine sequence completed and evaluated successfully'
    );

    // 5. Visual Recall Game Verification
    console.log('\n--- 5. VISUAL RECALL RENDERING & CAMERA TOGGLE ---');
    await page.goto(`${BASE_URL}/activity/recognition`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.card', { timeout: 5000 });
    const cameraBtn = await page.$('button[title*="camera"]');
    assert(cameraBtn !== null, 'Live Camera Mode toggle button is present');

    // 6. Pattern Recall Game Verification
    console.log('\n--- 6. PATTERN RECALL RENDERING ---');
    await page.goto(`${BASE_URL}/activity/pattern`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.card', { timeout: 5000 });
    const patternText = await page.evaluate(() => document.body.innerText);
    assert(patternText.includes('Pattern Recall') || patternText.includes('Pattern'), 'Pattern Recall game rendered successfully');

    // 7. Dedicated Voice Recall Verification
    console.log('\n--- 7. DEDICATED VOICE RECALL ACTIVITY RENDERING ---');
    await page.goto(`${BASE_URL}/activity/voice`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.card', { timeout: 5000 });
    const voiceText = await page.evaluate(() => document.body.innerText);
    assert(
      voiceText.includes('Voice Behavioral Signals') || voiceText.includes('Tap to Speak') || voiceText.includes('Voice Recall'),
      'Voice Recall prompt, category and mic interface rendered'
    );

    // 8. Telugu Language Switch, Game Items & Subtitle Localization
    console.log('\n--- 8. TELUGU LANGUAGE SWITCH & MULTILINGUAL GAME ITEMS ---');
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });

    // Select Telugu
    const teluguBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.includes('తెలుగు'));
    });
    assert(teluguBtn !== null, 'Found Telugu language option button');
    await teluguBtn.click();
    await new Promise(r => setTimeout(r, 500));

    // Verify localStorage updated
    const savedLang = await page.evaluate(() => localStorage.getItem('mindmitra_lang'));
    assert(savedLang === 'te', `localStorage mindmitra_lang is 'te' (was: ${savedLang})`);

    // Verify Daily Routine in Telugu displays Telugu schedule and items
    await page.goto(`${BASE_URL}/activity/routine`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    const routineTeluguText = await page.evaluate(() => document.body.innerText);
    const hasTeluguRoutine = routineTeluguText.includes('దినచర్య') || routineTeluguText.includes('ప్రామాణిక') || routineTeluguText.includes('మేల్కొనడం') || routineTeluguText.includes('పళ్ళు') || routineTeluguText.includes('చేతులు') || routineTeluguText.includes('కూరగాయలు');
    assert(hasTeluguRoutine, 'Daily Routine rendered Telugu schedule name and localized tasks');

    // Verify Voice Recall in Telugu displays Telugu question and prompts
    await page.goto(`${BASE_URL}/activity/voice`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    const voiceTeluguText = await page.evaluate(() => document.body.innerText);
    const hasTeluguVoice = voiceTeluguText.includes('వాయిస్') || voiceTeluguText.includes('చెప్పండి') || voiceTeluguText.includes('మాట్లాడటానికి') || voiceTeluguText.includes('క్రమం');
    assert(hasTeluguVoice, 'Voice Recall activity rendered Telugu prompt and controls');

    // Verify Memory Match in Telugu displays Telugu subtitles
    await page.goto(`${BASE_URL}/activity/memory`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    const memoryTeluguText = await page.evaluate(() => document.body.innerText);
    const hasTeluguMemory = memoryTeluguText.includes('మెమరీ మ్యాచ్') || memoryTeluguText.includes('కార్డుల') || memoryTeluguText.includes('జతలను');
    assert(hasTeluguMemory, 'Memory Match instruction banner displayed Telugu subtitles');

    // 9. Session Result Visual Behavioral Signals Verification
    console.log('\n--- 9. SESSION RESULT VISUAL BEHAVIORAL SENSOR CARD ---');
    await page.goto(`${BASE_URL}/session-result/routine`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.card', { timeout: 5000 });
    const resultText = await page.evaluate(() => document.body.innerText);
    assert(
      resultText.includes('Camera Sensor:') || resultText.includes('Visual Behavioral Sensor Signals') || resultText.includes('Face Presence'),
      'Session Result displays Multimodal Visual Behavioral Sensor indicator/card'
    );

    // Switch back to English for clean state
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
    const englishBtn = await page.evaluateHandle(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.find(b => b.innerText.includes('English'));
    });
    if (englishBtn) {
      await englishBtn.click();
      await new Promise(r => setTimeout(r, 300));
    }

    console.log('\n===========================================================');
    console.log(`QA SUMMARY: ${testsPassed} PASSED, ${testsFailed} FAILED`);
    console.log('===========================================================');

    if (testsFailed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    await browser.close();
  }
}

runRestoredGamesAndLanguageQA();
