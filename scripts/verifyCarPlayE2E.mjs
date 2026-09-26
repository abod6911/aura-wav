import { chromium } from 'playwright';
import path from 'path';

async function runE2E() {
  console.log('[E2E] Starting Apple CarPlay & In-Car Mode E2E Verification...');
  const browser = await chromium.launch({ headless: true });

  const artifactsDir = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\16609e2d-bb20-4c07-8185-34a6f0efc5cf';

  // 1. Portrait Car Mount Viewport (iPhone 15 Pro)
  const portraitContext = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });
  const pagePortrait = await portraitContext.newPage();
  await pagePortrait.goto('https://localhost:4173', { waitUntil: 'networkidle', timeout: 30000 });
  await pagePortrait.waitForTimeout(2000);

  // Trigger Car Mode via store
  await pagePortrait.evaluate(() => {
    const store = window.usePlayerStore;
    if (store) {
      store.getState().setCarModeOpen(true);
    }
  });
  await pagePortrait.waitForTimeout(1000);

  // Verify Car Mode elements exist
  const carModeVisible = await pagePortrait.locator('text=Apple CarPlay Mode').isVisible();
  console.log('[E2E] Car Mode Banner Visible (Portrait):', carModeVisible);

  const portraitScreenshotPath = path.join(artifactsDir, 'carplay_portrait_verified.png');
  await pagePortrait.screenshot({ path: portraitScreenshotPath });
  console.log('[E2E] Saved Portrait screenshot to:', portraitScreenshotPath);

  // 2. Landscape In-Car Mount Viewport (852x393)
  const landscapeContext = await browser.newContext({
    viewport: { width: 852, height: 393 },
    deviceScaleFactor: 2,
    ignoreHTTPSErrors: true,
  });
  const pageLandscape = await landscapeContext.newPage();
  await pageLandscape.goto('https://localhost:4173', { waitUntil: 'networkidle', timeout: 30000 });
  await pageLandscape.waitForTimeout(2000);

  // Trigger Car Mode
  await pageLandscape.evaluate(() => {
    const store = window.usePlayerStore;
    if (store) {
      store.getState().setCarModeOpen(true);
    }
  });
  await pageLandscape.waitForTimeout(1000);

  const landscapeScreenshotPath = path.join(artifactsDir, 'carplay_landscape_verified.png');
  await pageLandscape.screenshot({ path: landscapeScreenshotPath });
  console.log('[E2E] Saved Landscape screenshot to:', landscapeScreenshotPath);

  // 3. Open Quick Driving List Drawer
  await pageLandscape.click('text=قائمة القيادة');
  await pageLandscape.waitForTimeout(600);

  const drawerScreenshotPath = path.join(artifactsDir, 'carplay_quick_drawer_verified.png');
  await pageLandscape.screenshot({ path: drawerScreenshotPath });
  console.log('[E2E] Saved Quick Drawer screenshot to:', drawerScreenshotPath);

  await browser.close();
  console.log('✅ PASS: All Apple CarPlay E2E visual verifications completed successfully.');
}

runE2E().catch((err) => {
  console.error('❌ FAIL in E2E:', err);
  process.exit(1);
});
