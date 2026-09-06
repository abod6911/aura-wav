import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ar-SA'
  });
  const page = await context.newPage();

  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // Dismiss splash
  const startBtn = page.getByRole('button', { name: 'ابدأ الاستماع الآن' });
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(1200);
  }

  // Capture new mobile header and top
  await page.screenshot({ path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/mobile_top_fixed.png' });
  console.log('Mobile top captured');

  // Scroll down to track 10
  await page.evaluate(() => {
    const main = document.querySelector('main');
    if (main) main.scrollTop = 450;
  });
  await page.waitForTimeout(1000);

  // Click on a track row
  const trackRows = page.locator('.group');
  const count = await trackRows.count();
  console.log('Total track rows visible:', count);
  if (count > 0) {
    await trackRows.nth(2).click(); // Click 3rd song
    await page.waitForTimeout(1200);
  }

  await page.screenshot({ path: 'C:/Users/abodv/.gemini/antigravity/brain/a3d86b8a-de3d-4ff6-b25e-03cfc989d21c/mobile_list_fixed.png' });
  console.log('Mobile list captured');

  await browser.close();
}

run().catch(console.error);
