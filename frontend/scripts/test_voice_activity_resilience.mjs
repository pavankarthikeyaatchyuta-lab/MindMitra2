import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://127.0.0.1:3000';

async function runVoiceActivityResilienceQA() {
  console.log('===========================================================');
  console.log('      MINDMITRA VOICE RECALL RESILIENCE & INTERACTION QA    ');
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

    // 2. Open Voice Recall Activity
    console.log('\n--- 2. LAUNCH VOICE RECALL ACTIVITY ---');
    await page.goto(`${BASE_URL}/activity/voice`, { waitUntil: 'networkidle0' });
    await page.waitForSelector('.card', { timeout: 6000 });

    const bodyText = await page.evaluate(() => document.body.innerText);
    assert(
      bodyText.includes('Daily Temporal Sequence') || bodyText.includes('వాయిస్') || bodyText.includes('Voice Behavioral Signals'),
      'Voice Recall category and title rendered'
    );
    assert(
      bodyText.includes('Tell me three things') || bodyText.includes('మూడు పనులను') || bodyText.includes('तीन काम'),
      'Question prompt rendered'
    );

    // 3. Central Microphone Button Interactivity
    console.log('\n--- 3. CENTRAL MICROPHONE BUTTON VERIFICATION ---');
    const micButton = await page.$('button[aria-label*="Microphone"], button[aria-label*="Speaking"]');
    assert(micButton !== null, 'Central microphone is a clickable interactive button (not a static div)');

    // 4. Primary Tap to Speak Button
    console.log('\n--- 4. PRIMARY ACTION BUTTON ---');
    const tapToSpeakBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Tap to Speak') || b.textContent.includes('మాట్లాడటానికి') || b.textContent.includes('बोलने'));
    });
    assert(tapToSpeakBtn, "'Tap to Speak' primary action button is clearly visible");

    // 5. Interactive Word Chips (Touch + Voice Hybrid)
    console.log('\n--- 5. INTERACTIVE WORD CHIPS ---');
    const wordChipCount = await page.evaluate(() => {
      const chipButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.startsWith('"') && b.textContent.endsWith('"'));
      return chipButtons.length;
    });
    assert(wordChipCount >= 4, `Rendered ${wordChipCount} interactive tap-to-select word buttons`);

    // Click 3 word chips: "tea", "walk", "newspaper"
    const clickedWords = await page.evaluate(() => {
      const chipButtons = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.startsWith('"') && b.textContent.endsWith('"'));
      if (chipButtons.length >= 3) {
        chipButtons[0].click();
        chipButtons[1].click();
        chipButtons[2].click();
        return true;
      }
      return false;
    });
    assert(clickedWords, 'Tapped 3 sample word chips');

    await new Promise(r => setTimeout(r, 600));

    // Verify Continue button appears after choosing words
    const continueBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('Continue') || b.textContent.includes('కొనసాగించండి') || b.textContent.includes('जारी रखें'));
    });
    assert(continueBtn, "'Continue with Results' button appears after selecting recall items");

    // 6. In-Activity Touch Mode Toggle
    console.log('\n--- 6. IN-ACTIVITY TOUCH MODE ---');
    const touchModeBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Touch Mode') || b.textContent.includes('టచ్ మోడ్') || b.textContent.includes('टच मोड'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(touchModeBtn, 'Clicked In-Activity Touch Mode toggle tab');

    await new Promise(r => setTimeout(r, 500));

    // Verify does NOT navigate away to /activities
    assert(page.url().includes('/activity/voice'), 'Touch Mode stays inside activity (does not abort to /activities)');

    // Verify touch tiles rendered
    const touchTileCount = await page.evaluate(() => {
      const grid = document.querySelector('.grid');
      return grid ? grid.querySelectorAll('button').length : 0;
    });
    assert(touchTileCount >= 4, `Touch Mode rendered ${touchTileCount} routine selection tiles`);

    // Click tiles in touch mode
    const tappedTouchTiles = await page.evaluate(() => {
      const tiles = Array.from(document.querySelectorAll('.grid button'));
      if (tiles.length >= 3) {
        tiles[0].click();
        tiles[1].click();
        tiles[2].click();
        return true;
      }
      return false;
    });
    assert(tappedTouchTiles, 'Successfully tapped 3 tiles in Touch Mode');

    await new Promise(r => setTimeout(r, 600));

    // Click Continue to verify completion to Session Result
    console.log('\n--- 7. SESSION RESULT TRANSITION ---');
    const clickedFinish = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const finish = btns.find(b => b.textContent.includes('Continue') || b.textContent.includes('కొనసాగించండి') || b.textContent.includes('जारी रखें'));
      if (finish) {
        finish.click();
        return true;
      }
      return false;
    });
    assert(clickedFinish, 'Clicked Continue to finish Voice Activity');

    await new Promise(r => setTimeout(r, 1200));

    // Verify reached Session Result or Game Complete
    const currentUrl = page.url();
    const finalBodyText = await page.evaluate(() => document.body.innerText);
    assert(
      currentUrl.includes('/session-result') || finalBodyText.includes('Wonderful work') || finalBodyText.includes('Activity Complete'),
      'Successfully advanced to session evaluation and result flow'
    );

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

runVoiceActivityResilienceQA();
