import { chromium } from 'playwright';

async function checkVercel() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  // Bypass cache
  await page.goto('https://aura-wav.vercel.app/?t=' + Date.now(), { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'vercel_live.png' });

  const footer = page.locator('footer[data-testid="player-bar"]');
  if (await footer.isVisible()) {
    console.log('Footer visible on Vercel');
    const box = await footer.boundingBox();
    console.log('Footer box on Vercel:', box);
  } else {
    console.log('Footer not visible on landing');
  }

  // Check HTML title or git commit if exposed
  console.log('Page title:', await page.title());
  await browser.close();
}

checkVercel().catch(console.error);
