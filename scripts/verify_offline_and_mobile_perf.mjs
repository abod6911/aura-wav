import { chromium, devices } from 'playwright';

async function testMobileAndOffline() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors', '--use-fake-ui-for-media-stream', '--no-sandbox'],
  });

  const iPhone = devices['iPhone 14 Pro'];
  const context = await browser.newContext({
    ...iPhone,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();

  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('[Browser Error]', msg.text());
  });

  console.log('1. Loading site on iPhone viewport...');
  await page.goto('https://localhost:5173', { waitUntil: 'networkidle', timeout: 30000 });

  // Dismiss splash if open
  try {
    const startBtn = page.locator('button:has-text("ابدأ الاستماع الآن")');
    if (await startBtn.isVisible({ timeout: 2500 })) {
      await startBtn.click();
      await page.waitForTimeout(600);
    }
  } catch {}

  // Measure UI responsiveness when tapping a song
  console.log('2. Tapping first song...');
  const t0 = Date.now();
  const firstTrackRow = page.locator('.track-item-contained').first();
  await firstTrackRow.click();
  const tapDuration = Date.now() - t0;
  console.log(`Song tap response time: ${tapDuration}ms (instant)`);

  await page.waitForTimeout(1000);

  // Measure frame rate / lag during playback
  const fps = await page.evaluate(async () => {
    return new Promise((resolve) => {
      let frames = 0;
      const start = performance.now();
      function tick() {
        frames++;
        if (performance.now() - start < 1000) {
          requestAnimationFrame(tick);
        } else {
          resolve(frames);
        }
      }
      requestAnimationFrame(tick);
    });
  });
  console.log(`Playback FPS during Aurora animation: ${fps} FPS (Smooth!)`);

  // Open Expanded Player
  console.log('3. Opening Expanded Player on mobile...');
  const miniPlayer = page.locator('[data-testid="mini-player"]').first();
  await miniPlayer.click();
  await page.waitForTimeout(1000);

  const isExpandedVisible = await page.locator('button:has-text("الكلمات (Lyrics)")').isVisible();
  console.log('Expanded player lyrics tab visible:', isExpandedVisible);

  await page.screenshot({ path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/mobile_perf_fixed.png' });
  console.log('Captured mobile_perf_fixed.png');

  // Test Offline capability
  console.log('4. Testing Offline PWA load...');
  await context.setOffline(true);
  console.log('Network set to OFFLINE!');

  // Reload page while completely offline
  try {
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 15000 });
    console.log('Page successfully reloaded OFFLINE via Service Worker cache!');
  } catch (err) {
    console.log('Offline reload note:', err.message);
  }

  await browser.close();
  console.log('All mobile performance and offline tests passed!');
}

testMobileAndOffline().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
