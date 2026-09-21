import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://127.0.0.1:3000';

async function runGameHintsAndHelpQA() {
  console.log('===========================================================');
  console.log('      MINDMITRA GAME HELP & HINT VERIFICATION QA SUITE     ');
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

    // 2. Memory Match Help & Hint
    console.log('\n--- 2. MEMORY MATCH HINTS ---');
    await page.goto(`${BASE_URL}/activity/memory`, { waitUntil: 'networkidle0' });

    // Check navbar hint button
    const navHintBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('nav button'));
      return btns.some(b => b.textContent.includes('Hint') || b.title.includes('Hint'));
    });
    assert(navHintBtn, 'Navbar contains accessible Hint button');

    // Find and click the Help/Hint button in SynchronizedVoiceBanner
    const bannerHelpBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const helpBtn = btns.find(b => b.title && b.title.includes('Help'));
      if (helpBtn) {
        helpBtn.click();
        return true;
      }
      return false;
    });
    assert(bannerHelpBtn, 'SynchronizedVoiceBanner Help/Hint button clicked');

    await new Promise(r => setTimeout(r, 600));

    // Verify Active Hint Banner rendered on screen
    const hintBannerText = await page.evaluate(() => {
      const banner = document.querySelector('.bg-amber-50');
      return banner ? banner.textContent : null;
    });
    assert(hintBannerText && (hintBannerText.includes('Hint') || hintBannerText.includes('cards')), `Active Hint banner displayed: "${hintBannerText?.substring(0, 60)}..."`);

    // In-game hint button in Memory Match
    const inGameHintBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Hint') && b.title.includes('Peek'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(inGameHintBtn, 'In-game Memory Match peek hint button clicked');

    // Check for animated hinted card peek
    await new Promise(r => setTimeout(r, 500));
    const hasHintedCard = await page.evaluate(() => {
      return document.querySelectorAll('.ring-amber-400, .border-amber-400').length > 0;
    });
    assert(hasHintedCard, 'Memory cards show visual hint peek styling with amber ring');

    // 3. Daily Routine Help & Hint
    console.log('\n--- 3. DAILY ROUTINE HINTS ---');
    await page.goto(`${BASE_URL}/activity/routine`, { waitUntil: 'networkidle0' });

    // Start recall sequence
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find(b => b.textContent.includes('Start Sequence') || b.textContent.includes('గుర్తుంది'));
      if (startBtn) startBtn.click();
    });

    await new Promise(r => setTimeout(r, 600));

    // Find in-game hint button in Daily Routine
    const routineHintClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Hint') && b.title.includes('hint for the next task'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(routineHintClicked, 'Daily Routine in-game Next Step Hint button clicked');

    await new Promise(r => setTimeout(r, 600));

    // Verify hinted pool task chip has Next Step badge
    const hasHintedRoutineChip = await page.evaluate(() => {
      return document.body.textContent.includes('Next Step') || document.querySelectorAll('.ring-amber-400').length > 0;
    });
    assert(hasHintedRoutineChip, 'Next required task chip visually highlighted with Next Step badge');

    // 4. Object Recognition Help & Hint
    console.log('\n--- 4. VISUAL RECALL / OBJECT RECOGNITION HINTS ---');
    await page.goto(`${BASE_URL}/activity/recognition`, { waitUntil: 'networkidle0' });

    const objectHintClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Hint') && b.title.includes('hint'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(objectHintClicked, 'Object Recognition Hint button clicked');

    await new Promise(r => setTimeout(r, 600));

    // Verify an option was eliminated or hinted
    const hasEliminatedOrHinted = await page.evaluate(() => {
      const eliminated = document.querySelectorAll('.line-through, .opacity-25');
      const hinted = document.querySelectorAll('.ring-amber-400');
      return eliminated.length > 0 || hinted.length > 0;
    });
    assert(hasEliminatedOrHinted, 'Visual Recall eliminated an incorrect option or hinted correct target');

    // 5. Pattern Recall Help & Hint
    console.log('\n--- 5. PATTERN RECALL HINTS ---');
    await page.goto(`${BASE_URL}/activity/pattern`, { waitUntil: 'networkidle0' });

    // Click Ready to Recall
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const readyBtn = btns.find(b => b.textContent.includes('Ready to Recall'));
      if (readyBtn) readyBtn.click();
    });

    await new Promise(r => setTimeout(r, 500));

    // Click Replay Pattern button
    const patternReplayClicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('Replay') || b.textContent.includes('Hint'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    assert(patternReplayClicked, 'Pattern Recall Replay Pattern button clicked');

    await new Promise(r => setTimeout(r, 600));

    // Check if stage switched back to memorize/observe pattern
    const isReplaying = await page.evaluate(() => {
      return document.body.textContent.includes('Observe Pattern');
    });
    assert(isReplaying, 'Pattern successfully replaying observation sequence for 5 seconds');

    // 6. Telugu Language Hint Verification
    console.log('\n--- 6. TELUGU LANGUAGE HINT VERIFICATION ---');
    // Switch language to Telugu
    await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const teBtn = btns.find(b => b.textContent.includes('తెలుగు'));
      if (teBtn) teBtn.click();
    });

    await new Promise(r => setTimeout(r, 600));

    // Re-open Memory Match
    await page.goto(`${BASE_URL}/activity/memory`, { waitUntil: 'networkidle0' });
    await new Promise(r => setTimeout(r, 600));

    // Check that Help button in voice banner has Telugu title/text
    const teluguHelpPresent = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => b.textContent.includes('సహాయం') || b.textContent.includes('సూచన'));
    });
    assert(teluguHelpPresent, 'Telugu Help & Hint button displayed in Telugu: "సహాయం / సూచన"');

    // Click Help in Telugu
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find(b => b.textContent.includes('సహాయం') || b.textContent.includes('సూచన'));
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 600));

    const teluguHintBanner = await page.evaluate(() => {
      const banner = document.querySelector('.bg-amber-50');
      return banner ? banner.textContent : '';
    });
    assert(teluguHintBanner.includes('సూచన') || teluguHintBanner.includes('సహాయం'), `Telugu Hint banner rendered in Telugu: "${teluguHintBanner.substring(0, 50)}..."`);

  } catch (err) {
    console.error('Test script error:', err);
    testsFailed++;
  } finally {
    await browser.close();
  }

  console.log('\n===========================================================');
  console.log(`TOTAL PASSED: ${testsPassed}`);
  console.log(`TOTAL FAILED: ${testsFailed}`);
  console.log('===========================================================');

  if (testsFailed > 0) {
    process.exit(1);
  }
}

runGameHintsAndHelpQA();
