import { chromium } from 'playwright';

async function testMobile() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
  });

  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const splash = page.locator('button:has-text("ابدأ الاستماع الآن")');
  if (await splash.isVisible()) {
    await splash.click();
    await page.waitForTimeout(500);
  }

  // Click Search tab in MobileNavDock
  const navButtons = page.locator('nav[aria-label="Mobile Navigation"] button');
  await navButtons.nth(1).click();
  await page.waitForTimeout(600);

  // Focus and type in search input
  const input = page.locator('input[type="search"]');
  await input.focus();
  await input.fill('Star');
  
  // Wait up to 3 seconds for results
  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'real_mobile_search_results.png' });

  await browser.close();
}

testMobile().catch(console.error);
