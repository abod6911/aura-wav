import { chromium, devices } from 'playwright';
import path from 'path';

async function testFullFlow() {
  const browser = await chromium.launch({
    headless: true,
    args: ['--ignore-certificate-errors', '--no-sandbox'],
  });

  const iPhone = devices['iPhone 14 Pro'];
  const context = await browser.newContext({
    ...iPhone,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  console.log('Navigating to https://localhost:5173/ ...');
  await page.goto('https://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });

  // Dismiss welcome modal if open
  try {
    const startBtn = page.locator('button:has-text("ابدأ الاستماع الآن")');
    if (await startBtn.isVisible({ timeout: 2500 })) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch {}

  await page.waitForTimeout(1000);

  const artifactDir = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\52bb4109-b23d-488f-8574-6c7d7afbf138';

  // 1. Click on the Hero Spotlight "تشغيل الآن" button
  console.log('Clicking Hero Play button...');
  const heroPlayBtn = page.locator('button:has-text("تشغيل الآن")').first();
  if (await heroPlayBtn.isVisible()) {
    await heroPlayBtn.click();
    await page.waitForTimeout(1500);
  }

  // 2. Capture Mobile Home View with Active MiniPlayer
  await page.screenshot({ path: path.join(artifactDir, 'mobile_active_miniplayer.png') });
  console.log('Captured mobile_active_miniplayer.png');

  // 3. Open Expanded Player sheet by clicking MiniPlayer
  console.log('Opening Expanded Player...');
  const miniPlayer = page.locator('[data-testid="mini-player"]').first();
  if (await miniPlayer.isVisible()) {
    await miniPlayer.click();
    await page.waitForTimeout(1200);
    // 4. Capture Expanded Player Sheet
    await page.screenshot({ path: path.join(artifactDir, 'mobile_expanded_player.png') });
    console.log('Captured mobile_expanded_player.png');
  }

  await browser.close();
  console.log('Test completed successfully.');
}

testFullFlow().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
