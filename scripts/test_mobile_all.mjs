import { chromium } from 'playwright';

async function testAllMobileViews() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const splash = page.locator('button:has-text("ابدأ الاستماع الآن")');
  if (await splash.isVisible()) {
    await splash.click();
    await page.waitForTimeout(500);
  }

  // 1. Library tab (index 2)
  const navButtons = page.locator('nav[aria-label="Mobile Navigation"] button');
  await navButtons.nth(2).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'mobile_tab_library.png' });

  // 2. Favorites tab (index 3)
  await navButtons.nth(3).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'mobile_tab_favorites.png' });

  // 3. Play a track and inspect MiniPlayer + Full Expanded Player
  await navButtons.nth(0).click(); // Back to Home
  await page.waitForTimeout(600);
  const heroPlay = page.locator('button:has-text("تشغيل الآن")').first();
  await heroPlay.click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'mobile_with_miniplayer.png' });

  // Open Full Screen Player
  const miniPlayer = page.locator('[data-testid="mini-player"]');
  if (await miniPlayer.isVisible()) {
    await miniPlayer.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'mobile_expanded_player.png' });
  }

  await browser.close();
}

testAllMobileViews().catch(console.error);
