import { chromium } from 'playwright';

async function checkVercelPlaying() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage({ viewport: { width: 1440, height: 900 } });
  
  await page.goto('https://aura-wav.vercel.app/?t=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  const startBtn = page.locator('button:has-text("ابدأ الاستماع الآن")');
  if (await startBtn.isVisible()) {
    await startBtn.click();
    await page.waitForTimeout(1000);
  }

  // Click on "تشغيل الآن"
  const playBtn = page.locator('button:has-text("تشغيل الآن")').first();
  await playBtn.click();
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'vercel_playing_screen.png' });

  const footer = page.locator('footer[data-testid="player-bar"]');
  const footerBox = await footer.boundingBox();
  console.log('Footer bounding box:', footerBox);

  const img = footer.locator('img').first();
  console.log('Footer image box:', await img.boundingBox());

  await browser.close();
}

checkVercelPlaying().catch(console.error);
