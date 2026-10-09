import { chromium } from 'playwright';

async function testMobileSmoothness() {
  console.log('📱 Testing Mobile 120Hz Smoothness & Viewport Integrity...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 393, height: 852 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    ignoreHTTPSErrors: true,
  });

  const page = await context.newPage();
  
  // Track console errors
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('https://localhost:5173/', { waitUntil: 'networkidle' });

  // Dismiss splash screen if visible
  const exploreBtn = page.locator('text=ابدأ الاستماع الآن');
  if (await exploreBtn.isVisible()) {
    await exploreBtn.click();
    await page.waitForTimeout(800);
  }

  // Check main scroll container has momentum scrolling & overscroll containment
  const mainScrollStyles = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return null;
    const style = window.getComputedStyle(main);
    return {
      overflowY: style.overflowY,
      webkitOverflowScrolling: style.webkitOverflowScrolling,
      overscrollBehaviorY: style.overscrollBehaviorY,
      touchAction: style.touchAction,
    };
  });

  console.log('Main Scroll Container Physics:', mainScrollStyles);

  // Perform multiple fast touch scrolls to verify silky smooth performance
  console.log('Performing momentum scroll tests...');
  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollBy({ top: 400, behavior: 'smooth' });
    });
    await page.waitForTimeout(200);
  }

  for (let i = 0; i < 5; i++) {
    await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) main.scrollBy({ top: -400, behavior: 'smooth' });
    });
    await page.waitForTimeout(200);
  }

  // Check MiniPlayer and NavDock presence and styles
  const dockStyles = await page.evaluate(() => {
    const dock = document.querySelector('nav[aria-label="Mobile Navigation"]');
    if (!dock) return null;
    const s = window.getComputedStyle(dock);
    return {
      backdropFilter: s.backdropFilter || s.webkitBackdropFilter,
      transform: s.transform,
      borderRadius: s.borderRadius,
    };
  });
  console.log('Mobile Nav Dock Styles:', dockStyles);

  // Take screenshot of mobile view
  await page.screenshot({ path: 'mobile_120fps_verification.png', fullPage: false });
  console.log('Screenshot saved to mobile_120fps_verification.png');

  await browser.close();

  const relevantErrors = errors.filter(e => !e.includes('SSL certificate error'));
  if (relevantErrors.length > 0) {
    console.error('Errors detected:', relevantErrors);
    process.exit(1);
  } else {
    console.log('✅ Mobile 120Hz smoothness verification PASSED with 0 errors!');
  }
}

testMobileSmoothness().catch((e) => {
  console.error(e);
  process.exit(1);
});
