import { chromium, devices } from 'playwright';

async function snapMobileSearch() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices['iPhone 14 Pro'] });
  const page = await context.newPage();
  await page.goto('http://localhost:5173/', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const splashBtn = page.locator('button:has-text("ابدأ الاستماع الآن")').first();
  if (await splashBtn.isVisible().catch(() => false)) {
    await splashBtn.click({ force: true });
    await page.waitForTimeout(600);
  }

  // Switch to Search tab via MobileNavDock
  const searchTab = page.locator('button[role="tab"]:has-text("بحث")').first();
  if (await searchTab.isVisible()) {
    await searchTab.click();
    await page.waitForTimeout(800);
  }

  await page.screenshot({ path: 'mobile_search_view.png' });
  console.log('Saved mobile_search_view.png');

  // Check search input geometry
  const searchBoxInfo = await page.evaluate(() => {
    const input = document.querySelector('input[type="text"]');
    const container = input ? input.parentElement : null;
    return {
      inputFound: !!input,
      inputRect: input ? input.getBoundingClientRect() : null,
      containerRect: container ? container.getBoundingClientRect() : null,
      docWidth: document.documentElement.scrollWidth,
      winWidth: window.innerWidth,
    };
  });
  console.log('Search box info:', searchBoxInfo);

  // Type a search query to see the results on mobile
  const searchInput = page.locator('input[type="text"]').first();
  if (await searchInput.isVisible()) {
    await searchInput.fill('Star');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'mobile_search_with_query.png' });
    console.log('Saved mobile_search_with_query.png');
  }

  await browser.close();
}

snapMobileSearch().catch(console.error);
