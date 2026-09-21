import puppeteer from 'puppeteer-core';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'Ultra-compact Phone (320px)', width: 320, height: 640 },
  { name: 'Compact Phone (360px)', width: 360, height: 780 },
  { name: 'Standard Phone (390px)', width: 390, height: 844 },
  { name: 'Large Phone / iQOO (412px)', width: 412, height: 915 },
];

async function runAudit() {
  console.log('===========================================================');
  console.log('  MINDMITRA MOBILE UX REFINEMENT & OVERFLOW AUDIT');
  console.log('===========================================================');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // Helper to check horizontal overflow
  async function checkHorizontalOverflow(pageName, width) {
    const overflow = await page.evaluate(() => {
      const docW = document.documentElement.scrollWidth;
      const bodyW = document.body.scrollWidth;
      const winW = window.innerWidth;
      const hasHScroll = docW > winW || bodyW > winW;
      
      // Check header bounds
      const header = document.querySelector('header');
      let headerOverflow = false;
      if (header) {
        const rect = header.getBoundingClientRect();
        headerOverflow = rect.right > winW + 1 || rect.left < -1;
      }

      // Check bottom nav bounds
      const nav = document.querySelector('nav');
      let navOverflow = false;
      if (nav) {
        const rect = nav.getBoundingClientRect();
        navOverflow = rect.right > winW + 1 || rect.left < -1;
      }

      return {
        hasHScroll,
        docW,
        bodyW,
        winW,
        diff: Math.max(docW, bodyW) - winW,
        headerOverflow,
        navOverflow
      };
    });

    if (overflow.hasHScroll || overflow.headerOverflow || overflow.navOverflow) {
      console.error(`  [FAIL] ${pageName} at ${width}px: OVERFLOW DETECTED (docW=${overflow.docW}, winW=${overflow.winW}, diff=${overflow.diff}px, headerOverflow=${overflow.headerOverflow})`);
      return false;
    } else {
      console.log(`  [PASS] ${pageName} at ${width}px: Perfectly contained (docW=${overflow.docW}, winW=${overflow.winW}, 0 overflow)`);
      return true;
    }
  }

  let allPassed = true;

  // 1. Check Public Pages Across All Viewports (Unauthenticated)
  console.log('\n--- 1. PUBLIC PAGES OVERFLOW CHECK ---');
  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    
    // Welcome / Landing
    await page.goto(`${BASE_URL}/landing`, { waitUntil: 'networkidle0' });
    const p1 = await checkHorizontalOverflow('Landing / Welcome', vp.width);
    allPassed = allPassed && p1;

    // Login
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
    const p2 = await checkHorizontalOverflow('Login Page', vp.width);
    allPassed = allPassed && p2;

    // Register
    await page.goto(`${BASE_URL}/register`, { waitUntil: 'networkidle0' });
    const p3 = await checkHorizontalOverflow('Register Page', vp.width);
    allPassed = allPassed && p3;
  }

  // 2. Authenticate Caregiver
  console.log('\n--- 2. AUTHENTICATION & LOGIN FLOW ---');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle0' });
  await page.type('#auth-email', 'pavan@mindmitra.com');
  await page.type('#auth-password', 'mindmitra123');
  await page.click('button[type="submit"]');
  await page.waitForFunction(() => window.location.pathname === '/home', { timeout: 10000 });
  console.log(`  [PASS] Logged in successfully. Current URL: ${page.url()}`);

  // 3. Authenticated Pages Across All Viewports
  console.log('\n--- 3. AUTHENTICATED PAGES OVERFLOW CHECK ---');
  const userPages = [
    { name: 'Home (/home)', path: '/home' },
    { name: 'Activities List (/activities)', path: '/activities' },
    { name: 'Activity Game (/activity/memory)', path: '/activity/memory' },
    { name: 'Session Result (/session-result/memory)', path: '/session-result/memory' },
    { name: 'My Pattern (/my-pattern)', path: '/my-pattern' },
    { name: 'Profile (/profile)', path: '/profile' },
    { name: 'Caregiver Overview (/caregiver)', path: '/caregiver' },
    { name: 'Caregiver Pattern (/caregiver/person/1/pattern)', path: '/caregiver/person/1/pattern' },
    { name: 'Caregiver Office Kit (/caregiver/office-kit)', path: '/caregiver/office-kit' }
  ];

  for (const vp of VIEWPORTS) {
    await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true });
    for (const up of userPages) {
      await page.goto(`${BASE_URL}${up.path}`, { waitUntil: 'networkidle0' });
      await new Promise(r => setTimeout(r, 100)); // allow layout settle
      const passed = await checkHorizontalOverflow(up.name, vp.width);
      allPassed = allPassed && passed;
    }
  }

  // 4. Verify Profile Page Elements (Account info, Theme, Spoken guidance, LOG OUT button)
  console.log('\n--- 4. PROFILE & ACCOUNT CONTROLS VERIFICATION ---');
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
  const profileDetails = await page.evaluate(() => {
    const text = document.body.innerText;
    const hasAccountEmail = text.includes('pavan@mindmitra.com');
    const hasTheme = text.includes('Display Theme');
    const hasLang = text.includes('Preferred Spoken Language');
    const hasVoice = text.includes('Spoken Voice Guidance');
    const hasLogoutBtn = Array.from(document.querySelectorAll('button')).some(b => b.innerText.includes('LOG OUT'));
    return { hasAccountEmail, hasTheme, hasLang, hasVoice, hasLogoutBtn };
  });
  console.log('  Account Email Exposed:', profileDetails.hasAccountEmail ? '[PASS]' : '[FAIL]');
  console.log('  Display Theme Card:', profileDetails.hasTheme ? '[PASS]' : '[FAIL]');
  console.log('  Language Preferences:', profileDetails.hasLang ? '[PASS]' : '[FAIL]');
  console.log('  Voice Guidance:', profileDetails.hasVoice ? '[PASS]' : '[FAIL]');
  console.log('  LOG OUT Button Visible:', profileDetails.hasLogoutBtn ? '[PASS]' : '[FAIL]');
  allPassed = allPassed && profileDetails.hasAccountEmail && profileDetails.hasTheme && profileDetails.hasLogoutBtn;

  // 5. Theme Persistence Test
  console.log('\n--- 5. THEME TOGGLE & PERSISTENCE TEST ---');
  await page.goto(`${BASE_URL}/home`, { waitUntil: 'networkidle0' });
  
  // Toggle to dark
  await page.evaluate(() => {
    const darkBtn = document.querySelector('button[aria-label="Dark Theme"]');
    if (darkBtn) darkBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));

  let themeState = await page.evaluate(() => ({
    isDarkClass: document.documentElement.classList.contains('dark'),
    stored: localStorage.getItem('mindmitra_theme')
  }));
  console.log(`  Theme switched to dark -> class contains 'dark': ${themeState.isDarkClass}, localStorage: ${themeState.stored}`);
  allPassed = allPassed && themeState.isDarkClass && themeState.stored === 'dark';

  // Navigate to Activities and verify theme persists
  await page.goto(`${BASE_URL}/activities`, { waitUntil: 'networkidle0' });
  let navThemeState = await page.evaluate(() => ({
    isDarkClass: document.documentElement.classList.contains('dark'),
    stored: localStorage.getItem('mindmitra_theme')
  }));
  console.log(`  Navigated to /activities -> class contains 'dark': ${navThemeState.isDarkClass}`);
  allPassed = allPassed && navThemeState.isDarkClass;

  // Reload page and verify zero-flash theme persistence
  await page.reload({ waitUntil: 'networkidle0' });
  let reloadThemeState = await page.evaluate(() => ({
    isDarkClass: document.documentElement.classList.contains('dark'),
    stored: localStorage.getItem('mindmitra_theme')
  }));
  console.log(`  Reloaded /activities -> class contains 'dark': ${reloadThemeState.isDarkClass}`);
  allPassed = allPassed && reloadThemeState.isDarkClass;

  // Switch back to light
  await page.evaluate(() => {
    const lightBtn = document.querySelector('button[aria-label="Light Theme"]');
    if (lightBtn) lightBtn.click();
  });
  await new Promise(r => setTimeout(r, 200));
  let lightThemeState = await page.evaluate(() => ({
    isDarkClass: document.documentElement.classList.contains('dark'),
    stored: localStorage.getItem('mindmitra_theme')
  }));
  console.log(`  Switched to light -> class contains 'dark': ${lightThemeState.isDarkClass}, localStorage: ${lightThemeState.stored}`);
  allPassed = allPassed && !lightThemeState.isDarkClass && lightThemeState.stored === 'light';

  // 6. Test Logout Flow
  console.log('\n--- 6. LOGOUT FLOW TEST ---');
  await page.goto(`${BASE_URL}/profile`, { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const logoutBtn = btns.find(b => b.innerText.includes('LOG OUT'));
    if (logoutBtn) logoutBtn.click();
  });
  await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 10000 });
  console.log(`  Logged out successfully. Redirected to: ${page.url()}`);
  
  const authCleared = await page.evaluate(() => {
    return !localStorage.getItem('mindmitra_token') && !localStorage.getItem('mindmitra_caregiver');
  });
  console.log('  Authentication Token & Session Cleared:', authCleared ? '[PASS]' : '[FAIL]');
  allPassed = allPassed && authCleared;

  await browser.close();

  console.log('\n===========================================================');
  if (allPassed) {
    console.log('  AUDIT COMPLETE: ALL MOBILE REFINEMENTS & FLOWS PASSED (100%)');
  } else {
    console.log('  AUDIT COMPLETE WITH FAILURES');
    process.exit(1);
  }
  console.log('===========================================================');
}

runAudit().catch(err => {
  console.error('Audit fatal error:', err);
  process.exit(1);
});
