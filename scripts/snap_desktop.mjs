import { chromium } from 'playwright';

async function snap() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const splashBtn = page.locator('button:has-text("ابدأ الاستماع الآن")').first();
  if (await splashBtn.isVisible().catch(() => false)) await splashBtn.click({ force: true });
  await page.waitForTimeout(1000);

  const allChildren = await page.evaluate(() => {
    const f = document.querySelector('footer[data-testid="player-bar"]');
    return {
      footerRect: f.getBoundingClientRect(),
      footerComputedStyle: {
        display: window.getComputedStyle(f).display,
        gridTemplateColumns: window.getComputedStyle(f).gridTemplateColumns,
        height: window.getComputedStyle(f).height,
      },
      children: Array.from(f.children).map((c, idx) => ({
        idx,
        tag: c.tagName,
        rect: c.getBoundingClientRect(),
        text: c.innerText.slice(0, 30)
      }))
    };
  });
  console.log('All footer children:', JSON.stringify(allChildren, null, 2));

  await page.screenshot({ path: 'desktop_diag_now.png' });
  await browser.close();
}

snap().catch(console.error);
