import { chromium } from 'playwright';

async function run() {
  console.log('Launching Chrome browser...');
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  
  // 1. Desktop Test
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'ar-SA'
  });
  const page = await context.newPage();
  
  const consoleErrors = [];
  page.on('pageerror', (err) => consoleErrors.push(`Page error: ${err.message}`));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(`Console error: ${msg.text()}`);
    }
  });

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Capture Splash
  await page.screenshot({ path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/splash_screen.png' });
  console.log('Splash screen captured');

  // Dismiss Splash
  const startBtn = page.getByRole('button', { name: 'ابدأ الاستماع الآن' });
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(1500);
  }

  // Capture Desktop Library
  await page.screenshot({ path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/desktop_library.png' });
  console.log('Desktop library captured');

  // Click Play on first track to see playback bar
  const firstTrackRow = page.locator('.group').first();
  if (await firstTrackRow.isVisible()) {
    await firstTrackRow.click();
    await page.waitForTimeout(1500);
  }
  await page.screenshot({ path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/desktop_playing.png' });
  console.log('Desktop playing state captured');

  // 2. Mobile Test (iPhone 14)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ar-SA'
  });
  const mobilePage = await mobileContext.newPage();
  await mobilePage.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(2000);

  const mobileStartBtn = mobilePage.getByRole('button', { name: 'ابدأ الاستماع الآن' });
  if (await mobileStartBtn.isVisible()) {
    await mobileStartBtn.click();
    await mobilePage.waitForTimeout(1500);
  }

  await mobilePage.screenshot({ path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/mobile_library.png' });
  console.log('Mobile library captured');

  // Click first track on mobile
  const mobileFirstRow = mobilePage.locator('.group').first();
  if (await mobileFirstRow.isVisible()) {
    await mobileFirstRow.click();
    await mobilePage.waitForTimeout(1500);
  }
  await mobilePage.screenshot({ path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/mobile_playing.png' });
  console.log('Mobile playing state captured');

  // Tap mini player to open expanded sheet
  const miniPlayerCover = mobilePage.locator('img[alt]').last();
  if (await miniPlayerCover.isVisible()) {
    await miniPlayerCover.click();
  } else {
    await mobilePage.mouse.click(195, 730);
  }
  await mobilePage.waitForTimeout(1000);
  await mobilePage.screenshot({ path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/mobile_expanded.png' });
  console.log('Mobile expanded player captured');

  await browser.close();

  console.log('Console Errors count:', consoleErrors.length);
  if (consoleErrors.length > 0) {
    console.log('Console Errors:', consoleErrors);
  }
}

run().catch(console.error);
