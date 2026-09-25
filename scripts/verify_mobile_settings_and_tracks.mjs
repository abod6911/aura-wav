import { chromium, devices } from 'playwright';
import { preview } from 'vite';
import path from 'path';

const currentArtifactDir = 'C:\\Users\\abodv\\.gemini\\antigravity\\brain\\16609e2d-bb20-4c07-8185-34a6f0efc5cf';

async function runVerification() {
  console.log('Starting Vite preview server on port 5179...');
  const server = await preview({
    configFile: './vite.config.ts',
    preview: {
      port: 5179,
      host: '127.0.0.1',
      strictPort: true,
    }
  });

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
  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  console.log('Navigating to https://127.0.0.1:5179/ ...');
  await page.goto('https://127.0.0.1:5179/', { waitUntil: 'networkidle', timeout: 30000 });

  // Dismiss welcome modal if open
  try {
    const startBtn = page.locator('button:has-text("ابدأ الاستماع الآن")');
    if (await startBtn.isVisible({ timeout: 2000 })) {
      await startBtn.click();
      await page.waitForTimeout(600);
    }
  } catch {}

  // 1. Navigate to Library Tab
  console.log('Switching to Library tab on mobile...');
  const libraryTabBtn = page.locator('nav[aria-label="Mobile Navigation"] button').nth(2);
  if (await libraryTabBtn.isVisible()) {
    await libraryTabBtn.click();
    await page.waitForTimeout(1000);
  }

  // Scroll down to the track list table
  console.log('Scrolling down to tracks table...');
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 1400;
  });
  await page.waitForTimeout(1000);

  // Capture Mobile Track Rows
  const trackRowsPath = path.join(currentArtifactDir, 'mobile_track_rows.png');
  await page.screenshot({ path: trackRowsPath });
  console.log(`Saved screenshot: ${trackRowsPath}`);

  // 2. Open Settings Modal from Mobile Header Avatar
  console.log('Opening Settings modal on mobile...');
  const avatarSettingsBtn = page.locator('header button[title="الإعدادات"], header button[aria-label="الإعدادات"]').first();
  if (await avatarSettingsBtn.isVisible()) {
    await avatarSettingsBtn.click();
    await page.waitForTimeout(1000);
  } else {
    // Fallback: evaluate store
    await page.evaluate(() => {
      window.usePlayerStore.getState().setSettingsOpen(true);
    });
    await page.waitForTimeout(1000);
  }

  // Capture Mobile Settings Modal
  const settingsScreenshotPath = path.join(currentArtifactDir, 'mobile_settings_fixed.png');
  await page.screenshot({ path: settingsScreenshotPath });
  console.log(`Saved screenshot: ${settingsScreenshotPath}`);

  console.log('Console Errors found:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Errors:', consoleErrors);
  }

  await browser.close();
  await server.close();
  console.log('Mobile verification completed successfully!');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
