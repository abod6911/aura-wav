import { chromium, devices } from 'playwright';
import path from 'path';

async function testMobileRedesign() {
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
  page.on('console', (msg) => console.log('[Console]', msg.type(), msg.text()));

  console.log('Navigating to https://localhost:5173/ ...');
  await page.goto('https://localhost:5173/', { waitUntil: 'networkidle', timeout: 30000 });

  // Dismiss welcome splash if present
  try {
    const startBtn = page.locator('button:has-text("ابدأ الاستماع الآن")');
    if (await startBtn.isVisible({ timeout: 2500 })) {
      await startBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch {}

  await page.waitForTimeout(1500);

  const artifactDir = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\52bb4109-b23d-488f-8574-6c7d7afbf138';
  
  // Screenshot 1: Mobile Home View with Apple Music Liquid Glass and bottom dock
  await page.screenshot({ path: path.join(artifactDir, 'mobile_home_apple_music.png') });
  console.log('Captured mobile_home_apple_music.png');

  // Open Settings modal to verify bilingual switcher
  const settingsBtn = page.locator('[aria-label="الإعدادات"], [aria-label="Settings"]').first();
  if (await settingsBtn.isVisible()) {
    await settingsBtn.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(artifactDir, 'mobile_settings_modal.png') });
    console.log('Captured mobile_settings_modal.png');
  }

  await browser.close();
  console.log('Verification completed successfully.');
}

testMobileRedesign().catch(err => {
  console.error('Error during verification:', err);
  process.exit(1);
});
