import { chromium, devices } from 'playwright';

async function captureAllMobileViews() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors', '--no-sandbox'],
  });

  const page = await browser.newPage({
    ...devices['iPhone 14 Pro'],
    ignoreHTTPSErrors: true,
  });

  await page.goto('https://localhost:5173/', { waitUntil: 'networkidle' });

  // Dismiss splash
  const splashBtn = page.locator('button:has-text("ابدأ الاستماع الآن")').first();
  if (await splashBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
    await splashBtn.click({ force: true });
    await page.waitForTimeout(600);
  }

  // 1. Home View with Track Playing (shows MiniPlayer + NavDock)
  const firstTrack = page.locator('.apple-glass-card').first();
  if (await firstTrack.isVisible()) {
    await firstTrack.click();
    await page.waitForTimeout(600);
  }
  await page.screenshot({ path: 'mobile_1_home_playing.png' });
  console.log('1. mobile_1_home_playing.png');

  // 2. Open Expanded Player Sheet
  const miniPlayer = page.locator('[data-testid="mini-player"]').or(page.locator('.apple-glass-dock')).first();
  if (await miniPlayer.isVisible()) {
    await miniPlayer.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'mobile_2_expanded_player.png' });
    console.log('2. mobile_2_expanded_player.png');
    // Close expanded player (swipe down or click close button)
    const closeBtn = page.locator('button[aria-label="Close"], button:has-text("إغلاق"), .rotate-180, [data-testid="collapse-player-btn"]').first();
    if (await closeBtn.isVisible()) {
      await closeBtn.click();
      await page.waitForTimeout(500);
    }
  }

  // 3. Search View
  const searchTab = page.locator('nav button:has-text("بحث")').first();
  if (await searchTab.isVisible()) {
    await searchTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'mobile_3_search.png' });
    console.log('3. mobile_3_search.png');
  }

  // 4. Library View
  const libTab = page.locator('nav button:has-text("مكتبتك"), nav button:has-text("المكتبة")').first();
  if (await libTab.isVisible()) {
    await libTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'mobile_4_library.png' });
    console.log('4. mobile_4_library.png');
  }

  // 5. Favorites View
  const favTab = page.locator('nav button:has-text("المفضلة")').first();
  if (await favTab.isVisible()) {
    await favTab.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'mobile_5_favorites.png' });
    console.log('5. mobile_5_favorites.png');
  }

  // 6. Settings Modal
  const settingsBtn = page.locator('header button[title*="الإعدادات"], header button:has-text("الإعدادات"), button:has(.lucide-settings)').first();
  if (await settingsBtn.isVisible().catch(() => false)) {
    await settingsBtn.click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: 'mobile_6_settings.png' });
    console.log('6. mobile_6_settings.png');
    const closeSettings = page.locator('button[aria-label="Close"], button:has-text("إغلاق")').first();
    if (await closeSettings.isVisible().catch(() => false)) await closeSettings.click();
    await page.waitForTimeout(400);
  }

  await browser.close();
}

captureAllMobileViews().catch(console.error);
