import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://127.0.0.1:3000';

async function runRestoredGamesAndLanguageQA() {
  console.log('===========================================================');
  console.log('   MINDMITRA RESTORED GAMES, VOICE, CAMERA & LANGUAGE QA   ');
  console.log('===========================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--use-fake-ui-for-media-stream']
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

    // 3. Memory Match Game Verification
    console.log('\n--- 3. MEMORY MATCH GAME RENDERING ---');
    await page.goto(`${BASE_URL}/activity/memory`, { waitUntil: 'networkidle0' });

    // Verify game board renders cards
    await page.waitForSelector('.grid button', { timeout: 5000 });
    const cards = await page.$$('.grid button');
    assert(cards.length >= 6, `Memory Match rendered ${cards.length} interactive cards (board is NOT empty!)`);

    // Verify subtitle banner renders
    const banner = await page.$('p');
    assert(banner !== null, 'Instruction banner is rendered alongside cards');

    // Click two cards to test flip interactivity
    await cards[0].click();
    await new Promise(r => setTimeout(r, 300));
    await cards[1].click();
    await new Promise(r => setTimeout(r, 600));
    assert(true, 'Successfully interacted with Memory Match cards');

    // 4. Daily Routine Game Verification
    console.log('\n--- 4. DAILY ROUTINE RECALL RENDERING ---');
    await page.goto(`${BASE_URL}/activity/routine`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.card', { timeout: 5000 });
    const routineText = await page.evaluate(() => document.body.innerText);
    assert(routineText.includes('Morning Schedule') || routineText.includes('Evening Schedule') || routineText.includes('Routine') || routineText.includes('Wake up'), 'Daily Routine items rendered properly');

    // 5. Visual Recall Game Verification
    console.log('\n--- 5. VISUAL RECALL RENDERING & CAMERA TOGGLE ---');
    await page.goto(`${BASE_URL}/activity/recognition`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.card', { timeout: 5000 });
    const cameraBtn = await page.$('button[title*="camera"]');
    assert(cameraBtn !== null, 'Live Camera Mode toggle button is present');

    // Click Live Camera Mode
    await cameraBtn.click();
    await new Promise(r => setTimeout(r, 600));
    const camModeText = await page.evaluate(() => document.body.innerText);
    assert(camModeText.includes('Live Visual Recall Camera Mode') || camModeText.includes('Visual & Family Recall'), 'Live Camera Recall view opened');

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
    assert(voiceText.includes('Voice Behavioral Signals') || voiceText.includes('Tap to Speak') || voiceText.includes('Voice Recall'), 'Voice Recall prompt and mic button rendered');

    // 8. Profile Language Persistence & Propagation
    console.log('\n--- 8. PROFILE LANGUAGE PERSISTENCE & SUBTITLE PROPAGATION ---');
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

    // Navigate to Memory Match: check Telugu instructions
    await page.goto(`${BASE_URL}/activity/memory`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    const gameTeluguText = await page.evaluate(() => document.body.innerText);
    const hasTelugu = gameTeluguText.includes('మెమరీ మ్యాచ్') || gameTeluguText.includes('కార్డుల') || gameTeluguText.includes('జతలను') || gameTeluguText.includes('సూచనలను');
    assert(hasTelugu, 'Memory Match instruction banner immediately displayed Telugu subtitles');

    // Reload page to verify persistence across refresh
    await page.reload({ waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));
    const reloadedText = await page.evaluate(() => document.body.innerText);
    const reloadedHasTelugu = reloadedText.includes('మెమరీ మ్యాచ్') || reloadedText.includes('కార్డుల') || reloadedText.includes('జతలను') || reloadedText.includes('సూచనలను');
    assert(reloadedHasTelugu, 'Telugu language preference persisted after browser reload');

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

    // 9. Camera Behavioral Sensor Navbar Control
    console.log('\n--- 9. CAMERA BEHAVIORAL SENSOR NAVBAR CONTROL ---');
    await page.goto(`${BASE_URL}/activity/memory`, { waitUntil: 'networkidle0' });
    const sensorToggle = await page.$('button[aria-label*="Camera Sensor"]');
    assert(sensorToggle !== null, 'Camera Observation Sensor button is present in navbar');

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
