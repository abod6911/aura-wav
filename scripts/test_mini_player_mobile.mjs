import { chromium, devices } from 'playwright';

async function testMobileMiniPlayer() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);

  // Dismiss splash if present
  const splashBtn = page.locator('button:has-text("ابدأ الاستماع الآن")').first();
  if (await splashBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await splashBtn.click({ force: true });
    await page.waitForTimeout(600);
  }

  // Force play first track via store to test MiniPlayer rendering
  await page.evaluate(() => {
    const store = window.usePlayerStore.getState();
    if (store.tracks && store.tracks.length > 0) {
      store.playTrack(store.tracks[0]);
    }
  });
  await page.waitForTimeout(800);

  // Take screenshot with MiniPlayer visible
  await page.screenshot({ path: 'mobile_diag_miniplayer_active.png' });
  console.log('Captured mobile_diag_miniplayer_active.png');

  // Check MiniPlayer geometry
  const miniInfo = await page.evaluate(() => {
    const mini = document.querySelector('[data-testid="mini-player"]');
    const dock = document.querySelector('nav[aria-label="Mobile Navigation"]');
    if (!mini) return { miniFound: false };
    const mRect = mini.getBoundingClientRect();
    const dRect = dock ? dock.getBoundingClientRect() : null;
    return {
      miniFound: true,
      miniRect: { top: mRect.top, bottom: mRect.bottom, height: mRect.height },
      dockRect: dRect ? { top: dRect.top, bottom: dRect.bottom, height: dRect.height } : null,
      gap: dRect ? dRect.top - mRect.bottom : null,
    };
  });
  console.log('MiniPlayer geometry:', miniInfo);

  // Open expanded player
  const mini = page.locator('[data-testid="mini-player"]').first();
  if (await mini.isVisible()) {
    await mini.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: 'mobile_diag_expanded_active.png' });
    console.log('Captured mobile_diag_expanded_active.png');
  }

  await browser.close();
}

testMobileMiniPlayer().catch(console.error);
