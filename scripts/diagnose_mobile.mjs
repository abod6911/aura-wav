import { chromium, devices } from 'playwright';

async function diagnoseMobile() {
  const browser = await chromium.launch({
    headless: true,
  });

  const context = await browser.newContext({
    ...devices['iPhone 14 Pro'],
  });

  const page = await context.newPage();
  
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log('[Diagnose] Navigating to http://localhost:5173/ on iPhone 14 Pro...');
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Dismiss splash if present
  const splashBtn = page.locator('button:has-text("ابدأ الاستماع الآن")').first();
  if (await splashBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await splashBtn.click({ force: true });
    await page.waitForTimeout(600);
  }

  // Check horizontal overflow
  const overflow = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const winWidth = window.innerWidth;
    const bodyWidth = document.body.scrollWidth;
    return {
      docWidth,
      winWidth,
      bodyWidth,
      hasOverflow: docWidth > winWidth || bodyWidth > winWidth,
    };
  });
  console.log('[Diagnose] Viewport width check:', overflow);

  // Screenshot 1: Mobile Home
  await page.screenshot({ path: 'mobile_diag_1_home.png' });
  console.log('[Diagnose] Captured mobile_diag_1_home.png');

  // Check Track clicking and MiniPlayer
  const quickCard = page.locator('.group\\/quick, .spotify-card, .apple-glass-card').first();
  if (await quickCard.isVisible()) {
    await quickCard.click();
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: 'mobile_diag_2_home_playing.png' });
  console.log('[Diagnose] Captured mobile_diag_2_home_playing.png');

  // Check MiniPlayer visibility and position
  const miniPlayerInfo = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="mini-player"]');
    const dock = document.querySelector('nav[aria-label="Mobile Navigation"]');
    if (!el) return { found: false };
    const rect = el.getBoundingClientRect();
    const dockRect = dock ? dock.getBoundingClientRect() : null;
    return {
      found: true,
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
      dockRect: dockRect ? { top: dockRect.top, bottom: dockRect.bottom, height: dockRect.height } : null,
      dockCollision: dockRect ? rect.bottom > dockRect.top : false,
    };
  });
  console.log('[Diagnose] MiniPlayer geometry:', miniPlayerInfo);

  // Click mini player to expand
  const miniPlayer = page.locator('[data-testid="mini-player"]').first();
  if (await miniPlayer.isVisible()) {
    await miniPlayer.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'mobile_diag_3_expanded_player.png' });
    console.log('[Diagnose] Captured mobile_diag_3_expanded_player.png');

    // Test tabs in expanded player: Lyrics, 3D Studio, Queue
    const lyricsTab = page.locator('button:has-text("الكلمات")').first();
    if (await lyricsTab.isVisible()) {
      await lyricsTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'mobile_diag_4_expanded_lyrics.png' });
      console.log('[Diagnose] Captured mobile_diag_4_expanded_lyrics.png');
    }

    const studioTab = page.locator('button:has-text("3D Studio")').first();
    if (await studioTab.isVisible()) {
      await studioTab.click();
      await page.waitForTimeout(500);
      await page.screenshot({ path: 'mobile_diag_5_expanded_studio.png' });
      console.log('[Diagnose] Captured mobile_diag_5_expanded_studio.png');
    }

    // Close expanded player
    const closeBtn = page.locator('[data-testid="minimize-player-btn"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(600);
    }
  }

  // Switch to Library tab
  const libTab = page.locator('nav button:has-text("مكتبتك"), nav button:has-text("المكتبة")').first();
  if (await libTab.isVisible()) {
    await libTab.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'mobile_diag_6_library.png' });
    console.log('[Diagnose] Captured mobile_diag_6_library.png');
  }

  // Switch to Search tab
  const searchTab = page.locator('nav button:has-text("بحث")').first();
  if (await searchTab.isVisible()) {
    await searchTab.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'mobile_diag_7_search.png' });
    console.log('[Diagnose] Captured mobile_diag_7_search.png');
  }

  // Switch to Favorites tab
  const favTab = page.locator('nav button:has-text("المفضلة")').first();
  if (await favTab.isVisible()) {
    await favTab.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'mobile_diag_8_favorites.png' });
    console.log('[Diagnose] Captured mobile_diag_8_favorites.png');
  }

  console.log('[Diagnose] Console errors caught:', consoleErrors);
  await browser.close();
}

diagnoseMobile().catch(console.error);
