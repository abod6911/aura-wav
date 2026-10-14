import { chromium } from 'playwright';

async function checkVercelLive() {
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

  await page.screenshot({ path: 'vercel_main_screen.png' });

  const footer = page.locator('footer[data-testid="player-bar"]');
  const footerBox = await footer.boundingBox();
  console.log('Footer bounding box:', footerBox);

  // Check the sidebar brand text
  const sidebarBrand = await page.locator('span:has-text("AURA")').first().innerText();
  console.log('Sidebar brand text:', sidebarBrand);

  await browser.close();
}

checkVercelLive().catch(console.error);
